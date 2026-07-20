#!/usr/bin/env bash

set -euo pipefail

WH_HOST="hqfang@whss1.corp.nucleisys.com"
WH_XL_USER="xl_ci@whss1.corp.nucleisys.com"
WH_TEMP_DIR="~/temp"

DOC_TARGET_DIR_BETA="~/doc_center/beta/cpuextsel"
DOC_TARGET_DIR_PROD="~/doc_center/tools/cpuextsel"

DOC_URL_BETA="https://doc.corp.nucleisys.com/beta/cpuextsel"
DOC_URL_PROD="https://doc.corp.nucleisys.com/tools/cpuextsel"

FTP_REMOTE_DIR="tools/cpuextsel"
WEB_URL="https://doc.nucleisys.com/${FTP_REMOTE_DIR}"

DEPLOY_MODE="${1:-beta}"
DOC_TARGET_DIR=""
DOC_URL=""
VITE_BASE_PATH=""

case "${DEPLOY_MODE}" in
  beta)
    DOC_TARGET_DIR="${DOC_TARGET_DIR_BETA}"
    DOC_URL="${DOC_URL_BETA}"
    VITE_BASE_PATH="/beta/cpuextsel/"
    ;;
  prod|formal)
    DOC_TARGET_DIR="${DOC_TARGET_DIR_PROD}"
    DOC_URL="${DOC_URL_PROD}"
    VITE_BASE_PATH="/tools/cpuextsel/"
    ;;
  web|website|official)
    DOC_URL="${WEB_URL}"
    VITE_BASE_PATH="/tools/cpuextsel/"
    ;;
  *)
    printf 'Usage: %s [beta|prod|formal|web|website|official]\n' "$(basename "$0")" >&2
    exit 1
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
HOST_SHORT="$(hostname -s 2>/dev/null || hostname)"
HOST_SHORT_LOWER="$(printf '%s' "${HOST_SHORT}" | tr '[:upper:]' '[:lower:]')"
TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
ARCHIVE_BASENAME="cpuextsel_dist_${TIMESTAMP}.tar.gz"
LOCAL_ARCHIVE="${REPO_ROOT}/${ARCHIVE_BASENAME}"
REMOTE_ARCHIVE_PATH="${WH_TEMP_DIR}/${ARCHIVE_BASENAME}"
REMOTE_EXTRACT_DIR="${WH_TEMP_DIR}/cpuextsel_dist_${TIMESTAMP}"

log() {
  printf '[deploy-doc] %s\n' "$1"
}

cleanup_local() {
  if [[ -f "${LOCAL_ARCHIVE}" ]]; then
    rm -f "${LOCAL_ARCHIVE}"
  fi
}

cleanup_remote() {
  if [[ "${HOST_SHORT_LOWER}" == wh* ]] || [[ "${DEPLOY_MODE}" =~ ^(web|website|official)$ ]]; then
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

log "当前主机: ${HOST_SHORT}"
log "仓库目录: ${REPO_ROOT}"
log "部署模式: ${DEPLOY_MODE}"

cd "${REPO_ROOT}"

log "步骤 1/4: 编译网页 (VITE_BASE_URL: ${VITE_BASE_PATH})"
VITE_BASE_URL="${VITE_BASE_PATH}" npm run build

if [[ ! -d "${REPO_ROOT}/dist" ]]; then
  log "错误: 未找到 dist 目录，构建结果异常"
  exit 1
fi

# 如果是 web / website / official 模式，通过 FTP 使用 lftp 部署到官网外网服务器
if [[ "${DEPLOY_MODE}" =~ ^(web|website|official)$ ]]; then
  log "步骤 2/3: 检查 FTP 环境变量"
  if [[ -z "${FTPUSER:-}" ]] || [[ -z "${FTPPWD:-}" ]] || [[ -z "${FTPSERVER:-}" ]]; then
    log "错误: web 模式需要设置 FTPUSER, FTPPWD, FTPSERVER 环境变量"
    exit 1
  fi

  log "步骤 3/3: 使用 lftp 部署 dist 目录到 ${FTPSERVER}:${FTP_REMOTE_DIR}"
  lftp -u"${FTPUSER}","${FTPPWD}" "${FTPSERVER}" -e "
  set net:timeout 5;
  set net:max-retries 2;
  set net:reconnect-interval-base 3;
  mirror --parallel=2 -p -e -R dist ${FTP_REMOTE_DIR};
  bye"

  log "部署完成！"
  log "官网网址: ${DOC_URL}"
  exit 0
fi

# 以下为 doc.corp 内网部署分支
log "目标目录: ${DOC_TARGET_DIR}"

log "步骤 2/5: 打包 dist 目录为 ${ARCHIVE_BASENAME}"
tar -czf "${LOCAL_ARCHIVE}" -C "${REPO_ROOT}/dist" .

if [[ "${HOST_SHORT_LOWER}" == wh* ]]; then
  log "检测到当前位于 wh* 服务器，直接部署到 doc"
  log "步骤 3/5: 在 doc 服务器上创建目标目录 ${DOC_TARGET_DIR}"
  ssh xl_ci@doc "mkdir -p ${DOC_TARGET_DIR}"

  log "步骤 4/5: 通过 scp 上传 dist 内容到 xl_ci@doc:${DOC_TARGET_DIR}"
  scp -r "${REPO_ROOT}/dist/." "xl_ci@doc:${DOC_TARGET_DIR}/"

  log "步骤 5/5: 部署完成"
  log "部署网址: ${DOC_URL}"
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

log "步骤 5/5: 部署完成"
log "部署网址: ${DOC_URL}"
