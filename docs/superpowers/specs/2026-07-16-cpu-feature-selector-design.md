# CPU Feature Selector Design Specification

This specification describes the requirements and technical design for the CPU Core and Extension Selector web application, which generates GCC `-march` and `-mabi` options for RISC-V targets (specifically focusing on Nuclei RISC-V cores).

## 1. Requirements & Core Logic

### 1.1 CPU Cores Data Source
The application will support the Nuclei Core configurations parsed from `cpufeature.md`.
The complete list of cores, including their name, base architecture, ABI, and series, is as follows:

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

### 1.2 Extension Categorization & Support Rules

#### 1.2.1 Zc Extension Group
*   **Sub-extensions**: `zca`, `zcb`, `zcmp`, `zcmt` (for RV32 and RV64), `zcf` (for RV32 only).
*   **Custom extension**: `xxlcz` (Nuclei Customized XLCZ ISA Extension).
*   **Rules**:
    *   If `zcmp` or `zcmt` is checked, the single-character `c` extension MUST be removed from the base ISA string (e.g. `rv32imafc` -> `rv32imaf`).
    *   **Zc "All Select" Shortcut Logic**: Clicking Zc All Select will automatically toggle the relevant extensions based on the core's architecture:
        *   If `rv32` and lacks `f` or `d` (e.g. `rv32imc` or `rv32emc`): Selects `zca`, `zcb`, `zcmp`, `zcmt`.
        *   If `rv32` and has `f` or `d` (e.g. `rv32imafc` or `rv32imafdc`): Selects `zca`, `zcb`, `zcmp`, `zcmt`, `zcf`.
        *   If `rv64`: Selects `zca`, `zcb`, `zcmp`, `zcmt` (never selects `zcf`).

#### 1.2.2 Bit-Manipulation Extensions
*   **Sub-extensions**: `zba`, `zbb`, `zbc`, `zbs`.
*   **Composite Option**: `"B" Extension` (Bit-Manipulation v1.0.0).
    *   Checking "B" automatically checks `zba`, `zbb`, `zbs` (and vice-versa, selecting `zba`, `zbb`, `zbs` will check "B").
    *   `zbc` is selected separately.
*   **Output**: All selected items are appended individually (e.g., `_zba_zbb_zbc_zbs`).

#### 1.2.3 CMO (Cache Management Operations)
*   **Sub-extensions**: `zicbom`, `zicbop`, `zicboz`.
*   **Availability**: Only available for 300, 600, 900, and 1000 series cores.

#### 1.2.4 Zicond
*   **Sub-extensions**: `zicond` (Integer Conditional Operations v1.0).
*   **Availability**: Available for all cores.

#### 1.2.5 Zibi
*   **Sub-extensions**: `zibi` (Branch with Immediate Instructions v0.6).
*   **Availability**: Only available for 300, 600, 900, and 1000 series cores.

#### 1.2.6 Zmmul
*   **Sub-extensions**: `zmmul` (Integer Multiplication v1.0).
*   **Availability**: Displayed and selectable *only* if the core is in the **N100 series** AND the core's base architecture does not already contain the `m` extension (e.g., `N100` and `N100E`, which are `rv32ic` and `rv32ec`).

#### 1.2.7 Zihintpause
*   **Sub-extensions**: `zihintpause` (Pause Hint v2.0).
*   **Availability**: Only available for 600, 900, and 1000 series cores.

#### 1.2.8 Zihintntl
*   **Sub-extensions**: `zihintntl` (Non-Temporal Locality Hints v1.0).
*   **Availability**: Only available for 600, 900, and 1000 series cores.

#### 1.2.9 Zfh and Zfhmin
*   **Sub-extensions**: `zfh` (Half-precision float), `zfhmin` (Minimal half-precision).
*   **Availability**: Only available for 300, 600, 900, and 1000 series cores.
*   **Dependency**: Requires single-precision floating-point `f` (or double-precision `d`) to be present in the base architecture.

#### 1.2.10 Zfa
*   **Sub-extensions**: `zfa` (Additional Floating-Point Instructions v1.0).
*   **Availability**: Only available for 300, 600, 900, and 1000 series cores.
*   **Dependency**: Requires single-precision floating-point `f` (or double-precision `d`) to be present in the base architecture.

