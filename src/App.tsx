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

  // Recommend vector option based on core changes
  const recommendVector = (core: CpuCore): string | null => {
    const baseArch = core.arch.toLowerCase();
    const isRV32 = baseArch.startsWith('rv32');
    const isRV64 = baseArch.startsWith('rv64');
    const hasF = baseArch.includes('f');
    const hasD = baseArch.includes('d');

    if (core.series === 'nuclei-100-series' || core.series === 'nuclei-200-series') {
      return null;
    }

    if (isRV32) {
      return hasF || hasD ? 'zve32f' : 'zve32x';
    } else if (isRV64) {
      if (hasD) return 'v';
      if (hasF) return 'zve64f';
      return 'zve64x';
    }
    return null;
  };

  // Sync / validation run whenever selected core changes
  const handleSelectCore = (core: CpuCore) => {
    setSelectedCore(core);

    const nextSet = new Set<string>();
    const recVec = recommendVector(core);

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

    if (recVec) {
      const vectorOptions = ['zve32x', 'zve32f', 'zve64x', 'zve64f', 'zve64d', 'v'];
      vectorOptions.forEach(opt => nextSet.delete(opt));
      nextSet.add(recVec);
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
          for (const compId of ext.components) {
            if (!nextSet.has(compId)) {
              nextSet.add(compId);
              changed = true;
            }
          }
        } else {
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

      // Mutually exclusive conflicts: zcf vs zclsd
      if (id === 'zcf') {
        nextSet.delete('zclsd');
      } else if (id === 'zclsd') {
        nextSet.delete('zcf');
      }

      // Recursive add to check all child components
      recursiveAdd(id, nextSet);
    }

    setSelectedIds(syncCompositesAndConflicts(nextSet, selectedCore));
  };

  // Shortcut for Zc All Select
  const handleZcAllSelect = () => {
    const nextSet = new Set(selectedIds);
    const baseArch = selectedCore.arch.toLowerCase();
    const isRV32 = baseArch.startsWith('rv32');
    const hasF = baseArch.includes('f');
    const hasD = baseArch.includes('d');

    nextSet.delete('zclsd');

    nextSet.add('zca');
    nextSet.add('zcb');
    nextSet.add('zcmp');
    nextSet.add('zcmt');

    if (isRV32 && (hasF || hasD)) {
      nextSet.add('zcf');
    } else {
      nextSet.delete('zcf');
    }

    setSelectedIds(syncCompositesAndConflicts(nextSet, selectedCore));
  };

  // Shortcut for Zc Clear
  const handleZcClear = () => {
    const nextSet = new Set(selectedIds);
    nextSet.delete('zca');
    nextSet.delete('zcb');
    nextSet.delete('zcmp');
    nextSet.delete('zcmt');
    nextSet.delete('zcf');
    nextSet.delete('xxlcz');

    setSelectedIds(syncCompositesAndConflicts(nextSet, selectedCore));
  };

  // "全选兼容组合" Action
  const handleSelectAllCompatibleComposites = () => {
    const nextSet = new Set(selectedIds);

    // We scan all composites (except zk+zks full package to let individual zk/zks form, or we can check zk_zks directly)
    // Find all composites that are compatible
    const composites = EXTENSIONS.filter(ext => ext.isComposite);

    composites.forEach(comp => {
      // Check if this composite is disabled
      const reason = isExtensionDisabled(comp.id, nextSet, selectedCore);
      if (!reason) {
        // If compatible, recursively add all its components
        recursiveAdd(comp.id, nextSet);
      }
    });

    setSelectedIds(syncCompositesAndConflicts(nextSet, selectedCore));
  };

  const handleReset = () => {
    setSelectedCore(defaultCore);
    const initialSet = new Set<string>();
    const recVec = recommendVector(defaultCore);
    if (recVec) initialSet.add(recVec);
    setSelectedIds(initialSet);
  };

  useEffect(() => {
    const initialSet = new Set<string>();
    const recVec = recommendVector(defaultCore);
    if (recVec) initialSet.add(recVec);
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased selection:bg-indigo-150">
      {/* Top Engineering Grid Bar */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-full" />

      {/* Header */}
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur-md sticky top-0 z-30 py-4 px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 border border-indigo-200 p-2 rounded-lg text-indigo-600 shadow-sm">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 m-0 leading-tight">
                Nuclei RISC-V 编译参数生成器
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                高密度的亮色极简工业控制台，支持自动依赖校验、互斥与折叠规则。
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm self-start md:self-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>重置参数</span>
          </button>
        </div>
      </header>

      {/* Three-Column Grid Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Column 1: Left Navigation & Action Panel (1/4 width) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Core Selector */}
          <CoreSelector
            selectedCore={selectedCore}
            onSelectCore={handleSelectCore}
          />

          {/* Quick Actions Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">快捷指令集操作</h3>
            <button
              onClick={handleSelectAllCompatibleComposites}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm"
            >
              一键全选兼容组合扩展
            </button>
            <p className="text-[10px] text-slate-500 leading-normal text-center">
              将自动扫描并勾选所有当前 Core 支持的组合扩展（如 B 扩展、Zk、Zvkn 等）。
            </p>
          </div>

          {/* Category Quick Scroll Links */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">扩展分类导航</h3>
            <div className="space-y-1">
              {EXTENSION_CATEGORIES.map(cat => {
                const count = getSelectedCount(cat.id);
                // Hide if unsupported on current series
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
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-600 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{cat.name.split(' ')[0]}</span>
                    {count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
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

        {/* Column 2 & 3: Center Extensions Control Panel (2/4 width) */}
        <div className="lg:col-span-2">
          <ExtensionGroup
            selectedCore={selectedCore}
            selectedIds={selectedIds}
            onToggleExtension={handleToggleExtension}
            onZcAllSelect={handleZcAllSelect}
            onZcClear={handleZcClear}
          />
        </div>

        {/* Column 4: Right Output & Log Panel (1/4 width) */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <ResultPanel
              march={march}
              mabi={mabi}
              logs={logs}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-500 bg-white">
        <p>Nuclei CPU Feature Selector Console © 2026. Made with Precision.</p>
      </footer>
    </div>
  );
}

export default App;
