#!/usr/bin/env bash
# ------------------------------------------------------------------------------
# Universal Web App Deploy Script for Nuclei Projects
# ------------------------------------------------------------------------------
set -euo pipefail

# 1. 自动定位与环境变量/配置文件加载
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# 自动加载用户全局 ~/.env (如果存在)
if [[ -f "${HOME}/.env" ]]; then
  set -o allexport
  # shellcheck source=/dev/null
  source "${HOME}/.env"
  set +o allexport
fi

# 自动加载项目本地 .env (如果存在)
if [[ -f "${REPO_ROOT}/.env" ]]; then
  set -o allexport
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/.env"
  set +o allexport
fi

# 自动加载项目本地 .deployrc (如果存在)
if [[ -f "${REPO_ROOT}/.deployrc" ]]; then
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/.deployrc"
fi

# 从 package.json 获取项目名或从项目环境变量中读取 APP_SLUG
DEFAULT_APP_NAME="$(node -p "require('${REPO_ROOT}/package.json').name" 2>/dev/null || true)"

if [[ -z "${APP_SLUG:-}" ]]; then
  if [[ -n "${DEFAULT_APP_NAME}" ]]; then
    APP_SLUG="${DEFAULT_APP_NAME}"
  else
    printf '[deploy-doc] 警告: 未在 package.json 中找到 name，且未在 .deployrc 中配置 APP_SLUG！\n' >&2
    printf '[deploy-doc] 建议在项目根目录下创建 .deployrc 文件并设置 APP_SLUG="your-app-slug"\n' >&2
    APP_SLUG="$(basename "${REPO_ROOT}")"
    printf '[deploy-doc] 将使用当前目录名 [%s] 作为默认 APP_SLUG\n' "${APP_SLUG}" >&2
  fi
fi

BUILD_CMD="${BUILD_CMD:-npm run build}"
DIST_DIR="${DIST_DIR:-dist}"

# 服务器与路径配置
WH_HOST="${WH_HOST:-hqfang@whss1.corp.nucleisys.com}"
WH_XL_USER="${WH_XL_USER:-xl_ci@whss1.corp.nucleisys.com}"
WH_TEMP_DIR="~/temp"

DOC_TARGET_DIR_BETA="~/doc_center/beta/${APP_SLUG}"
DOC_TARGET_DIR_PROD="~/doc_center/tools/${APP_SLUG}"

DOC_URL_BETA="https://doc.corp.nucleisys.com/beta/${APP_SLUG}"
DOC_URL_PROD="https://doc.corp.nucleisys.com/tools/${APP_SLUG}"

FTP_REMOTE_DIR="${FTP_DIR:-tools/${APP_SLUG}}"
WEB_URL="https://doc.nucleisys.com/${FTP_REMOTE_DIR}"

# 解析参数
DEPLOY_MODE="beta"
AUTO_CONFIRM=false
DRY_RUN=false

for arg in "$@"; do
  case "${arg}" in
    -y|--yes|--auto-confirm)
      AUTO_CONFIRM=true
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
    beta|prod|formal|web|website|official)
      DEPLOY_MODE="${arg}"
      ;;
    -h|--help)
      printf 'Usage: %s [beta|prod|web] [-y|--yes] [--dry-run]\n' "$(basename "$0")"
      printf 'Options:\n'
      printf '  beta                  部署到内网测试环境 (默认)\n'
      printf '  prod / formal         部署到内网正式环境\n'
      printf '  web / official        部署到外网官网 (通过 FTP)\n'
      printf '  -y, --yes             免确认直接部署 (适用于 CI/CD)\n'
      printf '  --dry-run             预演运行模式：仅打印执行计划与命令，不触发实际部署\n'
      exit 0
      ;;
    *)
      printf '错误: 未知的部署模式或选项 %s\n' "${arg}" >&2
      printf '运行 %s --help 查看帮助信息\n' "$(basename "$0")" >&2
      exit 1
      ;;
  esac
done

