# CPU Feature Selector Design Specification

This specification describes the requirements and technical design for the CPU Core and Extension Selector web application, which generates GCC `-march` and `-mabi` options for RISC-V targets.

## 1. Requirements & Core Logic

### 1.1 CPU Cores

50+ Nuclei cores across 100/200/300/600/900/1000 series. See `cpufeature.md` or `src/data/cores.ts` for the full list.

### 1.2 Extension Categories & Rules

#### C/Zc Compressed Instruction Extensions
- **C composite** (ext_c): C→Zca; C+F→Zcf(RV32); C+D→Zcd
- **Zce composite** (ext_zce): RV32→Zca+Zcb+Zcmp+Zcmt±Zcf; RV64→Zca+Zcb+Zcmp+Zcmt
- Sub-extensions: Zca, Zcb, Zcf (RV32+F), Zcd (D), Zcmp/Zcmt (exclusive with Zcd), Xxlcz
- `zcmp`/`zcmt` → strip `c` from base arch
- C with D → excludes Zcmp/Zcmt (per 29.1.4)
- Arch has `c` → Zca/Zcf/Zcd suppressed from march output

#### Bit-Manipulation
- B composite (zba+zbb+zbs), plus Zbc

#### CMO (600/900/1000 only)
- Zicbom, Zicbop, Zicboz

#### Zicond, Zibi (300/600/900/1000), Zmmul (N100 only)
- Zibi is standard extension, not custom

#### Zihint (600/900/1000 only)
- Zihintpause, Zihintntl

#### Zfinx+ (300/600/900 only)
- Zfinx, Zdinx (incl. Zfinx), Zhinx (incl. Zfinx+Zhinxmin), Zhinxmin (incl. Zfinx)
- Can be selected simultaneously; mutually exclusive with standard F/D/Zfa/BF16
- March folding: zdinx→zdinx, zhinx→zhinx, zhinxmin→zhinxmin, else zfinx

#### F16+Zfa (300/600/900/1000, depends on F)
- Zfhmin (prerequisite), Zfh (depends on Zfhmin), Zfa
- March: if Zfh selected → suppress Zfhmin output

#### BF16 (300/600/900/1000)
- Zfbfmin (depends F), Zvfbfmin (Vector≥zve32f), Zvfbfwma (depends on Zfbfmin+Zvfbfmin)
- Xxlfbf (depends F), Xxlvfbf (Vector≥zve32f)

#### Load/Store Pair (RV32, 300/600/900/1000)
- Zilsd, Zclsd (conflicts with Zcf)

#### May-Be-Operations (600/900/1000)
- Zimop, Zcmop

#### DSP (300/600/900/1000, depends M, single choice)
- Xxldsp, Xxldspn1x, Xxldspn2x, Xxldspn3x

#### Scalar Crypto (600/900/1000, depends A+M)
- Zk = Zkn+Zkr+Zkt, Zkn = Zbkb+Zbkc+Zbkx+Zknd+Zkne+Zknh, Zks = Zbkb+Zbkc+Zbkx+Zksed+Zksh
- March folding: `zk`+`zks`→`_zk_zks`, `zkn`+`zks`→`_zkn_zks`

#### Vector (600/900/1000, depends A+M)
- Single choice: Zve32x, Zve32f, Zve64x, Zve64f, Zve64d, V
- Zvl*: single choice of vector register length

#### Vector Crypto (600/900/1000, depends Vector)
- Sub-extensions: Zvbb, Zvbc, Zvkb, Zvkg, Zvkned, Zvknhb, Zvknha, Zvksed, Zvksh, Zvkt
- Composites: Zvkn, Zvknc, Zvkng, Zvks, Zvksc, Zvksg
- Zvknhb includes Zvknha; Zvkn/Zvbc/Zvknhb require Vector≥zve64x
- March: fold to highest matching composite (Zvknc preempts Zvkng preempts Zvkn)

---

## March String Assembly & Folding Rules