#### 1.2.11 BF16 (BFloat16 precision floating-point)
*   **Sub-extensions**:
    *   `zfbfmin` (Scalar BF16 converts) - depends on `f` extension.
    *   `zvfbfmin` (Vector BF16 converts) - depends on vector extension `>= zve32f`.
    *   `zvfbfwma` (Vector BF16 widening mul-add) - depends on both `zfbfmin` and `zvfbfmin` (hence both `f` and `>= zve32f`).
    *   `xxlfbf` (Nuclei Customized BF16) - depends on `f` extension.
    *   `xxlvfbf` (Nuclei Customized Vector BF16) - depends on vector extension `>= zve32f`.
*   **Availability**: Only available for 300, 600, 900, and 1000 series cores.

#### 1.2.12 Zilsd and Zclsd (Load/Store pair)
*   **Sub-extensions**:
    *   `zilsd` (Scalar Load/Store pair).
    *   `zclsd` (Compressed Load/Store pair).
*   **Availability**: Only available for 300, 600, 900, and 1000 series cores.
*   **Architecture Rule**: RV32 only.
*   **Mutual Exclusion**: `zclsd` conflicts with `zcf`. If `zclsd` is selected, `zcf` must not be included.
    *   *Example*: `rv32imafc` + `zclsd` + `zilsd` -> `rv32imaf_zilsd_zca_zclsd` (strips `c` and excludes `zcf` from Zc, uses `zca`).

#### 1.2.13 Zimop & Zcmop
*   **Sub-extensions**: `zimop` (May-Be-Operations v1.0), `zcmop` (Compressed May-Be-Operations v1.0).
*   **Availability**: Only available for 600, 900, and 1000 series cores.

#### 1.2.14 DSP Extension
*   **Sub-extensions**: `xxldsp` (Draft P extension), `xxldspn1x`, `xxldspn2x`, `xxldspn3x`.
*   **Availability**: Only available for 300, 600, 900, and 1000 series cores.
*   **Dependency**: Requires base architecture to contain `m`.
*   **Folding Rule**:
    *   `xxldspn3x` includes `xxldspn2x` + `xxldspn1x` + `xxldsp`.
    *   `xxldspn2x` includes `xxldspn1x` + `xxldsp`.
    *   `xxldspn1x` includes `xxldsp`.
    *   Output should only include the highest selected level (e.g. if `xxldspn3x` is selected, output `_xxldspn3x` and do not print the others).

#### 1.2.15 Scalar Crypto
*   **Availability**: Only available for 600, 900, and 1000 series cores.
*   **Dependency**: Requires base architecture to contain `a` and `m` (or `i`/`e` base with standard operations, effectively `ima` or `ema`).
*   **Sub-extensions**: `zbkb`, `zbkc`, `zbkx`, `zknd`, `zkne`, `zknh`, `zksed`, `zksh`, `zkr`, `zkt`.
*   **Composite mappings**:
    *   `zkn` = `zbkb` + `zbkc` + `zbkx` + `zknd` + `zkne` + `zknh`
    *   `zks` = `zbkb` + `zbkc` + `zbkx` + `zksed` + `zksh`
    *   `zk` = `zkn` + `zkr` + `zkt`
*   **Interactive linkage**:
    *   If user selects `zkn`, checking it will auto-select `zbkb`, `zbkc`, `zbkx`, `zknd`, `zkne`, `zknh`.
    *   If user selects `zks`, checking it will auto-select `zbkb`, `zbkc`, `zbkx`, `zksed`, `zksh`.
    *   If user selects `zk`, checking it will auto-select `zkn`, `zkr`, `zkt` (and thus their sub-extensions).
    *   If user manually selects all components of `zkn`, `zkn` should be marked as checked. Same for `zks` and `zk`.
*   **Output Folding Rules**:
    *   If both `zk` and `zks` are fully selected, output `_zk_zks` and omit all sub-extensions (`zbkb`, `zbkc`, `zbkx`, `zknd`, `zkne`, `zknh`, `zksed`, `zksh`, `zkr`, `zkt`).
    *   If `zk` is fully selected but not all of `zks` is selected (e.g., `zksh` is missing), output `_zk` plus any other individual selected extensions from `zks` (like `zksed`).
    *   If `zkn` and `zks` are both fully selected (but `zkr` or `zkt` is missing), output `_zkn_zks` and omit their sub-extensions.
    *   If only `zkn` is fully selected, output `_zkn` (plus any individually selected ones).
    *   If only `zks` is fully selected, output `_zks` (plus any individually selected ones).

