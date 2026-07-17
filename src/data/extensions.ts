export interface Extension {
  id: string;
  name: string;
  category: string;
  description: string;
  supportedSeries: string[]; // empty means all
  dependsOnArch?: string[]; // e.g. ["f"] or ["m"] or ["a", "m"]
  dependsOnExtensions?: string[]; // e.g. ["zve32f"]
  conflictsWith?: string[]; // e.g. ["zcf"]
  type: 'single' | 'standard' | 'custom';
  isComposite?: boolean;
  components?: string[];
}

export interface ExtensionCategory {
  id: string;
  name: string;
  description: string;
}

export const EXTENSION_CATEGORIES: ExtensionCategory[] = [
  { id: 'zc', name: 'C/Zc 压缩指令扩展', description: '针对微控制器的压缩指令集，可根据规则缩减/合并代码大小。' },
  { id: 'bitmanip', name: 'Bit-Manipulation 位操作扩展', description: '提供高效的位操作指令（B 扩展）。' },
  { id: 'cmo', name: 'CMO 缓存管理扩展', description: 'Base Cache Management Operation 缓存块管理、预取及清零指令。' },
  { id: 'zicond', name: 'Zicond 条件操作扩展', description: '整数条件操作指令（Integer Conditional Operations）。' },
  { id: 'zibi', name: 'Zibi 立即数分支扩展', description: '带立即数操作数的条件分支指令，优化控制流。' },
  { id: 'zmmul', name: 'Zmmul 乘法扩展', description: '仅乘法部分的标准扩展（不包含除法）。' },
  { id: 'zihint', name: 'Zihint 提示扩展', description: '包含 Pause Hint 延迟与非临时局部性提示指令。' },
  { id: 'float', name: 'F16+Zfa', description: '半精度浮点（Zfh/Zfhmin）与附加浮点指令（Zfa）。' },
  { id: 'bf16', name: 'BF16 浮点扩展', description: 'BFloat16 精度的标量及向量浮点转换指令。' },
  { id: 'loadstore', name: 'Load/Store Pair', description: 'RV32 专用的成对 Load/Store 操作指令。' },
  { id: 'mop', name: 'May-Be-Operations 扩展', description: '提供系统预留或特殊 May-Be-Operations 操作码支持。' },
  { id: 'dsp', name: 'DSP 扩展', description: 'Nuclei 定制 DSP 扩展指令，支持各种级别的数据流加速（单选）。' },
  { id: 'crypto-scalar', name: 'Scalar Crypto', description: '标量层面的商用及标准密码算法指令集。' },
  { id: 'vector', name: 'Vector 向量扩展', description: '向量计算标准扩展（可根据规则和默认值自动勾选，单选）。' },
  { id: 'crypto-vector', name: 'Vector Crypto 向量加密扩展', description: '基于向量处理器的密码算法指令集（依赖于 Vector 扩展）。' },
  { id: 'float-int', name: 'Zfinx+ 整型寄存器浮点扩展', description: '整型寄存器浮点扩展，与 F/D/Zfa 互斥。依赖 F 支持。' }
];

