import type { CpuCore } from '../data/cores';
import { EXTENSIONS } from '../data/extensions';
import type { Extension } from '../data/extensions';

export interface LogEntry {
  type: 'info' | 'warn' | 'success';
  message: string;
}

/**
 * Checks if an extension is disabled based on the current selection and core config.
 * Returns a string reason if disabled, or null if enabled.
 */
export function getExtensionDisabledReason(
  extId: string,
  selectedIds: Set<string>,
  core: CpuCore
): string | null {
  const ext = EXTENSIONS.find(e => e.id === extId);
  if (!ext) return '未知扩展';

  // 1. Check series compatibility
  if (ext.supportedSeries.length > 0 && !ext.supportedSeries.includes(core.series)) {
    const seriesNames = ext.supportedSeries.map(s => s.replace('nuclei-', '').replace('-series', '')).join('/');
    return `仅支持 ${seriesNames} 系列处理器`;
  }

  const baseArch = core.arch.toLowerCase();
  const isRV32 = baseArch.startsWith('rv32');

  const hasM = baseArch.includes('m');
  const hasF = baseArch.includes('f');
  const hasD = baseArch.includes('d');

  // 2. Check architecture letter dependencies
  if (ext.dependsOnArch) {
    for (const archChar of ext.dependsOnArch) {
      if (!baseArch.includes(archChar)) {
        return `依赖核心支持 "${archChar.toUpperCase()}" 扩展`;
      }
    }
  }

  // 3. Special rule: Zmmul
  if (extId === 'zmmul') {
    if (core.series !== 'nuclei-100-series') {
      return '仅支持 100 系列处理器';
    }
    if (hasM) {
      return '核心已自带 M 扩展，无需选择 Zmmul';
    }
  }

  // 4. Special rule: Zcf (RV32 + float/double only)
  if (extId === 'zcf') {
    if (!isRV32) {
      return '仅在 RV32 架构下有效';
    }
    if (!hasF && !hasD) {
      return '需要核心支持浮点扩展 (F/D)';
    }
  }

  // 5. Special rule: Load/Store pair (Zilsd/Zclsd are RV32 only)
  if (extId === 'zilsd' || extId === 'zclsd') {
    if (!isRV32) {
      return '仅支持 RV32 架构处理器';
    }
  }

  // 6. Conflicts
  // zclsd conflicts with zcf
  if (extId === 'zclsd' && selectedIds.has('zcf')) {
    return '与 Zcf 压缩浮点扩展冲突';
  }
  if (extId === 'zcf' && selectedIds.has('zclsd')) {
    return '与 Zclsd 压缩双字对加载存储扩展冲突';
  }

  // zcd conflicts with zcmp/zcmt
  if (extId === 'zcd' && (selectedIds.has('zcmp') || selectedIds.has('zcmt'))) {
    return '与 Zcmp/Zcmt 扩展冲突';
  }
  if ((extId === 'zcmp' || extId === 'zcmt') && selectedIds.has('zcd')) {
    return '与 Zcd 扩展冲突';
  }

  // 7. Check standard extension dependencies
  if (ext.dependsOnExtensions) {
    for (const depId of ext.dependsOnExtensions) {
      if (!selectedIds.has(depId)) {
        const depExt = EXTENSIONS.find(e => e.id === depId);
        return `依赖扩展: ${depExt ? depExt.name : depId}`;
      }
    }
  }

  // 8. Vector dependencies
  const selectedVector = Array.from(selectedIds).find(id =>
    ['zve32x', 'zve32f', 'zve64x', 'zve64f', 'zve64d', 'v'].includes(id)
  );

  // Vector Crypto dependencies
  if (ext.category === 'crypto-vector') {
    if (!selectedVector) {
      return '依赖 Vector 向量扩展 (zve32x/zve32f/zve64x/zve64f/zve64d/v)';
    }

    // zve64x requirement for specific vector crypto extensions: zvbc, zvknhb, and composites
    const requiresZve64x = ['zvbc', 'zvknhb', 'ext_zvknc', 'ext_zvkng', 'ext_zvkn', 'ext_zvksc'].includes(extId);
    if (requiresZve64x) {
      const isZve64 = ['zve64x', 'zve64f', 'zve64d', 'v'].includes(selectedVector);
      if (!isZve64) {
        return '依赖 Vector 扩展级别至少为 zve64x (zve64x/zve64f/zve64d/v)';
      }
    }
  }

  // BF16 dependencies on vector extension
  if (extId === 'zvfbfmin' || extId === 'xxlvfbf') {
    if (!selectedVector) {
      return '依赖 Vector 扩展级别至少为 zve32f';
    }
    const hasVectorFloat = ['zve32f', 'zve64f', 'zve64d', 'v'].includes(selectedVector);
    if (!hasVectorFloat) {
      return '依赖 Vector 扩展级别至少为 zve32f (带有浮点支持的 zve32f/zve64f/zve64d/v)';
    }
  }

  return null;
}