#### 1.2.16 Vector Extensions
*   **Availability**: Only available for 600, 900, and 1000 series cores.
*   **Dependency**: Requires base architecture to contain `a` and `m` (effectively `ima` or `ema`).
*   **Selection**: At most one from `zve32x`, `zve32f`, `zve64x`, `zve64f`, `zve64d`, `v` (or none).
*   **Default recommendation rules** (auto-selected when core changes, but user can change):
    *   For RV32 core:
        *   If base arch lacks `f` and `d` (e.g. `rv32imac`): default to `zve32x`.
        *   If base arch has `f` or `d` (e.g. `rv32imafc`): default to `zve32f`.
    *   For RV64 core:
        *   If base arch lacks `f` and `d` (e.g. `rv64imac`): default to `zve64x`.
        *   If base arch has `f` but lacks `d` (e.g. `rv64imafc`): default to `zve64f`.
        *   If base arch has `d` (e.g. `rv64imafdc`): default to `v`.
*   **Vector Register Length**: At most one from `zvl128b`, `zvl256b`, `zvl512b`, `zvl1024b` (or none).

#### 1.2.17 Vector Crypto
*   **Availability**: Only available for 600, 900, and 1000 series cores.
*   **Dependency**: Requires a Vector extension to be selected.
*   **Sub-extensions**: `zvbb`, `zvbc`, `zvkb`, `zvkg`, `zvkned`, `zvknhb`, `zvknha`, `zvksed`, `zvksh`, `zvkt`.
*   **Specific Dependencies**:
    *   `zvknhb` and `zvbc` depend on a Vector extension of at least `zve64x` (i.e. `zve64x`, `zve64f`, `zve64d`, or `v`).
    *   All other Vector Crypto extensions depend on at least `zve32x` (i.e. any Vector extension).
*   **Composite definitions**:
    *   `zvkn` = `zvkned` + `zvknhb` + `zvkb` + `zvkt` (depends on `>= zve64x`)
    *   `zvknc` = `zvkn` + `zvbc` (depends on `>= zve64x`)
    *   `zvkng` = `zvkn` + `zvkg` (depends on `>= zve64x`)
    *   `zvks` = `zvksed` + `zvksh` + `zvkb` + `zvkt` (depends on `>= zve32x`)
    *   `zvksc` = `zvks` + `zvbc` (depends on `>= zve64x`)
    *   `zvksg` = `zvks` + `zvkg` (depends on `>= zve32x`)
*   **Interactive linkage**:
    *   Selecting a composite automatically checks all its sub-extensions.
    *   Manually checking all sub-extensions of a composite automatically checks the composite.
*   **Output Folding Rules**:
    *   Fold to `_zvknc` if all its components are selected.
    *   Fold to `_zvkng` if all its components are selected.
    *   Fold to `_zvkn` if all its components are selected.
    *   Fold to `_zvksc` if all its components are selected.
    *   Fold to `_zvksg` if all its components are selected.
    *   Fold to `_zvks` if all its components are selected.
    *   Remaining selected sub-extensions are printed individually.

---

## 2. Compilation Rules (GCC `-march` Assembly)

The final generated `-march` string must follow RISC-V conventions:

1.  **Base ISA**: Start with `rv32` or `rv64`.
2.  **Base Core letters**: Single character extensions `e` or `i` followed by `m`, `a`, `f`, `d`, `c`, `v` (if applicable).
    *   **Sorting**: Standard order is `i` (or `e`), `m`, `a`, `f`, `d`, `c`, `v`.
    *   **Strip 'c'**: If `zcmp` or `zcmt` is checked, remove `c`.
    *   **Append 'v'**: If the Vector extension `v` is selected, append `v` directly to these base letters.
