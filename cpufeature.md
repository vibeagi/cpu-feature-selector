N100E_CORE_ARCH_ABI = rv32ec ilp32e nuclei-100-series
N100EM_CORE_ARCH_ABI = rv32emc ilp32e nuclei-100-series
N100_CORE_ARCH_ABI = rv32ic ilp32 nuclei-100-series
N100M_CORE_ARCH_ABI = rv32imc ilp32 nuclei-100-series
N200_CORE_ARCH_ABI = rv32imc ilp32 nuclei-200-series
N200E_CORE_ARCH_ABI = rv32emc ilp32e nuclei-200-series
N201_CORE_ARCH_ABI = rv32iac ilp32 nuclei-200-series
N201E_CORE_ARCH_ABI = rv32eac ilp32e nuclei-200-series
N202_CORE_ARCH_ABI = rv32ic ilp32 nuclei-200-series
N202E_CORE_ARCH_ABI = rv32ec ilp32e nuclei-200-series
N203_CORE_ARCH_ABI = rv32imac ilp32 nuclei-200-series
N203E_CORE_ARCH_ABI = rv32emac ilp32e nuclei-200-series
N205_CORE_ARCH_ABI = rv32imac ilp32 nuclei-200-series
N205E_CORE_ARCH_ABI = rv32emac ilp32e nuclei-200-series
N300E_CORE_ARCH_ABI = rv32emac ilp32e nuclei-300-series
N300_CORE_ARCH_ABI = rv32imac ilp32 nuclei-300-series
N300F_CORE_ARCH_ABI = rv32imafc ilp32f nuclei-300-series
N300FD_CORE_ARCH_ABI = rv32imafdc ilp32d nuclei-300-series
N305_CORE_ARCH_ABI = rv32imac ilp32 nuclei-300-series
N307_CORE_ARCH_ABI = rv32imafc ilp32f nuclei-300-series
N307FD_CORE_ARCH_ABI = rv32imafdc ilp32d nuclei-300-series
N600_CORE_ARCH_ABI = rv32imac ilp32 nuclei-600-series
N600F_CORE_ARCH_ABI = rv32imafc ilp32f nuclei-600-series
N600FD_CORE_ARCH_ABI = rv32imafdc ilp32d nuclei-600-series
U600_CORE_ARCH_ABI = rv32imac ilp32 nuclei-600-series
U600F_CORE_ARCH_ABI = rv32imafc ilp32f nuclei-600-series
U600FD_CORE_ARCH_ABI = rv32imafdc ilp32d nuclei-600-series
NX600_CORE_ARCH_ABI = rv64imac lp64 nuclei-600-series
NX600F_CORE_ARCH_ABI = rv64imafc lp64f nuclei-600-series
NX600FD_CORE_ARCH_ABI = rv64imafdc lp64d nuclei-600-series
UX600_CORE_ARCH_ABI = rv64imac lp64 nuclei-600-series
UX600F_CORE_ARCH_ABI = rv64imafc lp64f nuclei-600-series
UX600FD_CORE_ARCH_ABI = rv64imafdc lp64d nuclei-600-series
N900_CORE_ARCH_ABI = rv32imac ilp32 nuclei-900-series
N900F_CORE_ARCH_ABI = rv32imafc ilp32f nuclei-900-series
N900FD_CORE_ARCH_ABI = rv32imafdc ilp32d nuclei-900-series
U900_CORE_ARCH_ABI = rv32imac ilp32 nuclei-900-series
U900F_CORE_ARCH_ABI = rv32imafc ilp32f nuclei-900-series
U900FD_CORE_ARCH_ABI = rv32imafdc ilp32d nuclei-900-series
NX900_CORE_ARCH_ABI = rv64imac lp64 nuclei-900-series
NX900F_CORE_ARCH_ABI = rv64imafc lp64f nuclei-900-series
NX900FD_CORE_ARCH_ABI = rv64imafdc lp64d nuclei-900-series
UX900_CORE_ARCH_ABI = rv64imac lp64 nuclei-900-series
UX900F_CORE_ARCH_ABI = rv64imafc lp64f nuclei-900-series
UX900FD_CORE_ARCH_ABI = rv64imafdc lp64d nuclei-900-series
NX1000_CORE_ARCH_ABI = rv64imac lp64 nuclei-1000-series
NX1000F_CORE_ARCH_ABI = rv64imafc lp64f nuclei-1000-series
NX1000FD_CORE_ARCH_ABI = rv64imafdc lp64d nuclei-1000-series
UX1000_CORE_ARCH_ABI = rv64imac lp64 nuclei-1000-series
UX1000F_CORE_ARCH_ABI = rv64imafc lp64f nuclei-1000-series
UX1000FD_CORE_ARCH_ABI = rv64imafdc lp64d nuclei-1000-series

