import { useState, useEffect } from 'react';
import type { CpuCore } from './data/cores';
import { NUCLEI_CORES } from './data/cores';
import { EXTENSIONS, EXTENSION_CATEGORIES } from './data/extensions';
import { CoreSelector } from './components/CoreSelector';
import { ExtensionGroup } from './components/ExtensionGroup';
import { ResultPanel } from './components/ResultPanel';
import { buildMarchString, isExtensionDisabled, getExtensionDisabledReason } from './utils/marchBuilder';
import { Cpu, RotateCcw } from 'lucide-react';

function App() {
  const defaultCore = NUCLEI_CORES.find(c => c.name === 'N300FD') || NUCLEI_CORES[0];
  const [selectedCore, setSelectedCore] = useState<CpuCore>(defaultCore);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set<string>());
  const [activeCategory, setActiveCategory] = useState<string>('zc');

  // Sync / validation run whenever selected core changes
  const handleSelectCore = (core: CpuCore) => {
    setSelectedCore(core);

    const nextSet = new Set<string>();

    for (const id of selectedIds) {
      const ext = EXTENSIONS.find(e => e.id === id);
      if (!ext) continue;

      const isCompat = ext.supportedSeries.length === 0 || ext.supportedSeries.includes(core.series);
      const isArchCompat = !ext.dependsOnArch || ext.dependsOnArch.every(char => core.arch.toLowerCase().includes(char));
      const isRV32Only = ['zcf', 'zilsd', 'zclsd'].includes(ext.id);
      const isRV32Compat = !isRV32Only || core.arch.toLowerCase().startsWith('rv32');

      if (isCompat && isArchCompat && isRV32Compat) {
        nextSet.add(id);
      }
    }

    // Auto-select C extension if core arch has 'c'
    if (core.arch.toLowerCase().includes('c')) {
      nextSet.add('ext_c');
    }

    setSelectedIds(syncCompositesAndConflicts(nextSet, core));
  };

  // Recursive helpers for composite selections
  const recursiveAdd = (id: string, set: Set<string>) => {
    set.add(id);
    const ext = EXTENSIONS.find(e => e.id === id);
    if (ext && ext.components) {
      ext.components.forEach(compId => {
        recursiveAdd(compId, set);
      });
    }
  };

  const recursiveDelete = (id: string, set: Set<string>) => {
    set.delete(id);
    const ext = EXTENSIONS.find(e => e.id === id);
    if (ext && ext.components) {
      ext.components.forEach(compId => {
        recursiveDelete(compId, set);
      });
    }
  };

  const syncCompositesAndConflicts = (currentSet: Set<string>, core: CpuCore): Set<string> => {
    const nextSet = new Set(currentSet);

    // 1. Handle Vector conflicts (only select at most one vector level)
    const vectorOptions = ['zve32x', 'zve32f', 'zve64x', 'zve64f', 'zve64d', 'v'];
    const activeVectors = Array.from(nextSet).filter(id => vectorOptions.includes(id));
    if (activeVectors.length > 1) {
      const toKeep = activeVectors[activeVectors.length - 1];
      vectorOptions.forEach(opt => {
        if (opt !== toKeep) nextSet.delete(opt);
      });
    }

    // 2. Handle Vector register length conflicts (only select at most one)
    const vlOptions = ['zvl128b', 'zvl256b', 'zvl512b', 'zvl1024b'];
    const activeVls = Array.from(nextSet).filter(id => vlOptions.includes(id));
    if (activeVls.length > 1) {
      const toKeep = activeVls[activeVls.length - 1];
      vlOptions.forEach(opt => {
        if (opt !== toKeep) nextSet.delete(opt);
      });
    }

    // 3. Handle DSP mutual exclusion (only select at most one level)
    const dspOptions = ['xxldsp', 'xxldspn1x', 'xxldspn2x', 'xxldspn3x'];
    const activeDsps = Array.from(nextSet).filter(id => dspOptions.includes(id));
    if (activeDsps.length > 1) {
      const toKeep = activeDsps[activeDsps.length - 1];
      dspOptions.forEach(opt => {
        if (opt !== toKeep) nextSet.delete(opt);
      });
    }

    // 3b. zcd vs zcmp/zcmt mutual exclusion
    if (nextSet.has('zcd') && (nextSet.has('zcmp') || nextSet.has('zcmt'))) {
      nextSet.delete('zcmp');
      nextSet.delete('zcmt');
    }

    // 3d. zcf vs zclsd mutual exclusion
    if (nextSet.has('zcf') && nextSet.has('zclsd')) {
      nextSet.delete('zclsd');
    }

    // 4. Run iterative composite check
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 5) {
      changed = false;
      iterations++;
      for (const ext of EXTENSIONS) {
        if (!ext.components || ext.components.length === 0) continue;

        // If the composite itself is checked, make sure all its components are checked
        if (nextSet.has(ext.id)) {
          // C composite: also conditionally add zcf (RV32+F) and zcd (D)
          if (ext.id === 'ext_c') {
            if (core.arch.toLowerCase().startsWith('rv32') && core.arch.toLowerCase().includes('f')) {
              if (!nextSet.has('zcf')) { nextSet.add('zcf'); changed = true; }
            }
            if (core.arch.toLowerCase().includes('d')) {
              if (!nextSet.has('zcd')) { nextSet.add('zcd'); changed = true; }
            }
          }
          // Zce composite: conditionally add zcf (RV32+F)
          if (ext.id === 'ext_zce') {
            if (core.arch.toLowerCase().startsWith('rv32') && core.arch.toLowerCase().includes('f')) {
              if (!nextSet.has('zcf')) { nextSet.add('zcf'); changed = true; }
            }
          }
          for (const compId of ext.components) {
            if (!nextSet.has(compId)) {
              nextSet.add(compId);
              changed = true;
            }
          }
        } else {
          // Skip auto-check for C/Zce composites (handled separately below)
          if (ext.id === 'ext_c' || ext.id === 'ext_zce') continue;

          // If all components are checked and NOT disabled, auto-check the composite
          const allCompSelected = ext.components.every(compId => {
            if (isExtensionDisabled(compId, nextSet, core)) return true; // ignore disabled deps
            return nextSet.has(compId);
          });

          const hasActiveComp = ext.components.some(compId => !isExtensionDisabled(compId, nextSet, core));

          if (allCompSelected && hasActiveComp) {
            nextSet.add(ext.id);
            changed = true;
          }
        }
      }
    }

    // 4b. C and Zce auto-check: if all applicable sub-extensions are selected, auto-check
    const arch = core.arch.toLowerCase();
    const rv32 = arch.startsWith('rv32');
    const hasF = arch.includes('f');
    const hasD = arch.includes('d');

    const canAutoCheckC = nextSet.has('zca') &&
      (!(rv32 && hasF) || nextSet.has('zcf')) &&
      (!hasD || nextSet.has('zcd')) &&
      !isExtensionDisabled('ext_c', nextSet, core);
    if (canAutoCheckC && !nextSet.has('ext_c')) {
      nextSet.add('ext_c');
    } else if (!canAutoCheckC && nextSet.has('ext_c')) {
      nextSet.delete('ext_c');
    }

    const canAutoCheckZce = nextSet.has('zca') && nextSet.has('zcb') &&
      nextSet.has('zcmp') && nextSet.has('zcmt') &&
      (!(rv32 && hasF) || nextSet.has('zcf')) &&
      !isExtensionDisabled('ext_zce', nextSet, core);
    if (canAutoCheckZce && !nextSet.has('ext_zce')) {
      nextSet.add('ext_zce');
    } else if (!canAutoCheckZce && nextSet.has('ext_zce')) {
      nextSet.delete('ext_zce');
    }

    // 5. Clean up disabled options from composite checks
    for (const extId of nextSet) {
      if (isExtensionDisabled(extId, nextSet, core)) {
        nextSet.delete(extId);
      }
    }

    return nextSet;
  };

  const handleToggleExtension = (id: string) => {
    const ext = EXTENSIONS.find(e => e.id === id);
    if (!ext) return;

    const nextSet = new Set(selectedIds);
    const isCurrentlyChecked = nextSet.has(id);

    if (isCurrentlyChecked) {
      // Recursive delete to fix composite cancellation bug
      recursiveDelete(id, nextSet);

      // Linkage: If we unchecked a component, uncheck any composite that depends on it
      let parentFound = true;
      while (parentFound) {
        parentFound = false;
        EXTENSIONS.forEach(parentExt => {
          if (parentExt.components && nextSet.has(parentExt.id)) {
            // Check if any required component is now missing from nextSet
            const anyMissing = parentExt.components.some(compId => !nextSet.has(compId));
            if (anyMissing) {
              nextSet.delete(parentExt.id);
              parentFound = true;
            }
          }
        });
      }
    } else {
      // Mutually exclusive: Vector levels
      const vectorOptions = ['zve32x', 'zve32f', 'zve64x', 'zve64f', 'zve64d', 'v'];
      if (vectorOptions.includes(id)) {
        vectorOptions.forEach(opt => nextSet.delete(opt));
      }

      // Mutually exclusive: Vector register lengths
      const vlOptions = ['zvl128b', 'zvl256b', 'zvl512b', 'zvl1024b'];
      if (vlOptions.includes(id)) {
        vlOptions.forEach(opt => nextSet.delete(opt));
      }

      // Mutually exclusive: DSP levels
      const dspOptions = ['xxldsp', 'xxldspn1x', 'xxldspn2x', 'xxldspn3x'];
      if (dspOptions.includes(id)) {
        dspOptions.forEach(opt => nextSet.delete(opt));
      }

      // C ↔ Zce mutual exclusion with conditional sub-extensions
      if (id === 'ext_c') {
        recursiveDelete('ext_zce', nextSet);
        const baseArch = selectedCore.arch.toLowerCase();
        if (baseArch.startsWith('rv32') && baseArch.includes('f')) nextSet.add('zcf');
        if (baseArch.includes('d')) nextSet.add('zcd');
      }
      if (id === 'ext_zce') {
        recursiveDelete('ext_c', nextSet);
        nextSet.delete('zcd');
        const baseArch = selectedCore.arch.toLowerCase();
        if (baseArch.startsWith('rv32') && baseArch.includes('f')) nextSet.add('zcf');
      }

      // Mutually exclusive conflicts: zcf vs zclsd
      if (id === 'zcf') {
        nextSet.delete('zclsd');
      } else if (id === 'zclsd') {
        nextSet.delete('zcf');
      }

      // zcd vs zcmp/zcmt (C+D implies Zcd, excludes Zcmp/Zcmt)
      if (id === 'zcd') {
        nextSet.delete('zcmp');
        nextSet.delete('zcmt');
      } else if (id === 'zcmp' || id === 'zcmt') {
        nextSet.delete('zcd');
      }

      // Recursive add to check all child components
      recursiveAdd(id, nextSet);
    }

    setSelectedIds(syncCompositesAndConflicts(nextSet, selectedCore));
  };

  // "全选分类" Action
  const handleSelectAllCategory = (catId: string) => {
    const nextSet = new Set(selectedIds);
    const exts = EXTENSIONS.filter(e => e.category === catId);
    exts.forEach(ext => {
      if (!isExtensionDisabled(ext.id, nextSet, selectedCore)) {
        recursiveAdd(ext.id, nextSet);
      }
    });
    setSelectedIds(syncCompositesAndConflicts(nextSet, selectedCore));
  };

  // "清除选中扩展" Action (keep C ext if core has it)
  const handleClearAll = () => {
    const nextSet = new Set<string>();
    if (selectedCore.arch.toLowerCase().includes('c')) nextSet.add('ext_c');
    setSelectedIds(syncCompositesAndConflicts(nextSet, selectedCore));
  };

  
  const handleReset = () => {
    setSelectedCore(defaultCore);
    const initialSet = new Set<string>();
    if (defaultCore.arch.toLowerCase().includes('c')) initialSet.add('ext_c');
    setSelectedIds(initialSet);
  };

  useEffect(() => {
    const initialSet = new Set<string>();
    if (defaultCore.arch.toLowerCase().includes('c')) initialSet.add('ext_c');
    setSelectedIds(initialSet);
  }, []);

  const { march, mabi, logs } = buildMarchString(selectedCore, selectedIds);

  const getSelectedCount = (catId: string) => {
    const exts = EXTENSIONS.filter(e => e.category === catId);
    return exts.filter(e => selectedIds.has(e.id) && !isExtensionDisabled(e.id, selectedIds, selectedCore)).length;
  };

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    const element = document.getElementById(`cat-${catId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* Top Engineering Grid Bar */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-full flex-shrink-0" />

      {/* FIXED TOP: Header + Core Selector + Category Nav (NEVER scrolls) */}
      <div className="flex-shrink-0">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white/85 backdrop-blur-md z-30 py-3 px-6 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 border border-indigo-200 p-1.5 rounded-lg text-indigo-600 shadow-sm flex items-center justify-center">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 m-0 leading-snug">
                  Nuclei RISC-V CPU 扩展选择器
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  选择 CPU Core 与支持的扩展，自动进行依赖校验、冲突解决与复合扩展折叠
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm self-start md:self-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>重置参数</span>
            </button>
          </div>
        </header>

        {/* Fixed Top Bar: Core Selector + Category Nav + Quick Actions */}
        <div className="border-b border-slate-200 bg-white shadow-sm z-20">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
            <div className="flex flex-col lg:flex-row lg:items-start gap-3">
              {/* Core Selector - compact horizontal bar */}
              <div className="flex-shrink-0 lg:w-64">
                <CoreSelector
                  selectedCore={selectedCore}
                  onSelectCore={handleSelectCore}
                />
              </div>

              {/* Category Navigation + Quick Actions */}
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                {/* Quick Actions Row */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors shadow-sm whitespace-nowrap"
                  >
                    清除选中扩展
                  </button>
                  <span className="text-[10px] text-slate-400">清除所有扩展勾选，仅保留 CORE 自带的 C 扩展</span>
                </div>

                {/* Category Nav Links */}
                <div className="flex flex-wrap gap-1 max-w-full">
                  {EXTENSION_CATEGORIES.map(cat => {
                    const count = getSelectedCount(cat.id);
                    const exts = EXTENSIONS.filter(e => e.category === cat.id);
                    const allDisabled = exts.every(ext => {
                      const reason = getExtensionDisabledReason(ext.id, selectedIds, selectedCore);
                      return reason?.includes('系列处理器') || (ext.id === 'zmmul' && selectedCore.series !== 'nuclei-100-series');
                    });
                    if (allDisabled) return null;
                    const isActive = activeCategory === cat.id;

                    return (
                      <button
                        key={cat.id}
                        onClick={() => scrollToCategory(cat.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors whitespace-nowrap ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
                        }`}
                      >
                        <span className="truncate max-w-[100px]">{cat.name}</span>
                        {count > 0 && (
                          <span className={`text-[9px] px-1 py-0.5 rounded-full font-bold ${
                            isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SCROLLABLE: Extensions Area + Fixed Results Panel */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Left: Extensions (scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <ExtensionGroup
              selectedCore={selectedCore}
              selectedIds={selectedIds}
              onToggleExtension={handleToggleExtension}
              onSelectAllCategory={handleSelectAllCategory}
            />
          </div>
        </div>

        {/* Right: Results Panel (fixed) */}
        <div className="w-[360px] flex-shrink-0 border-l border-slate-200 bg-white overflow-y-auto p-4 md:p-5">
          <div className="sticky top-4">
            <ResultPanel
              march={march}
              mabi={mabi}
              logs={logs}
              selectedCore={selectedCore}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-500 bg-white flex-shrink-0">
        <p>Nuclei CPU Feature Selector Console &copy; 2026. Made with Precision.</p>
      </footer>
    </div>
  );
}

export default App;
