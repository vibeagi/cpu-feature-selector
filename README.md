# Nuclei RISC-V CPU Feature Selector

A web-based interactive tool for selecting Nuclei RISC-V CPU cores and ISA extensions, generating GCC `-march` and `-mabi` compilation options with automatic dependency validation, conflict resolution, and composite extension folding.

**Live: [https://doc.corp.nucleisys.com/beta/cpuextsel](https://doc.corp.nucleisys.com/beta/cpuextsel)**

---

## Features

- **Comprehensive Core Database** — 50+ Nuclei CPU cores (100/200/300/600/900/1000 series), each with pre-configured base architecture and ABI
- **Visual Extension Selection** — All standard RISC-V extensions organized by category, with clear dependency and conflict indicators
- **Composite Extension Handling** — Automatic folding of composite extensions (Zk, Zkn, Zks, Zvkn, Zvknc, Zvkng, Zvks, Zvksc, Zvksg, Zce, etc.)
- **C/Zc Extension Rules** — Full implementation of ISA spec sections 29.1.2–29.1.10
- **Mutual Exclusion Handling** — Zcf↔Zclsd, Zfinx+↔standard F/D, DSP level single-selection
- **DSP Folding** — `xxldspn3x` absorbs lower levels
- **Zfinx+ Extensions** — Zfinx, Zdinx, Zhinx, Zhinxmin for FP in integer registers
- **Multi-platform Output** — GCC flags, Nuclei SDK Make Options, QEMU run command, XL CPU Model command
- **Extension Documentation** — Click the info icon to view official RISC-V spec links
- **Build Decision Log** — Transparent step-by-step explanation of all ISA string folding rules

---

## Supported Extension Categories

| Category | Extensions |
|---|---|
| **C/Zc** | C, Zce, Zca, Zcb, Zcf, Zcd, Zcmp, Zcmt, Xxlcz |
| **Bit-Manipulation** | B, Zba, Zbb, Zbc, Zbs |
| **CMO** (600/900/1000) | Zicbom, Zicbop, Zicboz |
| **Zicond** | Integer Conditional Operations |
| **Zibi** (300/600/900/1000) | Branch with Immediate |
| **Zmmul** (N100 only) | Integer Multiplication |
| **Zihint** (600/900/1000) | Pause Hint, Non-Temporal Hints |
| **Zfinx+** (300/600/900) | Zfinx, Zdinx, Zhinx, Zhinxmin |
| **F16+Zfa** | Zfh, Zfhmin, Zfa |
| **BF16** | Zfbfmin, Zvfbfmin, Zvfbfwma, Xxlfbf, Xxlvfbf |
| **Load/Store Pair** (RV32) | Zilsd, Zclsd |
| **May-Be-Operations** (600/900/1000) | Zimop, Zcmop |
| **DSP** (300/600/900/1000) | Xxldsp, Xxldspn1x/2x/3x |
| **Scalar Crypto** (600/900/1000) | Zk, Zkn, Zks, Zbkb, Zbkc, Zbkx, Zknd, Zkne, Zknh, Zksed, Zksh, Zkr, Zkt |
| **Vector** (600/900/1000) | Zve32x, Zve32f, Zve64x, Zve64f, Zve64d, V, Zvl* |
| **Vector Crypto** (600/900/1000) | Zvkn, Zvknc, Zvkng, Zvks, Zvksc, Zvksg, Zvbb, Zvbc, Zvkb, Zvkg, Zvkned, Zvknhb, Zvknha, Zvksed, Zvksh, Zvkt |

---

## Technology

- **Framework**: React 19 + TypeScript 6
- **Build**: Vite 8
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Testing**: Vitest

---

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run tests
npx vitest run

# Deploy to beta (doc.corp.nucleisys.com/beta/cpuextsel)
./scripts/deploy_doc.sh

# Deploy to production (doc.corp.nucleisys.com/tools/cpuextsel)
./scripts/deploy_doc.sh prod

# Deploy to official website via FTP (doc.nucleisys.com/tools/cpuextsel)
FTPUSER=xxx FTPPWD=yyy FTPSERVER=zzz ./scripts/deploy_doc.sh web

# Dry-run mode (preview build & deployment commands without changing anything)
./scripts/deploy_doc.sh web --dry-run
```

---

## Project Structure

```
src/
├── data/
│   ├── cores.ts            # All CPU core definitions
│   └── extensions.ts       # Extension metadata, dependencies, conflicts
├── utils/
│   └── marchBuilder.ts     # ISA string calculation & folding algorithms
├── components/
│   ├── CoreSelector.tsx    # CPU core selection dropdown
│   ├── ExtensionGroup.tsx  # Extension category cards with checkboxes
│   └── ResultPanel.tsx     # Output panels (GCC, SDK, QEMU, XL)
├── App.tsx                 # Root component with state management
└── main.tsx                # Entry point
scripts/
└── deploy_doc.sh           # Deployment to doc.corp.nucleisys.com
```

---

## Data Files

- `cpufeature.md` — Full architecture guide with all rules
- `extension.json` — Extension name/description/URL reference (83 entries)
- `cpufeature.json` — Raw RISC-V ISA extension metadata

---

## License

Internal tool — Nuclei RISC-V ecosystem.