export function isExtensionDisabled(
  extId: string,
  selectedIds: Set<string>,
  core: CpuCore
): boolean {
  return getExtensionDisabledReason(extId, selectedIds, core) !== null;
}

/**
 * Core compiler flag builder. Takes the core and active extensions,
 * filters out invalid choices, applies folding, and sorts output.
 */
export function buildMarchString(
  core: CpuCore,
  selectedIds: Set<string>
): { march: string; mabi: string; logs: LogEntry[] } {
  const logs: LogEntry[] = [];
  const validSelected = new Set<string>();

  // Helper to check if composite components are fully selected and active
  const isCompositeFullySelectedAndEnabled = (ext: Extension): boolean => {
    if (!ext.components || ext.components.length === 0) return false;
    return ext.components.every(compId => {
      const compExt = EXTENSIONS.find(e => e.id === compId);
      if (!compExt) return false;

      // If the component is also a composite, check it recursively
      if (compExt.isComposite) {
        return isCompositeFullySelectedAndEnabled(compExt);
      }

      // Check if it's selected and not disabled
      return selectedIds.has(compId) && !isExtensionDisabled(compId, selectedIds, core);
    });
  };

  // 1. Filter out disabled extensions first
  for (const extId of selectedIds) {
    const ext = EXTENSIONS.find(e => e.id === extId);
    if (ext && !isExtensionDisabled(extId, selectedIds, core)) {
      validSelected.add(extId);
    } else if (ext) {
      const reason = getExtensionDisabledReason(extId, selectedIds, core);
      logs.push({
        type: 'warn',
        message: `跳过未满足依赖的扩展 ${ext.name}: ${reason}`
      });
    }
  }

  // 2. Base Core Arch details
  let baseArch = core.arch.toLowerCase();
  logs.push({
    type: 'info',
    message: `初始核心架构为: ${baseArch}`
  });

  // 3. Remove 'c' extension if zcmp or zcmt is selected
  const hasZcmpOrZcmt = validSelected.has('zcmp') || validSelected.has('zcmt');
  if (hasZcmpOrZcmt && baseArch.includes('c')) {
    baseArch = baseArch.replace('c', '');
    logs.push({
      type: 'info',
      message: `检测到已选择 Zcmp/Zcmt，从基础架构中移除 'c' 扩展`
    });
  }

  // 4. If Vector V is selected, append 'v' directly to single-character extensions
  // Wait, zve* vector extensions are multi-character and go in Z list,
  // but standard 'v' goes into the main single character string.
  const hasV = validSelected.has('v');
  if (hasV) {
    // Standard order of single-character extensions is i/e, m, a, f, d, c, v.
    // Let's parse baseArch and insert 'v' at the correct position.
    // Since 'v' is always at the end of single character letters:
    // Let's strip 'v' if it is already there, then append it properly.
    const letters = baseArch.replace(/^rv(32|64)/, '');
    if (!letters.includes('v')) {
      // Find the correct position for 'v'
      // If we have 'c', 'v' is after 'c'. If we don't have 'c' but have 'd', 'v' is after 'd', etc.
      // Easiest is to sort standard letters: i, e, g, m, a, f, d, c, v.
      const order = ['i', 'e', 'g', 'm', 'a', 'f', 'd', 'c', 'v'];
      const currentLetters = letters.split('');
      if (!currentLetters.includes('v')) {
        currentLetters.push('v');
      }
      currentLetters.sort((a, b) => order.indexOf(a) - order.indexOf(b));
      baseArch = baseArch.startsWith('rv32') ? 'rv32' + currentLetters.join('') : 'rv64' + currentLetters.join('');
      logs.push({
        type: 'info',
        message: `将标准 'v' 向量扩展拼入基础架构`
      });
    }
  }

  // 5. Fold custom DSP Extensions:
  // If xxldspn3x -> only xxldspn3x
  // else if xxldspn2x -> only xxldspn2x
  // else if xxldspn1x -> only xxldspn1x
  // else if xxldsp -> xxldsp
  const dspOutput: string[] = [];
  if (validSelected.has('xxldspn3x')) {
    dspOutput.push('xxldspn3x');
    logs.push({ type: 'success', message: '折叠 DSP 扩展至最高级别: _xxldspn3x' });
  } else if (validSelected.has('xxldspn2x')) {
    dspOutput.push('xxldspn2x');
    logs.push({ type: 'success', message: '折叠 DSP 扩展至: _xxldspn2x' });
  } else if (validSelected.has('xxldspn1x')) {
    dspOutput.push('xxldspn1x');
    logs.push({ type: 'success', message: '折叠 DSP 扩展至: _xxldspn1x' });
  } else if (validSelected.has('xxldsp')) {
    dspOutput.push('xxldsp');
  }

  // Remove all raw dsp extensions from the general pool so they don't get processed twice
  const dspIds = ['xxldsp', 'xxldspn1x', 'xxldspn2x', 'xxldspn3x'];
  const nonDspSelected = new Set(Array.from(validSelected).filter(id => !dspIds.includes(id)));

  // 6. Fold Scalar Crypto Extensions:
  // Components checklist:
  // zbkb, zbkc, zbkx, zknd, zkne, zknh, zksed, zksh, zkr, zkt.
  // Composite checks:
  // zk = zkn + zkr + zkt = (zbkb+zbkc+zbkx+zknd+zkne+zknh) + zkr + zkt
  // zks = zbkb+zbkc+zbkx+zksed+zksh
  // If zk and zks are both fully selected (or ext_zk_zks is selected) -> output zk, zks
  // If zk is fully selected -> output zk
  // If zkn and zks are fully selected -> output zkn, zks
  // If zkn is fully selected -> output zkn
  // If zks is fully selected -> output zks

  const cryptoOutput: string[] = [];
  const cryptoPool = new Set(Array.from(nonDspSelected).filter(id =>
    ['zbkb', 'zbkc', 'zbkx', 'zknd', 'zkne', 'zknh', 'zksed', 'zksh', 'zkr', 'zkt', 'ext_zk_zks', 'ext_zk', 'ext_zkn', 'ext_zks'].includes(id)
  ));

  // Determine if composite segments are selected
  const hasZbkb = cryptoPool.has('zbkb');
  const hasZbkc = cryptoPool.has('zbkc');
  const hasZbkx = cryptoPool.has('zbkx');
  const hasZknd = cryptoPool.has('zknd');
  const hasZkne = cryptoPool.has('zkne');
  const hasZknh = cryptoPool.has('zknh');
  const hasZksed = cryptoPool.has('zksed');
  const hasZksh = cryptoPool.has('zksh');
  const hasZkr = cryptoPool.has('zkr');
  const hasZkt = cryptoPool.has('zkt');

  const isZknFull = hasZbkb && hasZbkc && hasZbkx && hasZknd && hasZkne && hasZknh;
  const isZksFull = hasZbkb && hasZbkc && hasZbkx && hasZksed && hasZksh;
  const isZkFull = isZknFull && hasZkr && hasZkt;

  if (isZkFull && isZksFull) {
    cryptoOutput.push('zk', 'zks');
    logs.push({ type: 'success', message: '标量加密全部选中，折叠为: _zk_zks' });
  } else if (isZkFull) {
    cryptoOutput.push('zk');
    logs.push({ type: 'success', message: '折叠标量加密 NIST 完整版 (zk = zkn + zkr + zkt) 到: _zk' });
    if (isZksFull) {
      cryptoOutput.push('zks');
    } else {
      if (hasZksed) cryptoOutput.push('zksed');
      if (hasZksh) cryptoOutput.push('zksh');
    }
  } else if (isZknFull && isZksFull) {
    cryptoOutput.push('zkn', 'zks');
    logs.push({ type: 'success', message: '折叠标量加密子集到: _zkn_zks' });
    if (hasZkr) cryptoOutput.push('zkr');
    if (hasZkt) cryptoOutput.push('zkt');
  } else {
    // Check individually
    if (isZknFull) {
      cryptoOutput.push('zkn');
      logs.push({ type: 'success', message: '折叠标量加密 NIST 子集 (zbkb+zbkc+zbkx+zknd+zkne+zknh) 到: _zkn' });
    } else {
      if (hasZbkb) cryptoOutput.push('zbkb');
      if (hasZbkc) cryptoOutput.push('zbkc');
      if (hasZbkx) cryptoOutput.push('zbkx');
      if (hasZknd) cryptoOutput.push('zknd');
      if (hasZkne) cryptoOutput.push('zkne');
      if (hasZknh) cryptoOutput.push('zknh');
    }

    if (isZksFull) {
      cryptoOutput.push('zks');
      logs.push({ type: 'success', message: '折叠标量加密国密子集 (zbkb+zbkc+zbkx+zksed+zksh) 到: _zks' });
    } else {
      // If zkn is full, zbkb/zbkc/zbkx are already added, so don't double add
      if (!isZknFull) {
        // If we didn't add them under zkn, add them if selected
        // Wait, they are added in the zkn else block above.
      }
      if (hasZksed) cryptoOutput.push('zksed');
      if (hasZksh) cryptoOutput.push('zksh');
    }

    if (hasZkr) cryptoOutput.push('zkr');
    if (hasZkt) cryptoOutput.push('zkt');
  }

  // Remove all scalar crypto components/composites from general pool
  const cryptoIds = ['zbkb', 'zbkc', 'zbkx', 'zknd', 'zkne', 'zknh', 'zksed', 'zksh', 'zkr', 'zkt', 'ext_zk_zks', 'ext_zk', 'ext_zkn', 'ext_zks'];
  const remainingSelected = new Set(Array.from(nonDspSelected).filter(id => !cryptoIds.includes(id)));

  // 7. Fold Vector Crypto Extensions:
  // Components: zvbb, zvbc, zvkb, zvkg, zvkned, zvknhb, zvknha, zvksed, zvksh, zvkt
  // Note: zvknhb contains zvknha, so we treat zvknha as part of it.
  // Composites:
  // zvkn = zvkned + zvknhb + zvkb + zvkt
  // zvknc = zvkn + zvbc
  // zvkng = zvkn + zvkg
  // zvks = zvksed + zvksh + zvkb + zvkt
  // zvksc = zvks + zvbc
  // zvksg = zvks + zvkg
  const vectorCryptoOutput: string[] = [];
  const vCryptoPool = new Set(Array.from(remainingSelected).filter(id =>
    ['zvbb', 'zvbc', 'zvkb', 'zvkg', 'zvkned', 'zvknhb', 'zvknha', 'zvksed', 'zvksh', 'zvkt', 'ext_zvknc', 'ext_zvkng', 'ext_zvkn', 'ext_zvksc', 'ext_zvksg', 'ext_zvks'].includes(id)
  ));

  const hasZvbb = vCryptoPool.has('zvbb');

  // Let's resolve the actual checked values
  // Since we also support checking sub-elements to select composites, let's verify components.
  const hasSubZvknha = selectedIds.has('zvknha');
  const hasSubZvknhb = selectedIds.has('zvknhb');
  const hasSubZvkned = selectedIds.has('zvkned');
  const hasSubZvkb = selectedIds.has('zvkb');
  const hasSubZvkt = selectedIds.has('zvkt');
  const hasSubZvbc = selectedIds.has('zvbc');
  const hasSubZvkg = selectedIds.has('zvkg');
  const hasSubZvksed = selectedIds.has('zvksed');
  const hasSubZvksh = selectedIds.has('zvksh');

  const isZvknFull = hasSubZvkned && hasSubZvknhb && hasSubZvkb && hasSubZvkt;
  const isZvkncFull = isZvknFull && hasSubZvbc;
  const isZvkngFull = isZvknFull && hasSubZvkg;

  const isZvksFull = hasSubZvksed && hasSubZvksh && hasSubZvkb && hasSubZvkt;
  const isZvkscFull = isZvksFull && hasSubZvbc;
  const isZvksgFull = isZvksFull && hasSubZvkg;

  if (isZvkncFull) {
    vectorCryptoOutput.push('zvknc');
    logs.push({ type: 'success', message: '折叠向量加密 NIST 套件 (带无进位乘法) 到: _zvknc' });
  } else if (isZvkngFull) {
    vectorCryptoOutput.push('zvkng');
    logs.push({ type: 'success', message: '折叠向量加密 NIST 套件 (带 GCM) 到: _zvkng' });
  } else if (isZvknFull) {
    vectorCryptoOutput.push('zvkn');
    logs.push({ type: 'success', message: '折叠向量加密 NIST 套件 到: _zvkn' });
  } else {
    // Output individual pieces
    if (hasSubZvkned) vectorCryptoOutput.push('zvkned');
    if (hasSubZvknhb) {
      vectorCryptoOutput.push('zvknhb');
    } else if (hasSubZvknha) {
      vectorCryptoOutput.push('zvknha');
    }
  }

  if (isZvkscFull) {
    vectorCryptoOutput.push('zvksc');
    logs.push({ type: 'success', message: '折叠向量加密国密套件 (带无进位乘法) 到: _zvksc' });
  } else if (isZvksgFull) {
    vectorCryptoOutput.push('zvksg');
    logs.push({ type: 'success', message: '折叠向量加密国密套件 (带 GCM) 到: _zvksg' });
  } else if (isZvksFull) {
    vectorCryptoOutput.push('zvks');
    logs.push({ type: 'success', message: '折叠向量加密国密套件 到: _zvks' });
  } else {
    if (hasSubZvksed) vectorCryptoOutput.push('zvksed');
    if (hasSubZvksh) vectorCryptoOutput.push('zvksh');
  }

  // Common pieces shared but not folded
  if (!isZvknFull && !isZvksFull) {
    if (hasSubZvkb) vectorCryptoOutput.push('zvkb');
    if (hasSubZvkt) vectorCryptoOutput.push('zvkt');
  }
  if (!isZvkncFull && !isZvkscFull && hasSubZvbc) {
    vectorCryptoOutput.push('zvbc');
  }
  if (!isZvkngFull && !isZvksgFull && hasSubZvkg) {
    vectorCryptoOutput.push('zvkg');
  }
  if (hasZvbb) vectorCryptoOutput.push('zvbb');

  // Remove all vector crypto from general pool
  const vCryptoIds = ['zvbb', 'zvbc', 'zvkb', 'zvkg', 'zvkned', 'zvknhb', 'zvknha', 'zvksed', 'zvksh', 'zvkt', 'ext_zvknc', 'ext_zvkng', 'ext_zvkn', 'ext_zvksc', 'ext_zvksg', 'ext_zvks'];
  let baseSelected = Array.from(remainingSelected).filter(id => !vCryptoIds.includes(id));

  // 8. Zfh folding: if Zfh is selected, suppress Zfhmin from output
  if (baseSelected.includes('zfh')) {
    baseSelected = baseSelected.filter(id => id !== 'zfhmin');
  }

  // 10. Construct standard and custom collections
  let standardExts: string[] = [];
  const customExts: string[] = [];

  // Add the folded ones to their lists based on ID prefix
  const allFolded = [...dspOutput, ...cryptoOutput, ...vectorCryptoOutput];

  // Also push standard/custom from baseSelected (filtering composites)
  for (const id of baseSelected) {
    const ext = EXTENSIONS.find(e => e.id === id);
    if (!ext) continue;
    // Skip composites except zfh (zfh is a real extension name that must appear in march string)
    if (ext.isComposite && ext.id !== 'zfh') continue;
    // Standard 'v' is already merged into baseArch, don't output as _v
    if (id === 'v') continue;

    if (ext.type === 'custom') {
      customExts.push(id);
    } else {
      standardExts.push(id);
    }
  }

  // Categorize folded items as standard or custom
  for (const id of allFolded) {
    if (id.startsWith('x')) {
      customExts.push(id);
    } else {
      standardExts.push(id);
    }
  }

  // If C composite is selected and base arch doesn't have 'c', add 'c' to the letters
  if (validSelected.has('ext_c') && !isExtensionDisabled('ext_c', validSelected, core) && !baseArch.includes('c')) {
    const letters = baseArch.replace(/^rv(32|64)/, '').split('');
    letters.push('c');
    const order = ['i', 'e', 'g', 'm', 'a', 'f', 'd', 'c', 'v'];
    letters.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    baseArch = baseArch.startsWith('rv32') ? 'rv32' + letters.join('') : 'rv64' + letters.join('');
  }

  // If base arch still has 'c' (not stripped by zcmp/zcmt), zca, zcf, and zcd are
  // implicitly included and should not appear in the march string
  // C always implies Zca
  // C+F implies Zcf (RV32 only)
  // C+D implies Zcd
  if (baseArch.includes('c')) {
    const implicitZc = standardExts.filter(id => id === 'zca' || id === 'zcf' || id === 'zcd');
    if (implicitZc.length > 0) {
      standardExts = standardExts.filter(id => id !== 'zca' && id !== 'zcf' && id !== 'zcd');
    }
  }

  // Deduplicate and sort standard 'z' extensions alphabetically
  const uniqueStandard = Array.from(new Set(standardExts)).sort((a, b) => a.localeCompare(b));

  // Deduplicate and sort custom 'x' extensions alphabetically
  const uniqueCustom = Array.from(new Set(customExts)).sort((a, b) => a.localeCompare(b));

  // Build the final march string
  let march = baseArch;
  if (uniqueStandard.length > 0) {
    march += '_' + uniqueStandard.join('_');
  }
  if (uniqueCustom.length > 0) {
    march += '_' + uniqueCustom.join('_');
  }

  logs.push({
    type: 'info',
    message: `生成最终的 -march 选项: ${march}`
  });

  return {
    march,
    mabi: core.abi,
    logs
  };
}
