# Nuclei RISC-V CPU Feature Selector Architecture Guide

## CORE Definitions

Format: `CORE_NAME = arch abi series`

| Core Name | Base Arch | Default ABI | Series |
|---|---|---|---|
| N100E | rv32ec | ilp32e | nuclei-100-series |
| N100EM | rv32emc | ilp32e | nuclei-100-series |
| N100 | rv32ic | ilp32 | nuclei-100-series |
| N100M | rv32imc | ilp32 | nuclei-100-series |
| N200 | rv32imc | ilp32 | nuclei-200-series |
| N200E | rv32emc | ilp32e | nuclei-200-series |
| N201 | rv32iac | ilp32 | nuclei-200-series |
| N201E | rv32eac | ilp32e | nuclei-200-series |
| N202 | rv32ic | ilp32 | nuclei-200-series |
| N202E | rv32ec | ilp32e | nuclei-200-series |
| N203 | rv32imac | ilp32 | nuclei-200-series |
| N203E | rv32emac | ilp32e | nuclei-200-series |
| N205 | rv32imac | ilp32 | nuclei-200-series |
| N205E | rv32emac | ilp32e | nuclei-200-series |
| N300E | rv32emac | ilp32e | nuclei-300-series |
| N300 | rv32imac | ilp32 | nuclei-300-series |
| N300F | rv32imafc | ilp32f | nuclei-300-series |
| N300FD | rv32imafdc | ilp32d | nuclei-300-series |
| N305 | rv32imac | ilp32 | nuclei-300-series |
| N307 | rv32imafc | ilp32f | nuclei-300-series |
| N307FD | rv32imafdc | ilp32d | nuclei-300-series |
| N600 | rv32imac | ilp32 | nuclei-600-series |
| N600F | rv32imafc | ilp32f | nuclei-600-series |
| N600FD | rv32imafdc | ilp32d | nuclei-600-series |
| U600 | rv32imac | ilp32 | nuclei-600-series |
| U600F | rv32imafc | ilp32f | nuclei-600-series |
| U600FD | rv32imafdc | ilp32d | nuclei-600-series |
| NX600 | rv64imac | lp64 | nuclei-600-series |
| NX600F | rv64imafc | lp64f | nuclei-600-series |
| NX600FD | rv64imafdc | lp64d | nuclei-600-series |
| UX600 | rv64imac | lp64 | nuclei-600-series |
| UX600F | rv64imafc | lp64f | nuclei-600-series |
| UX600FD | rv64imafdc | lp64d | nuclei-600-series |
| N900 | rv32imac | ilp32 | nuclei-900-series |
| N900F | rv32imafc | ilp32f | nuclei-900-series |
| N900FD | rv32imafdc | ilp32d | nuclei-900-series |
| U900 | rv32imac | ilp32 | nuclei-900-series |
| U900F | rv32imafc | ilp32f | nuclei-900-series |
| U900FD | rv32imafdc | ilp32d | nuclei-900-series |
| NX900 | rv64imac | lp64 | nuclei-900-series |
| NX900F | rv64imafc | lp64f | nuclei-900-series |
| NX900FD | rv64imafdc | lp64d | nuclei-900-series |
| UX900 | rv64imac | lp64 | nuclei-900-series |
| UX900F | rv64imafc | lp64f | nuclei-900-series |
| UX900FD | rv64imafdc | lp64d | nuclei-900-series |
| NX1000 | rv64imac | lp64 | nuclei-1000-series |
| NX1000F | rv64imafc | lp64f | nuclei-1000-series |
| NX1000FD | rv64imafdc | lp64d | nuclei-1000-series |
| UX1000 | rv64imac | lp64 | nuclei-1000-series |
| UX1000F | rv64imafc | lp64f | nuclei-1000-series |
| UX1000FD | rv64imafdc | lp64d | nuclei-1000-series |

---

## Extension Categories & Rules

### 1. C/Zc 压缩指令扩展

**Composites (user-managed, manual toggle only):**
- `C 扩展` (ext_c): C always implies Zca; C+F→Zcf(RV32); C+D→Zcd
- `Zce 扩展` (ext_zce): RV32: Zca+Zcb+Zcmp+Zcmt±Zcf; RV64: Zca+Zcb+Zcmp+Zcmt

**Sub-extensions:**
- `zca` — Zc Base compressed instructions for integer (implied by C)
- `zcb` — Zc additional simple compressed instructions (depends on Zca)
- `zcf` — RV32 float load/store compressed (implied by C+F on RV32, conflicts with Zclsd)
- `zcd` — Double-precision float load/store compressed (implied by C+D, conflicts with Zcmp/Zcmt)
- `zcmp` — Push/pop and double move compressed (depends on Zca, conflicts with Zcd)
- `zcmt` — Table jump compressed (depends on Zca, conflicts with Zcd)
- `xxlcz` — Nuclei Customized XLCZ ISA Extension (200/300/600/900 series)

**Rules:**
- `zcmp`/`zcmt` selected → strip `c` from base arch letters
- C ↔ Zce mutual exclusion (user-switched)
- C with D → excludes Zcmp/Zcmt (per 29.1.4)
- Base arch has `c` → `zca`/`zcf`/`zcd` suppressed from march output

**March output Zc sort order:** `zca`, `zcb`, `zcf`, `zcd`, `zcmp`, `zcmt`

**Display order:** C, Zce, Zca, Zcb, Zcf, Zcd, Zcmp, Zcmt, Xxlcz

### 2. Bit-Manipulation 位操作扩展

- `B 扩展` (ext_b): composite of zba+zbb+zbs
- `zba`, `zbb`, `zbc`, `zbs`