### Assembly Rules
1. **Base ISA letters**: `rv32`/`rv64` + `i`/`e`, `m`, `a`, `f`, `d`, `c`, `v` (sorted in standard single-letter order).
2. **Strip `c`**: If `zcmp` or `zcmt` is selected, remove `c` from base ISA letters.
3. **Append `v`**: If standard `v` vector extension is selected, append `v` directly to base ISA letters (e.g. `rv64imafdcv`).
4. **Multi-letter `z*` extensions**: Sorted alphabetically, except Zc extensions which follow the fixed order: `zca`, `zcb`, `zcf`, `zcd`, `zcmp`, `zcmt`.
5. **Custom `x*` extensions**: Sorted alphabetically and placed at the very end of the ISA string.
6. **C-implied suppression**: If base arch still contains `c` (not stripped), `zca`, `zcf`, and `zcd` are implicitly included by `c` and suppressed from the output string.

### Folding Rules (Composite Absorption)
- **DSP Folding**: If multiple `xxldsp*` levels are selected, output only the highest level (`xxldspn3x` > `xxldspn2x` > `xxldspn1x` > `xxldsp`).
- **Scalar Crypto Folding**:
  - Full `zk` + `zks` → output `_zk_zks` (suppresses all sub-extensions)
  - Full `zk` only → output `_zk` (plus remaining `zks` sub-extensions if any)
  - Full `zkn` + `zks` → output `_zkn_zks`
  - Full `zkn` only → output `_zkn`
  - Full `zks` only → output `_zks`
- **Vector Crypto Folding**:
  - Full `zvknc` (zvkn + zvbc) → output `_zvknc` (preempts zvkng/zvkn)
  - Full `zvkng` (zvkn + zvkg) → output `_zvkng` (preempts zvkn)
  - Full `zvkn` (zvkned + zvknhb + zvkb + zvkt) → output `_zvkn`
  - Full `zvksc` (zvks + zvbc) → output `_zvksc` (preempts zvksg/zvks)
  - Full `zvksg` (zvks + zvkg) → output `_zvksg` (preempts zvks)
  - Full `zvks` (zvksed + zvksh + zvkb + zvkt) → output `_zvks`
  - Sub-extension `zvknhb` includes `zvknha` → suppress `zvknha` when `zvknhb` is selected
- **Zfinx+ Folding**:
  - `ext_zdinx` selected → output `_zdinx` (absorbs `zfinx`)
  - `ext_zhinx` selected → output `_zhinx` (absorbs `zfinx` and `zhinxmin`)
  - `zhinxmin` selected (without zhinx) → output `_zhinxmin` (absorbs `zfinx`)
  - `zfinx` selected alone → output `_zfinx`
  - If multiple (e.g. `zdinx` + `zhinx`), both `_zdinx_zhinx` are output
- **Zfh Folding**:
  - If `zfh` is selected, suppress `zfhmin` from output (Zfh implies Zfhmin)
- **Zce Folding**:
  - `ext_zce` in UI expands to its sub-extensions (`zca`, `zcb`, `zcmp`, `zcmt` ± `zcf`), does NOT output `_zce` directly in march string.

---

## 2. March String Assembly

1. Base: `rv32`/`rv64` + letters sorted as i/e, m, a, f, d, c, v
2. Strip `c` if zcmp/zcmt selected
3. Append `v` to base if standard `v` selected
4. Zc extensions sorted: zca, zcb, zcf, zcd, zcmp, zcmt
5. Other z* sorted alphabetically, x* at end alphabetically
6. C-implied zca/zcf/zcd suppressed if arch has `c`

---

## 3. Architecture

Single-page React+TS app using Vite+Tailwind.

```
src/
├── data/cores.ts, extensions.ts
├── utils/marchBuilder.ts
├── components/CoreSelector.tsx, ExtensionGroup.tsx, ResultPanel.tsx
├── App.tsx
└── main.tsx
```

UI features:
- Light industrial design with three-column layout
- Sticky top bar: Core selector, category nav, clear button
- Scrollable extensions with compact 3-col grid
- Extension info popover with RISC-V spec links
- Multiple output formats: GCC, SDK, QEMU, XL CPU Model

---

## 4. Deploy

Deploy via `scripts/deploy_doc.sh` to `doc.corp.nucleisys.com/beta/cpuextsel` (beta) or `/tools/cpuextsel` (prod).