最上面显示 CORE (ARCH + ABI), 用户可以自己选择并更改

然后下面选择支持的扩展

- Zc(可以单选下面内容)
  - Zca/Zcb/Zcmp/Zcmt(RV32 or RV64)
  - Zcf(RV32 only)
  - 如果选择了Zcmp或者Zcmt，则前面CORE里面的rv32imafdc里面的c就要去掉
  - rv32 + 不带f或者d 的情况下全选就是 _zca_zcb_zcmp_zcmt
  - rv32 + f 情况下全选就是 _zca_zcb_zcf_zcmp_zcmt
  - rv32 + fd 情况下全选就是 _zca_zcb_zcf_zcmp_zcmt
  - rv64 情况下就是 _zca_zcb_zcmp_zcmt
  - Xxlcz : Nuclei Customized XLCZ ISA Extension

- Bit-Manipulation (全选就是_zba_zbb_zbc_zbs)
  - "B" Extension for Bit Manipulation, Version 1.0.0 (zba+zbb+zbs) 选择这个就自动选中 zba + zbb + zbs
  - zba/zbb/zbc/zbs

- "CMO" Extensions for Base Cache Management Operation ISA, Version 1.0.0  只有300/600/900/1000可选
  - Zicbom: Cache-block management instructions.
  - Zicbop: Cache-block prefetch instructions.
  - Zicboz: Cache-block zero instructions

- Zicond, v1.0: Integer Conditional Operations Extension.

- Zibi, v0.6: Branch with Immediate Instructions, which appends conditional branch instructions with an immediate
operand. 只有300/600/900/1000可选

- Zmmul, v1.0: Integer Multiplication instructions
  只有在CORE是N100的情况下，且CORE里面没有M扩展，这个才显示出来，然后让用户可以选择 这个才可以选择 _zmmul

-  "Zihintpause" Extension for Pause Hint, Version 2.0 只有600/900/1000可选
   - _Zihintpause

- "Zihintntl" Extension for Non-Temporal Locality Hints, Version 1.0 只有600/900/1000可选
   - _Zihintntl

- "Zfh" and "Zfhmin" Extensions for Half-Precision Floating-Point, Version 1.0 选中这个就是 zfh 只有300/600/900/1000可选 依赖f扩展

  - zfh The Zfh extension depends on the single-precision floating-point extension
  - "Zfhmin" Standard Extension for Minimal Half-Precision Floating-Point 

- "Zfa" Extension for Additional Floating-Point Instructions, Version 1.0 :  The Zfa extension depends on the F extension 只有300/600/900/1000可选 依赖f扩展

- "BF16" Extensions for BFloat16-precision Floating-Point, Version 1.0 依赖 imaf 扩展 只有300/600/900/1000可选 依赖f扩展

   - Zfbfmin - Scalar BF16 Converts 依赖 f 扩展
   - Zvfbfmin - Vector BF16 Converts 依赖 Zve32f 扩展
   - Zvfbfwma - Vector BF16 widening mul-add  This extension depends upon the Zvfbfmin extension and the Zfbfmin extension.
   - Xxlfbf - Nuclei Customized BF16 extension 依赖 f 扩展 
   - Xxlvfbf - Nuclei Customized Vector BF16 extension 依赖 Zve32f 扩展