export const EXTENSIONS: Extension[] = [
  // 1. Zc
  { id: 'ext_c', name: 'C 扩展', category: 'zc', description: 'C 压缩指令扩展 (隐含 Zca、RV32+F→Zcf、有D→Zcd)', supportedSeries: [], type: 'standard', isComposite: true, components: ['zca'] },
  { id: 'ext_zce', name: 'Zce 扩展', category: 'zc', description: 'Zce 组合 (RV32: Zca+Zcb+Zcmp+Zcmt±Zcf; RV64: Zca+Zcb+Zcmp+Zcmt)', supportedSeries: [], type: 'standard', isComposite: true, components: ['zca', 'zcb', 'zcmp', 'zcmt'] },
  { id: 'zca', name: 'Zca', category: 'zc', description: 'Zc Base compressed instructions for integer (implied by C)', supportedSeries: [], type: 'standard' },
  { id: 'zcb', name: 'Zcb', category: 'zc', description: 'Zc Extension for additional simple compressed instructions', supportedSeries: [], type: 'standard', dependsOnExtensions: ['zca'] },
  { id: 'zcf', name: 'Zcf', category: 'zc', description: 'Zc Extension for RV32 float load/store compressed instructions (implied by C+F on RV32)', supportedSeries: [], dependsOnArch: ['f'], dependsOnExtensions: ['zca'], conflictsWith: ['zclsd'], type: 'standard' },
  { id: 'zcd', name: 'Zcd', category: 'zc', description: 'Zc Extension for double-precision float load/store compressed instructions (implied by C+D)', supportedSeries: [], dependsOnArch: ['d'], dependsOnExtensions: ['zca'], conflictsWith: ['zcmp', 'zcmt'], type: 'standard' },
  { id: 'zcmp', name: 'Zcmp', category: 'zc', description: 'Zc Extension for push/pop and double move compressed instructions', supportedSeries: [], type: 'standard', dependsOnExtensions: ['zca'], conflictsWith: ['zcd'] },
  { id: 'zcmt', name: 'Zcmt', category: 'zc', description: 'Zc Extension for table jump compressed instructions', supportedSeries: [], type: 'standard', dependsOnExtensions: ['zca'], conflictsWith: ['zcd'] },
  { id: 'xxlcz', name: 'Xxlcz', category: 'zc', description: 'Nuclei Customized XLCZ ISA Extension', supportedSeries: ['nuclei-200-series', 'nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series'], type: 'custom' },

  // 2. Bit-Manipulation
  { id: 'ext_b', name: 'B 扩展 (zba+zbb+zbs)', category: 'bitmanip', description: '标准 Bit-Manipulation 组合 (zba + zbb + zbs)', supportedSeries: [], type: 'standard', isComposite: true, components: ['zba', 'zbb', 'zbs'] },
  { id: 'zba', name: 'Zba', category: 'bitmanip', description: 'Address generation instructions', supportedSeries: [], type: 'standard' },
  { id: 'zbb', name: 'Zbb', category: 'bitmanip', description: 'Basic bit-manipulation instructions', supportedSeries: [], type: 'standard' },
  { id: 'zbc', name: 'Zbc', category: 'bitmanip', description: 'Carry-less multiplication instructions', supportedSeries: [], type: 'standard' },
  { id: 'zbs', name: 'Zbs', category: 'bitmanip', description: 'Single-bit instructions', supportedSeries: [], type: 'standard' },

  // 3. CMO
  { id: 'zicbom', name: 'Zicbom', category: 'cmo', description: 'Cache-block management instructions', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },
  { id: 'zicbop', name: 'Zicbop', category: 'cmo', description: 'Cache-block prefetch instructions', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },
  { id: 'zicboz', name: 'Zicboz', category: 'cmo', description: 'Cache-block zero instructions', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },

  // 4. Zicond
  { id: 'zicond', name: 'Zicond', category: 'zicond', description: 'Integer Conditional Operations v1.0', supportedSeries: [], type: 'standard' },

  // 5. Zibi
  { id: 'zibi', name: 'Zibi', category: 'zibi', description: 'Branch with Immediate Instructions v0.6', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },

  // 6. Zmmul
  { id: 'zmmul', name: 'Zmmul', category: 'zmmul', description: 'Integer Multiplication instructions v1.0 (Only for N100 series without M)', supportedSeries: ['nuclei-100-series'], type: 'standard' },

  // 7. Zihint
  { id: 'zihintpause', name: 'Zihintpause', category: 'zihint', description: 'Pause Hint, Version 2.0', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },
  { id: 'zihintntl', name: 'Zihintntl', category: 'zihint', description: 'Non-Temporal Locality Hints, Version 1.0', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },

  // 8. Float (Half precision & Zfa)
  { id: 'zfh', name: 'Zfh', category: 'float', description: 'Standard Half-Precision Floating-Point (includes Zfhmin)', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['f'], type: 'standard', isComposite: true, components: ['zfhmin'] },
  { id: 'zfhmin', name: 'Zfhmin', category: 'float', description: 'Minimal Half-Precision Floating-Point', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['f'], type: 'standard' },
  { id: 'zfa', name: 'Zfa', category: 'float', description: 'Additional Floating-Point Instructions v1.0', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['f'], type: 'standard' },

  // 8b. Zfinx+ (Floating-Point in Integer Registers, mutually exclusive with standard F/D)
  { id: 'zfinx', name: 'Zfinx', category: 'float-int', description: 'Single-precision float in integer registers (与 F/D 互斥)', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series'], type: 'standard' },
  { id: 'ext_zdinx', name: 'Zdinx', category: 'float-int', description: 'Double-precision float in integer registers (includes Zfinx)', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series'], type: 'standard', isComposite: true, components: ['zfinx'] },
  { id: 'ext_zhinx', name: 'Zhinx', category: 'float-int', description: 'Half-precision float in integer registers (includes Zfinx+Zhinxmin)', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series'], type: 'standard', isComposite: true, components: ['zfinx', 'zhinxmin'] },
  { id: 'zhinxmin', name: 'Zhinxmin', category: 'float-int', description: 'Minimal half-precision float in integer registers (includes Zfinx)', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series'], type: 'standard', isComposite: true, components: ['zfinx'] },

  // 9. BF16
  { id: 'zfbfmin', name: 'Zfbfmin', category: 'bf16', description: 'Scalar BF16 Converts', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['f'], type: 'standard' },
  { id: 'zvfbfmin', name: 'Zvfbfmin', category: 'bf16', description: 'Vector BF16 Converts (requires Vector >= zve32f)', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },
  { id: 'zvfbfwma', name: 'Zvfbfwma', category: 'bf16', description: 'Vector BF16 widening mul-add (requires Zvfbfmin + Zfbfmin)', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnExtensions: ['zfbfmin', 'zvfbfmin'], type: 'standard' },
  { id: 'xxlfbf', name: 'Xxlfbf', category: 'bf16', description: 'Nuclei Customized BF16 extension', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['f'], type: 'custom' },
  { id: 'xxlvfbf', name: 'Xxlvfbf', category: 'bf16', description: 'Nuclei Customized Vector BF16 extension (requires Vector >= zve32f)', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'custom' },

  // 10. Load/Store pair (RV32 only)
  { id: 'zilsd', name: 'Zilsd', category: 'loadstore', description: 'Standard Load/Store pair for RV32', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },
  { id: 'zclsd', name: 'Zclsd', category: 'loadstore', description: 'Compressed Load/Store pair (mutual exclusive with Zcf)', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], conflictsWith: ['zcf'], type: 'standard' },

  // 11. May-Be-Operations
  { id: 'zimop', name: 'Zimop', category: 'mop', description: 'May-Be-Operations, Version 1.0', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },
  { id: 'zcmop', name: 'Zcmop', category: 'mop', description: 'Compressed May-Be-Operations, Version 1.0', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },

  // 12. DSP (DSP Extensions are level-based and mutually exclusive in selected UI, but we keep custom type)
  { id: 'xxldsp', name: 'Xxldsp', category: 'dsp', description: 'Draft P extension', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['m'], type: 'custom' },
  { id: 'xxldspn1x', name: 'Xxldspn1x', category: 'dsp', description: 'Nuclei Customized DSP Level 1 (includes Xxldsp)', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['m'], type: 'custom' },
  { id: 'xxldspn2x', name: 'Xxldspn2x', category: 'dsp', description: 'Nuclei Customized DSP Level 2 (includes Level 1)', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['m'], type: 'custom' },
  { id: 'xxldspn3x', name: 'Xxldspn3x', category: 'dsp', description: 'Nuclei Customized DSP Level 3 (includes Level 2)', supportedSeries: ['nuclei-300-series', 'nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['m'], type: 'custom' },

  // 13. Scalar Crypto
  { id: 'ext_zk', name: 'Zk 组合', category: 'crypto-scalar', description: 'Standard Scalar Cryptography composite (zkn + zkr + zkt)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm'], type: 'standard', isComposite: true, components: ['ext_zkn', 'zkr', 'zkt'] },
  { id: 'ext_zkn', name: 'Zkn 组合', category: 'crypto-scalar', description: 'NIST Algorithm Suite composite (zbkb+zbkc+zbkx+zknd+zkne+zknh)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm'], type: 'standard', isComposite: true, components: ['zbkb', 'zbkc', 'zbkx', 'zknd', 'zkne', 'zknh'] },
  { id: 'ext_zks', name: 'Zks 组合', category: 'crypto-scalar', description: 'ShangMi Algorithm Suite composite (zbkb+zbkc+zbkx+zksed+zksh)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm'], type: 'standard', isComposite: true, components: ['zbkb', 'zbkc', 'zbkx', 'zksed', 'zksh'] },
  { id: 'zbkb', name: 'Zbkb', category: 'crypto-scalar', description: 'Bit-manipulation instructions for cryptography', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm'], type: 'standard' },
  { id: 'zbkc', name: 'Zbkc', category: 'crypto-scalar', description: 'Carry-less multiplication instructions for cryptography', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm'], type: 'standard' },
  { id: 'zbkx', name: 'Zbkx', category: 'crypto-scalar', description: 'Crossbar permutation instructions for cryptography', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm'], type: 'standard' },
  { id: 'zknd', name: 'Zknd', category: 'crypto-scalar', description: 'NIST AES decryption instructions', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm'], type: 'standard' },
  { id: 'zkne', name: 'Zkne', category: 'crypto-scalar', description: 'NIST AES encryption instructions', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm'], type: 'standard' },
  { id: 'zknh', name: 'Zknh', category: 'crypto-scalar', description: 'NIST SHA-2 instructions', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm'], type: 'standard' },
  { id: 'zksed', name: 'Zksed', category: 'crypto-scalar', description: 'ShangMi SM4 block cipher instructions', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm'], type: 'standard' },
  { id: 'zksh', name: 'Zksh', category: 'crypto-scalar', description: 'ShangMi SM3 secure hash instructions', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm'], type: 'standard' },
  { id: 'zkr', name: 'Zkr', category: 'crypto-scalar', description: 'Entropy Source Extension', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm'], type: 'standard' },
  { id: 'zkt', name: 'Zkt', category: 'crypto-scalar', description: 'Data-Independent Execution Latency', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm'], type: 'standard' },

  // 14. Vector (Single choice)
  { id: 'zve32x', name: 'Zve32x', category: 'vector', description: 'Vector extension for embedded 32-bit (integer only)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm'], type: 'standard' },
  { id: 'zve32f', name: 'Zve32f', category: 'vector', description: 'Vector extension for embedded 32-bit (with single-precision float)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm', 'f'], type: 'standard' },
  { id: 'zve64x', name: 'Zve64x', category: 'vector', description: 'Vector extension for embedded 64-bit (integer only)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm'], type: 'standard' },
  { id: 'zve64f', name: 'Zve64f', category: 'vector', description: 'Vector extension for embedded 64-bit (with single-precision float)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm', 'f'], type: 'standard' },
  { id: 'zve64d', name: 'Zve64d', category: 'vector', description: 'Vector extension for embedded 64-bit (with double-precision float)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm', 'd'], type: 'standard' },
  { id: 'v', name: 'V (Vector)', category: 'vector', description: 'Standard Vector Extension (implicitly includes zve64d)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], dependsOnArch: ['a', 'm', 'd'], type: 'single' },
  { id: 'zvl128b', name: 'Zvl128b', category: 'vector', description: 'Minimum vector register length of 128 bits', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },
  { id: 'zvl256b', name: 'Zvl256b', category: 'vector', description: 'Minimum vector register length of 256 bits', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },
  { id: 'zvl512b', name: 'Zvl512b', category: 'vector', description: 'Minimum vector register length of 512 bits', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },
  { id: 'zvl1024b', name: 'Zvl1024b', category: 'vector', description: 'Minimum vector register length of 1024 bits', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },

  // 15. Vector Crypto
  { id: 'ext_zvknc', name: 'Zvknc 组合', category: 'crypto-vector', description: 'Vector crypto NIST suite with carry-less multiply composite (zvkn + zvbc)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard', isComposite: true, components: ['ext_zvkn', 'zvbc'] },
  { id: 'ext_zvkng', name: 'Zvkng 组合', category: 'crypto-vector', description: 'Vector crypto NIST suite with GCM composite (zvkn + zvkg)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard', isComposite: true, components: ['ext_zvkn', 'zvkg'] },
  { id: 'ext_zvkn', name: 'Zvkn 组合', category: 'crypto-vector', description: 'Vector crypto NIST suite composite (zvkned+zvknhb+zvkb+zvkt)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard', isComposite: true, components: ['zvkned', 'zvknhb', 'zvkb', 'zvkt'] },
  { id: 'ext_zvksc', name: 'Zvksc 组合', category: 'crypto-vector', description: 'Vector crypto ShangMi suite with carry-less multiply composite (zvks + zvbc)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard', isComposite: true, components: ['ext_zvks', 'zvbc'] },
  { id: 'ext_zvksg', name: 'Zvksg 组合', category: 'crypto-vector', description: 'Vector crypto ShangMi suite with GCM composite (zvks + zvkg)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard', isComposite: true, components: ['ext_zvks', 'zvkg'] },
  { id: 'ext_zvks', name: 'Zvks 组合', category: 'crypto-vector', description: 'Vector crypto ShangMi suite composite (zvksed+zvksh+zvkb+zvkt)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard', isComposite: true, components: ['zvksed', 'zvksh', 'zvkb', 'zvkt'] },
  { id: 'zvbb', name: 'Zvbb', category: 'crypto-vector', description: 'Vector Basic Bit-manipulation instructions for cryptography', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },
  { id: 'zvbc', name: 'Zvbc', category: 'crypto-vector', description: 'Vector Carry-less Multiplication (requires Vector >= zve64x)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },
  { id: 'zvkb', name: 'Zvkb', category: 'crypto-vector', description: 'Vector Cryptography Bit-manipulation', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },
  { id: 'zvkg', name: 'Zvkg', category: 'crypto-vector', description: 'Vector GCM/GMAC instructions', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },
  { id: 'zvkned', name: 'Zvkned', category: 'crypto-vector', description: 'NIST Suite: Vector AES Block Cipher', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },
  { id: 'zvknhb', name: 'Zvknhb', category: 'crypto-vector', description: 'NIST Suite: Vector SHA-2 Secure Hash (SHA-256 and SHA-512) (requires Vector >= zve64x, includes Zvknha)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard', isComposite: true, components: ['zvknha'] },
  { id: 'zvknha', name: 'Zvknha', category: 'crypto-vector', description: 'NIST Suite: Vector SHA-2 Secure Hash (SHA-256 only)', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },
  { id: 'zvksed', name: 'Zvksed', category: 'crypto-vector', description: 'ShangMi Suite: SM4 Block Cipher', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },
  { id: 'zvksh', name: 'Zvksh', category: 'crypto-vector', description: 'ShangMi Suite: SM3 Secure Hash', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' },
  { id: 'zvkt', name: 'Zvkt', category: 'crypto-vector', description: 'Vector Data-Independent Execution Latency', supportedSeries: ['nuclei-600-series', 'nuclei-900-series', 'nuclei-1000-series'], type: 'standard' }
];
