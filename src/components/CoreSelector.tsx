import React, { useState, useMemo } from 'react';
import type { CpuCore } from '../data/cores';
import { NUCLEI_CORES } from '../data/cores';
import { Search, ChevronDown, Cpu } from 'lucide-react';

interface CoreSelectorProps {
  selectedCore: CpuCore;
  onSelectCore: (core: CpuCore) => void;
}

export const CoreSelector: React.FC<CoreSelectorProps> = ({
  selectedCore,
  onSelectCore,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeries, setSelectedSeries] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);

  const seriesList = useMemo(() => {
    const series = new Set<string>();
    NUCLEI_CORES.forEach(c => series.add(c.series));
    return ['all', ...Array.from(series).sort()];
  }, []);

  const filteredCores = useMemo(() => {
    return NUCLEI_CORES.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.arch.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSeries = selectedSeries === 'all' || c.series === selectedSeries;
      return matchesSearch && matchesSeries;
    });
  }, [searchTerm, selectedSeries]);

  const getSeriesDisplayName = (seriesId: string) => {
    if (seriesId === 'all') return '全部';
    return seriesId.replace('nuclei-', '').replace('-series', '');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-3">
        <Cpu className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-bold text-slate-800">CPU Core 核心选择</h3>
      </div>

      {/* Selected Core Dropdown trigger */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors text-left"
        >
          <div>
            <div className="text-xs font-bold text-slate-900">{selectedCore.name}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {selectedCore.arch} / {selectedCore.abi} ({selectedCore.series.replace('nuclei-', '').replace('-series', '')})
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div className="absolute left-0 right-0 mt-2 p-3 bg-white border border-slate-200 rounded-lg shadow-lg z-20 space-y-3 max-h-[380px] flex flex-col">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索 Core (如 N900)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex flex-wrap gap-1">
              {seriesList.map((series) => (
                <button
                  key={series}
                  onClick={() => setSelectedSeries(series)}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${
                    selectedSeries === series
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                      : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  {getSeriesDisplayName(series)}
                </button>
              ))}
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-slate-200">
              {filteredCores.map((core) => {
                const isSelected = core.name === selectedCore.name;
                return (
                  <button
                    key={core.name}
                    onClick={() => {
                      onSelectCore(core);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-md transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-50/50 text-indigo-600 font-semibold border border-indigo-100'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div>
                      <span className="text-xs">{core.name}</span>
                      <span className="text-[9px] font-mono text-slate-400 ml-2">
                        {core.arch}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 uppercase">
                      {core.series.replace('nuclei-', '').replace('-series', '')}
                    </span>
                  </button>
                );
              })}
              {filteredCores.length === 0 && (
                <div className="text-center py-4 text-slate-400 text-xs">
                  无匹配的核心
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Inline Metadata card */}
      <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">核心系列</span>
          <span className="font-semibold text-slate-800 uppercase">
            {selectedCore.series.replace('nuclei-', '').replace('-series', '')}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">基础架构 (Arch)</span>
          <span className="font-semibold font-mono text-slate-800">{selectedCore.arch}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">默认接口 (ABI)</span>
          <span className="font-semibold font-mono text-slate-800">{selectedCore.abi}</span>
        </div>
      </div>
    </div>
  );
};