DOC_TARGET_DIR=""
DOC_URL=""
VITE_BASE_PATH=""

case "${DEPLOY_MODE}" in
  beta)
    DOC_TARGET_DIR="${DOC_TARGET_DIR_BETA}"
    DOC_URL="${DOC_URL_BETA}"
    VITE_BASE_PATH="/beta/${APP_SLUG}/"
    ;;
  prod|formal)
    DOC_TARGET_DIR="${DOC_TARGET_DIR_PROD}"
    DOC_URL="${DOC_URL_PROD}"
    VITE_BASE_PATH="/tools/${APP_SLUG}/"
    ;;
  web|website|official)
    DOC_URL="${WEB_URL}"
    VITE_BASE_PATH="/tools/${APP_SLUG}/"
    ;;
esac

HOST_SHORT="$(hostname -s 2>/dev/null || hostname)"
HOST_SHORT_LOWER="$(printf '%s' "${HOST_SHORT}" | tr '[:upper:]' '[:lower:]')"
TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
ARCHIVE_BASENAME="${APP_SLUG}_dist_${TIMESTAMP}.tar.gz"
LOCAL_ARCHIVE="${REPO_ROOT}/${ARCHIVE_BASENAME}"
REMOTE_ARCHIVE_PATH="${WH_TEMP_DIR}/${ARCHIVE_BASENAME}"
REMOTE_EXTRACT_DIR="${WH_TEMP_DIR}/${APP_SLUG}_dist_${TIMESTAMP}"

log() {
  printf '[deploy-doc] %s\n' "$1"
}

cleanup_local() {
  if [[ "${DRY_RUN}" == true ]]; then
    return
  fi
  if [[ -f "${LOCAL_ARCHIVE}" ]]; then
    rm -f "${LOCAL_ARCHIVE}"
  fi
}

cleanup_remote() {
  if [[ "${DRY_RUN}" == true ]] || [[ "${HOST_SHORT_LOWER}" == wh* ]] || [[ "${DEPLOY_MODE}" =~ ^(web|website|official)$ ]]; then
    return
  fi

  ssh "${WH_HOST}" "\
    rm -f ${REMOTE_ARCHIVE_PATH} >/dev/null 2>&1 || true; \
    rm -rf ${REMOTE_EXTRACT_DIR} >/dev/null 2>&1 || true; \
    ssh ${WH_XL_USER} 'rm -f ${REMOTE_ARCHIVE_PATH} >/dev/null 2>&1 || true; rm -rf ${REMOTE_EXTRACT_DIR} >/dev/null 2>&1 || true' >/dev/null 2>&1 || true" \
    >/dev/null 2>&1 || true
}

cleanup_all() {
  cleanup_local
  cleanup_remote
}

trap cleanup_all EXIT INT TERM

