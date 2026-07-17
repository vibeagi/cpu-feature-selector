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