- "Zilsd", "Zclsd" Extensions for Load/Store pair for RV32, Version 1.0 : RV32 only 只有300/600/900/1000可选
  - Zilsd : _zilsd
  - zclsd : _zclsd 选择这个的时候 就不能带 zcf ， 那就意味着 rv32imafc + zclsd + zilsd -> rv32imaf_zilsd_zca_zclsd (不推荐)

- "Zimop" Extension for May-Be-Operations, Version 1.0  只有600/900/1000可选
  - "Zimop" Extension for May-Be-Operations, Version 1.0
  - "Zcmop" Compressed May-Be-Operations Extension, Version 1.0

- DSP Extension 依赖 im 扩展 只有300/600/900/1000可选
   - Xxldsp(Draft P extension)
   - Xxldspn1x(Xxldspn1x + Xxldsp)
   - Xxldspn2x(Xxldspn2x + Xxldspn1x)
   - Xxldspn3x(Xxldspn3x + Xxldspn2x)

- Scalar Crypto: 全选就是 _zk_zks 依赖 ima 扩展 只有600/900/1000可选

  - zbkb/zbkc/zbkx/zknd/zkne/zknh/zksed/zksh/zkr/zkt
  - zkn = zbkb/zbkc/zbkx/zknd/zkne/zknh
  - zks = zbkb/zbkcc/zbkx/zksed/zksh
  - Zk = zkn + zkr + zkt

- Vector Extension 依赖 ima 扩展 只有600/900/1000可选 帮他选择一个，选择规则如下描述
   - rv32 时选择这个 zve32x， rv32f/d的时候选择这个是 zve32f
   - rv64 时选择这个是 zve64x , rv64f的时候选择这个是 zve64f, rv64d的时候选择这个是 v
   - zve32x/zve32f/zve64x/zve64f/zve64d/v 用户可以单选其中一个或者不选
   - zvl128b/zvl256b/zvl512b/zvl1024b 用户可以单选其中一个也可以不选

- Vector Crypto Cryptography Extensions: Vector Instructions, Version 1.0 只有600/900/1000可选
   - 依赖vector扩展
   - 选择这个扩展的时候，需要注意下下面的规则
   - The Zvknhb and Zvbc Vector Crypto Extensions and accordingly the composite extensions Zvkn, Zvknc, Zvkng, and Zvksc -- depend on Zve64x.
   - All of the other Vector Crypto Extensions depend on Zve32x. 其他的扩展 >= zve32x 就可以选择
   - Zvbb - Vector Basic Bit-manipulation
   - Zvbc - Vector Carry-less Multiplication -> 依赖 >= zve64x 
   - Zvkb - Vector Cryptography Bit-manipulation
   - Zvkg - Vector GCM/GMAC
   - Zvkned - NIST Suite: Vector AES Block Cipher
   - Zvknh[ab] - NIST Suite: Vector SHA-2 Secure Hash
     - Zvknhb supports SHA-256 and SHA-512. Zvknhb 包含 Zvknha  -> 依赖 >= zve64x 
     - Zvknha supports only SHA-256. 
   - Zvksed - ShangMi Suite: SM4 Block Cipher 
   - Zvksh - ShangMi Suite: SM3 Secure Hash 

   - Zvkn - NIST Algorithm Suite = Zvkned + Zvknhb + Zvkb + Zvkt -> 依赖 >= zve64x 
   - Zvknc - NIST Algorithm Suite with carry-less multiply = Zvkn + Zvbc -> 依赖 >= zve64x 
   - Zvkng - NIST Algorithm Suite with GCM = = Zvkn + Zvkg -> 依赖 >= zve64x 
   - Zvks - ShangMi Algorithm Suite = Zvksed + Zvksh + Zvkb + Zvkt
   - Zvksc - ShangMi Algorithm Suite with carry-less multiplication = Zvks + Zvbc -> 依赖 >= zve64x 
   - Zvksg - ShangMi Algorithm Suite with GCM = Zvks + Zvkg
   - Zvkt - Vector Data-Independent Execution Latency