# 部署二次确认面板
confirm_deploy() {
  if [[ "${DRY_RUN}" == true ]]; then
    log "🔍 检测到 --dry-run 预演运行模式，跳过确认环节。"
    return 0
  fi

  if [[ "${AUTO_CONFIRM}" == true ]] || [[ ! -t 0 ]]; then
    log "检测到自动确认选项或非交互环境，跳过手动确认。"
    return 0
  fi

  printf '\n'
  printf '============================================================\n'
  printf '                   🚀 部署确认面板                          \n'
  printf '============================================================\n'
  printf ' 项目标识 (SLUG) : %s\n' "${APP_SLUG}"
  printf ' 部署模式 (MODE) : %s\n' "${DEPLOY_MODE}"
  printf ' 访问网址 (URL)  : %s\n' "${DOC_URL}"
  if [[ "${DEPLOY_MODE}" =~ ^(web|website|official)$ ]]; then
    printf ' 目标 FTP 服务器  : %s:%s\n' "${FTPSERVER:-[环境变量未配置]}" "${FTP_REMOTE_DIR}"
  else
    printf ' 目标部署目录    : %s\n' "${DOC_TARGET_DIR}"
  fi
  printf '%s\n' '------------------------------------------------------------'

  if [[ "${DEPLOY_MODE}" =~ ^(prod|formal)$ ]]; then
    printf '\033[1;31m[ ⚠️ 警告 ]: 您即将部署到【内网正式环境 (PROD)】！请确保已充分测试！\033[0m\n'
  elif [[ "${DEPLOY_MODE}" =~ ^(web|website|official)$ ]]; then
    printf '\033[1;31m[ 🚨 高危警告 ]: 您即将部署到【官网外网环境 (OFFICIAL WEB)】！公众将直接可见！\033[0m\n'
  else
    printf '\033[1;34m[ 💡 提示 ]: 您即将部署到【内网测试环境 (BETA)】。\033[0m\n'
  fi
  printf '============================================================\n\n'

  read -r -p "是否确认开始部署？输入 [Y/y] 继续，其他任何输入取消: " response
  case "${response}" in
    [yY][eE][sS]|[yY])
      printf '\n[deploy-doc] 已确认！准备开始部署，将在 3 秒后自动触发...\n'
      for i in 3 2 1; do
        printf '  [ 倒计时 %d 秒 ]...\n' "$i"
        sleep 1
      done
      printf '\n'
      ;;
    *)
      log "用户取消部署操作。"
      exit 0
      ;;
  esac
}

# 1. 触发提示确认
confirm_deploy

# DRY RUN 逻辑分支
if [[ "${DRY_RUN}" == true ]]; then
  printf '\n'
  printf '============================================================\n'
  printf '               🔍 DRY-RUN 预演运行计划                      \n'
  printf '============================================================\n'
  printf ' 项目标识 (SLUG) : %s\n' "${APP_SLUG}"
  printf ' 部署模式 (MODE) : %s\n' "${DEPLOY_MODE}"
  printf ' 构建命令        : VITE_BASE_URL="%s" %s\n' "${VITE_BASE_PATH}" "${BUILD_CMD}"
  printf ' 预定目标网址    : %s\n' "${DOC_URL}"
  printf '%s\n' '------------------------------------------------------------'

  if [[ "${DEPLOY_MODE}" =~ ^(web|website|official)$ ]]; then
    printf ' 拟执行 FTP 镜像命令:\n'
    printf '   lftp -u"%s","***" "%s" -e "mirror --parallel=2 -p -e -R %s %s; bye"\n' \
      "${FTPUSER:-[未设置]}" "${FTPSERVER:-[未设置]}" "${DIST_DIR}" "${FTP_REMOTE_DIR}"
  elif [[ "${HOST_SHORT_LOWER}" == wh* ]]; then
    printf ' 拟执行直连部署命令:\n'
    printf '   ssh xl_ci@doc "mkdir -p %s"\n' "${DOC_TARGET_DIR}"
    printf '   scp -r %s/. xl_ci@doc:%s/\n' "${REPO_ROOT}/${DIST_DIR}" "${DOC_TARGET_DIR}"
  else
    printf ' 拟执行中转部署命令:\n'
    printf '   scp %s %s:%s/\n' "${LOCAL_ARCHIVE}" "${WH_HOST}" "${WH_TEMP_DIR}"
    printf '   ssh %s -> %s -> xl_ci@doc:%s\n' "${WH_HOST}" "${WH_XL_USER}" "${DOC_TARGET_DIR}"
  fi
  printf '============================================================\n\n'
  log "DRY-RUN 结束：未对系统或远程服务器造成任何修改。"
  exit 0
fi

log "当前主机: ${HOST_SHORT}"
log "仓库目录: ${REPO_ROOT}"

cd "${REPO_ROOT}"

log "步骤 1/4: 执行构建 (BASE_URL: ${VITE_BASE_PATH})"
VITE_BASE_URL="${VITE_BASE_PATH}" ${BUILD_CMD}

if [[ ! -d "${REPO_ROOT}/${DIST_DIR}" ]]; then
  log "错误: 未找到 ${DIST_DIR} 目录，构建结果异常"
  exit 1