3.  **Multi-character extensions**:
    *   Prefix each with `_`.
    *   Standard standard extensions (`z*` e.g., `zba`, `zbb`, `zla`, etc.) are sorted **alphabetically**.
    *   Non-standard/custom extensions (`x*` e.g., `xxldsp`, `xxlfbf`) are sorted **alphabetically** and placed **at the very end** of the ISA string.
    *   *Example formatting*: `rv32imaf_zba_zbb_zbc_zbs_zca_zcb_zcmp_zcmt_xxldspn3x`

---

## 3. Architecture & Code Structure

The application will be built as a frontend-only SPA using **Vite + React + TypeScript + Tailwind CSS**.

### 3.1 Project Layout

```
src/
├── data/
│   ├── cores.ts          # Core definitions parsed from cpufeature.md
│   └── extensions.ts     # Metadata of all extensions, dependencies, descriptions
├── utils/
│   └── marchBuilder.ts   # Core ISA string calculation & folding algorithms
├── components/
│   ├── CoreSelector.tsx  # Core lists, search, selection dropdown/grid
│   ├── ExtensionGroup.tsx# Renders groups of extensions with dependency validation
│   └── ResultPanel.tsx   # Displays -march, -mabi, logs/explanations, copy button
├── App.tsx               # Root component tying state, layouts, and rules together
└── main.tsx              # Application entrypoint
```

### 3.2 Key Algorithms

#### 3.2.1 Dependency Check
A helper function `isExtensionDisabled(ext, selectedExts, core)` will run reactively:
*   Checks if the core series supports the extension (e.g. CMO only for series >= 300).
*   Checks if architectural prerequisites are met (e.g. Zfh requires `f` or `d` in the base arch).
*   Checks if parent extension requirements are met (e.g. Vector Crypto requires a Vector extension).
*   Returns `boolean` and a descriptive reason if disabled.

#### 3.2.2 Output Builder & Folding
A function `buildMarchString(core, selectedExts)`:
1.  Initialize base letters from `core.arch` (e.g., `['i', 'm', 'a', 'c']`).
2.  If `zcmp` or `zcmt` is selected, remove `c` from base letters.
3.  If vector `v` is selected, add `v` to base letters. (Other vector extensions like `zve32x` are handled as multi-letter extensions).
4.  Form base arch string: `rv32` or `rv64` + base letters in order `i/e, m, a, f, d, c, v`.
5.  Filter selected multi-character extensions.
6.  Apply **Scalar Crypto folding**:
    *   If all components of `zk` and `zks` are present: replace with `zk`, `zks`.
    *   If all components of `zkn` and `zks` are present: replace with `zkn`, `zks`.
    *   If only `zkn` is present: replace with `zkn`.
    *   If only `zks` is present: replace with `zks`.
7.  Apply **DSP folding**:
    *   Keep only the highest selected `xxldsp*` extension.
8.  Apply **Vector Crypto folding**:
    *   If components of `zvknc` are present: replace with `zvknc`.
    *   If components of `zvkng` are present: replace with `zvkng`.
    *   If components of `zvkn` are present: replace with `zvkn`.
    *   If components of `zvksc` are present: replace with `zvksc`.
    *   If components of `zvksg` are present: replace with `zvksg`.
    *   If components of `zvks` are present: replace with `zvks`.
9.  Separate standard `z` extensions and custom `x` extensions.
10. Sort `z` extensions alphabetically. Sort `x` extensions alphabetically.
11. Assemble final string: `base_arch` + `_` + standard extensions joined by `_` + `_` + custom extensions joined by `_`.

---

## 4. UI/UX Design

The application will feature a modern, responsive, developer-friendly dashboard with:
*   **Dark Mode by default** (sleek dark palette matching terminal themes).
*   **Searchable Core List**: Fast search inputs and series filters (100, 200, 300, etc.).
*   **Clean Group Cards**: Card layout for each extension category with badges showing dependencies.
*   **Interactive Tooltips**: Detailed explanations of what each extension does when hovered.
*   **Real-time Output Box**: Bold, code-highlighted display of:
    *   `-march=...`
    *   `-mabi=...`
*   **Step-by-Step Rule Log**: A collapsible terminal-like panel showing how the final string was calculated (e.g. `[Info] Stripped 'c' because 'zcmp' is selected`, `[Info] Folded scalar crypto to _zk_zks`).
