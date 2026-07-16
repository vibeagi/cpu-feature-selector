import { useState, useEffect } from 'react';
import type { CpuCore } from './data/cores';
import { NUCLEI_CORES } from './data/cores';
import { EXTENSIONS } from './data/extensions';
import { CoreSelector } from './components/CoreSelector';
import { ExtensionGroup } from './components/ExtensionGroup';
import { ResultPanel } from './components/ResultPanel';
import { buildMarchString, isExtensionDisabled } from './utils/marchBuilder';
import { Cpu, RotateCcw } from 'lucide-react';

function App() {
  // Default to N300FD
  const defaultCore = NUCLEI_CORES.find(c => c.name === 'N300FD') || NUCLEI_CORES[0];
  const [selectedCore, setSelectedCore] = useState<CpuCore>(defaultCore);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set<string>());

  // Recommendations for vector based on core changes
  const recommendVector = (core: CpuCore): string | null => {
    const baseArch = core.arch.toLowerCase();
    const isRV32 = baseArch.startsWith('rv32');
    const isRV64 = baseArch.startsWith('rv64');
    const hasF = baseArch.includes('f');
    const hasD = baseArch.includes('d');

    if (core.series === 'nuclei-100-series' || core.series === 'nuclei-200-series') {
      return null; // 100 and 200 series don't support vector
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

    // Filter out invalid/unsupported extensions for the new core
    const nextSet = new Set<string>();
    const recVec = recommendVector(core);

    for (const id of selectedIds) {
      const ext = EXTENSIONS.find(e => e.id === id);
      if (!ext) continue;

      // Temporarily check if it's disabled on the new core (disregarding other selections for now)
      // Since it's a new core, we check if it is compatible with the new core's series/arch
      const isCompat = ext.supportedSeries.length === 0 || ext.supportedSeries.includes(core.series);
      const isArchCompat = !ext.dependsOnArch || ext.dependsOnArch.every(char => core.arch.toLowerCase().includes(char));
      const isRV32Only = ['zcf', 'zilsd', 'zclsd'].includes(ext.id);
      const isRV32Compat = !isRV32Only || core.arch.toLowerCase().startsWith('rv32');

      if (isCompat && isArchCompat && isRV32Compat) {
        nextSet.add(id);
      }
    }

    // Auto-recommend a vector extension if vector is supported on the new core
    if (recVec) {
      // Remove any existing vector choice
      const vectorOptions = ['zve32x', 'zve32f', 'zve64x', 'zve64f', 'zve64d', 'v'];
      vectorOptions.forEach(opt => nextSet.delete(opt));
      // Add recommended one
      nextSet.add(recVec);
    }

    // Resolve composites and conflicts on the updated set
    setSelectedIds(syncCompositesAndConflicts(nextSet, core));
  };

  // Resolve composites, dependency linkages, and conflict resolutions
  const syncCompositesAndConflicts = (currentSet: Set<string>, core: CpuCore): Set<string> => {
    const nextSet = new Set(currentSet);

    // 1. Handle Vector conflicts (only select at most one vector level)
    const vectorOptions = ['zve32x', 'zve32f', 'zve64x', 'zve64f', 'zve64d', 'v'];
    const activeVectors = Array.from(nextSet).filter(id => vectorOptions.includes(id));
    if (activeVectors.length > 1) {
      // Keep the most recently added or the highest one.
      // To be safe, keep the first one we find or clean up so only one remains.
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

    // 3. Handle specific conflicts (zcf vs zclsd)
    if (nextSet.has('zcf') && nextSet.has('zclsd')) {
      // If both are present, remove one of them based on precedence or keep.
      // Let's assume zclsd has priority or whichever was not deleted.
      // We will handle this gracefully in toggle, but here we just prune.
    }

    // 4. Run iterative composite check
    let changed = true;
    while (changed) {
      changed = false;
      for (const ext of EXTENSIONS) {
        if (!ext.components || ext.components.length === 0) continue;

        // If the extension is checked, ensure all its components are also checked
        if (nextSet.has(ext.id)) {
          for (const compId of ext.components) {
            if (!nextSet.has(compId)) {
              nextSet.add(compId);
              changed = true;
            }
          }
        } else {
          // If the extension is NOT checked, but all of its components ARE checked, auto-check it
          const allCompSelected = ext.components.every(compId => {
            const compExt = EXTENSIONS.find(e => e.id === compId);
            if (!compExt) return false;
            // Only check active components (not disabled on this core)
            if (isExtensionDisabled(compId, nextSet, core)) return true;
            return nextSet.has(compId);
          });

          // Wait, only auto-check if there is at least one active component (to avoid checking empty composites)
          const hasActiveComp = ext.components.some(compId => !isExtensionDisabled(compId, nextSet, core));

          if (allCompSelected && hasActiveComp) {
            nextSet.add(ext.id);
            changed = true;
          }
        }
      }
    }

    // 5. Clean up disabled options from composite checks (e.g. if zcf got checked but it's disabled)
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
      // Uncheck logic
      nextSet.delete(id);

      // If it's a composite, uncheck all of its sub-components
      if (ext.components) {
        ext.components.forEach(compId => nextSet.delete(compId));
      }

      // Linkage: If we unchecked a component, uncheck any composite that depends on it
      EXTENSIONS.forEach(parentExt => {
        if (parentExt.components?.includes(id)) {
          nextSet.delete(parentExt.id);
          // Recursively uncheck parent composites
          EXTENSIONS.forEach(grandparent => {
            if (grandparent.components?.includes(parentExt.id)) {
              nextSet.delete(grandparent.id);
            }
          });
        }
      });
    } else {
      // Check logic
      nextSet.add(id);

      // Mutually exclusive: Vector levels
      const vectorOptions = ['zve32x', 'zve32f', 'zve64x', 'zve64f', 'zve64d', 'v'];
      if (vectorOptions.includes(id)) {
        vectorOptions.forEach(opt => {
          if (opt !== id) nextSet.delete(opt);
        });
      }

      // Mutually exclusive: Vector register lengths
      const vlOptions = ['zvl128b', 'zvl256b', 'zvl512b', 'zvl1024b'];
      if (vlOptions.includes(id)) {
        vlOptions.forEach(opt => {
          if (opt !== id) nextSet.delete(opt);
        });
      }

      // Mutually exclusive conflicts: zcf vs zclsd
      if (id === 'zcf') {
        nextSet.delete('zclsd');
      } else if (id === 'zclsd') {
        nextSet.delete('zcf');
      }

      // If it's a composite, check all of its sub-components
      if (ext.components) {
        ext.components.forEach(compId => nextSet.add(compId));
      }
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

    // Remove conflicting zclsd if Zc is all-selected
    nextSet.delete('zclsd');

    nextSet.add('zca');
    nextSet.add('zcb');
    nextSet.add('zcmp');
    nextSet.add('zcmt');

    if (isRV32 && (hasF || hasD)) {
      nextSet.add('zcf');
    } else {
      nextSet.delete('zcf'); // Remove zcf if not RV32 or no float
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

  const handleReset = () => {
    setSelectedCore(defaultCore);
    const initialSet = new Set<string>();
    const recVec = recommendVector(defaultCore);
    if (recVec) initialSet.add(recVec);
    setSelectedIds(initialSet);
  };

  // Initialize with default core vector recommendation
  useEffect(() => {
    const initialSet = new Set<string>();
    const recVec = recommendVector(defaultCore);
    if (recVec) initialSet.add(recVec);
    setSelectedIds(initialSet);
  }, []);

  const { march, mabi, logs } = buildMarchString(selectedCore, selectedIds);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/30 backdrop-blur py-5 px-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600/10 border border-purple-500/30 p-2 rounded-lg text-purple-400">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-100 m-0 leading-tight">
                Nuclei RISC-V 编译参数生成器
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                选择 CPU Core 与支持的扩展，自动进行依赖校验、冲突解决与复合扩展折叠，输出推荐的 -march 与 -mabi。
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 self-start md:self-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>恢复默认设置</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Selectors (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <CoreSelector
            selectedCore={selectedCore}
            onSelectCore={handleSelectCore}
          />
          <ExtensionGroup
            selectedCore={selectedCore}
            selectedIds={selectedIds}
            onToggleExtension={handleToggleExtension}
            onZcAllSelect={handleZcAllSelect}
            onZcClear={handleZcClear}
          />
        </div>

        {/* Right Side: Results (1/3 width) */}
        <div className="lg:col-span-1">
          <ResultPanel
            march={march}
            mabi={mabi}
            logs={logs}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 px-6 text-center text-xs text-slate-600 bg-slate-950">
        <p>© 2026 Nuclei CPU Feature Selector. Powered by Vite + React + Tailwind.</p>
      </footer>
    </div>
  );
}

export default App;