fi

# 2. 如果是 web / website / official 模式，通过 FTP 使用 lftp 部署到官网外网服务器
if [[ "${DEPLOY_MODE}" =~ ^(web|website|official)$ ]]; then
  log "步骤 2/3: 检查 FTP 环境变量"
  if [[ -z "${FTPUSER:-}" ]] || [[ -z "${FTPPWD:-}" ]] || [[ -z "${FTPSERVER:-}" ]]; then
    log "错误: web 模式需要设置 FTPUSER, FTPPWD, FTPSERVER 环境变量"
    exit 1
  fi

  log "步骤 3/3: 使用 lftp 部署 ${DIST_DIR} 目录到 ${FTPSERVER}:${FTP_REMOTE_DIR}"
  lftp -u"${FTPUSER}","${FTPPWD}" "${FTPSERVER}" -e "
  set net:timeout 5;
  set net:max-retries 2;
  set net:reconnect-interval-base 3;
  mirror --parallel=2 -p -e -R ${DIST_DIR} ${FTP_REMOTE_DIR};
  bye"

  log "✅ 官网外网部署成功！"
  log "🔗 访问网址: ${DOC_URL}"
  exit 0
fi

# 3. 以下为 doc.corp 内网部署分支
log "步骤 2/5: 打包 ${DIST_DIR} 目录为 ${ARCHIVE_BASENAME}"
tar -czf "${LOCAL_ARCHIVE}" -C "${REPO_ROOT}/${DIST_DIR}" .

if [[ "${HOST_SHORT_LOWER}" == wh* ]]; then
  log "检测到当前位于 wh* 服务器，直接部署到 doc"
  log "步骤 3/5: 在 doc 服务器上创建目标目录 ${DOC_TARGET_DIR}"
  ssh xl_ci@doc "mkdir -p ${DOC_TARGET_DIR}"

  log "步骤 4/5: 通过 scp 上传 ${DIST_DIR} 内容到 xl_ci@doc:${DOC_TARGET_DIR}"
  scp -r "${REPO_ROOT}/${DIST_DIR}/." "xl_ci@doc:${DOC_TARGET_DIR}/"

  log "✅ 部署完成！"
  log "🔗 访问网址: ${DOC_URL}"
  exit 0
fi

log "检测到当前不在 wh* 服务器，准备经由 ${WH_HOST} 中转"

log "步骤 3/5: scp 打包文件到 ${WH_HOST}:${WH_TEMP_DIR}"
ssh "${WH_HOST}" "mkdir -p ${WH_TEMP_DIR}"
scp "${LOCAL_ARCHIVE}" "${WH_HOST}:${WH_TEMP_DIR}/"

log "步骤 4/5: 在 whss1 上转交给 xl_ci 用户，并由 xl_ci 部署到 doc"
ssh "${WH_HOST}" "\
  set -euo pipefail && \
  mkdir -p ${WH_TEMP_DIR} && \
  ssh ${WH_XL_USER} 'mkdir -p ${WH_TEMP_DIR}' && \
  scp ${REMOTE_ARCHIVE_PATH} ${WH_XL_USER}:${WH_TEMP_DIR}/ && \
  ssh ${WH_XL_USER} '\
    set -euo pipefail && \
    mkdir -p ${REMOTE_EXTRACT_DIR} && \
    tar -xzf ${REMOTE_ARCHIVE_PATH} -C ${REMOTE_EXTRACT_DIR} && \
    ssh xl_ci@doc \"mkdir -p ${DOC_TARGET_DIR}\" && \
    scp -r ${REMOTE_EXTRACT_DIR}/. xl_ci@doc:${DOC_TARGET_DIR}/ && \
    rm -rf ${REMOTE_EXTRACT_DIR} ${REMOTE_ARCHIVE_PATH}' && \
  rm -f ${REMOTE_ARCHIVE_PATH}"

log "✅ 部署完成！"
log "🔗 访问网址: ${DOC_URL}"