### 3. CMO 缓存管理扩展 (600/900/1000 only)

- `zicbom`, `zicbop`, `zicboz`

### 4. Zicond 条件操作扩展

- `zicond`

### 5. Zibi 立即数分支扩展 (300/600/900/1000)

- `zibi` (standard extension, not custom)

### 6. Zmmul 乘法扩展 (N100 series only, without M)

- `zmmul` — only visible when core is N100 series and arch has no `m`

### 7. Zihint 提示扩展 (600/900/1000 only)

- `zihintpause`, `zihintntl`

### 8. Zfinx+ 整型寄存器浮点扩展 (300/600/900 only)

- `zfinx` — Single-precision float in integer registers
- `zdinx` (ext_zdinx) — Double-precision (includes Zfinx)
- `zhinx` (ext_zhinx) — Half-precision (includes Zfinx+Zhinxmin)
- `zhinxmin` — Minimal half-precision (includes Zfinx)

**Rules:**
- Can be selected simultaneously (e.g. zdinx + zhinx)
- Mutually exclusive with standard F/D/Zfa/BF16
- March folding: `zdinx` absorbs `zfinx`; `zhinx` absorbs `zfinx`+`zhinxmin`

### 9. F16+Zfa 浮点与半精度扩展

- `zfh` — Standard Half-Precision Floating-Point (includes Zfhmin)
- `zfhmin` — Minimal Half-Precision Floating-Point
- `zfa` — Additional Floating-Point Instructions

**Rules:**
- All depend on `f` extension
- Only 300/600/900/1000 series

### 10. BF16 浮点扩展

- `zfbfmin` — Scalar BF16 Converts (depends on F)
- `zvfbfmin` — Vector BF16 Converts (requires Vector with float: zve32f/zve64f/zve64d/v)
- `zvfbfwma` — Vector BF16 widening mul-add (depends on Zfbfmin + Zvfbfmin)
- `xxlfbf` — Nuclei Customized BF16 (depends on F)
- `xxlvfbf` — Nuclei Customized Vector BF16 (requires Vector with float: zve32f/zve64f/zve64d/v)

### 11. Load/Store Pair (RV32 only, 300/600/900/1000)

- `zilsd`, `zclsd` (Zclsd conflicts with Zcf)

### 12. May-Be-Operations 扩展 (600/900/1000 only)

- `zimop`, `zcmop`

### 13. DSP 扩展 (300/600/900/1000, depends on M, mutually exclusive levels)

- `xxldsp`, `xxldspn1x`, `xxldspn2x`, `xxldspn3x`
- Only one level at a time; march output folds to the highest

### 14. Scalar Crypto 标量加密扩展 (600/900/1000, depends on A+M)

**Composites:**
- `Zk 组合` = Zkn + Zkr + Zkt
- `Zkn 组合` = Zbkb + Zbkc + Zbkx + Zknd + Zkne + Zknh
- `Zks 组合` = Zbkb + Zbkc + Zbkx + Zksed + Zksh

**Sub-extensions:** `zbkb`, `zbkc`, `zbkx`, `zknd`, `zkne`, `zknh`, `zksed`, `zksh`, `zkr`, `zkt`

**March folding:** Full `zk` + `zks` → `_zk_zks`; `zkn` + `zks` → `_zkn_zks`

### 15. Vector 向量扩展 (600/900/1000, depends on A+M)

**Vector levels (single choice):** `zve32x`, `zve32f`, `zve64x`, `zve64f`, `zve64d`, `v`

**Vector register lengths (single choice):** `zvl128b`, `zvl256b`, `zvl512b`, `zvl1024b`

### 16. Vector Crypto 向量加密扩展 (600/900/1000, depends on Vector)

**Composites:**
- `Zvknc 组合` = Zvkn + Zvbc
- `Zvkng 组合` = Zvkn + Zvkg
- `Zvkn 组合` = Zvkned + Zvknhb + Zvkb + Zvkt
- `Zvksc 组合` = Zvks + Zvbc
- `Zvksg 组合` = Zvks + Zvkg
- `Zvks 组合` = Zvksed + Zvksh + Zvkb + Zvkt

**Zvknhb** includes Zvknha.

**Dependencies:**
- Zvknhb, Zvbc, and composites Zvkn/Zvknc/Zvkng/Zvksc require Vector >= zve64x
- Others require Vector >= zve32x

---

## March String Assembly Rules

1. Base ISA letters: `rv32`/`rv64` + `i`/`e`, `m`, `a`, `f`, `d`, `c`, `v` (sorted)
2. Strip `c` if `zcmp`/`zcmt` selected
3. Append `v` to base letters if standard `v` selected
4. Multi-letter `z*` extensions alphabetically sorted (Zc special order)
5. Custom `x*` extensions sorted alphabetically at the end
6. C-implied `zca`/`zcf`/`zcd` suppressed from output if arch has `c`

---

## Output Sections

### GCC Options
- `-march=...` (base arch + _z* + _x*)
- `-mabi=...` (core default ABI)
- `-mtune=...` (core series)

### Nuclei SDK Make Options
- `CORE=xxx ARCH_EXT=_yyy`

### QEMU Run Command
- `qemu-system-riscv64/32 -M nuclei_evalsoc,download=ilm -cpu nuclei-xxx,ext=yyy -smp 1 ... -kernel appilm.elf`
- zvl* selected → `,vlen=128` appended to cpu arg

### XL CPU Model Command
- `xl_cpumodel -M nuclei_evalsoc --cpu=xxx --download=ilm --ext=yyy --smp=1 appilm.elf`
- zvl* selected → `--varch=vlen:256` before `--smp=1`