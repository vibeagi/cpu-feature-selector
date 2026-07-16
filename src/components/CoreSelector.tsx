import React, { useState, useMemo } from 'react';
import type { CpuCore } from '../data/cores';
import { NUCLEI_CORES } from '../data/cores';
import { Search, ChevronDown } from 'lucide-react';

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
    <div className="relative">
      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">CPU Core</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors text-left shadow-sm"
      >
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-900 leading-tight">{selectedCore.name}</div>
          <div className="text-[9px] text-slate-500 font-mono mt-0.5 truncate">
            {selectedCore.arch} / {selectedCore.abi}
          </div>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 p-3 bg-white border border-slate-200 rounded-lg shadow-lg z-50 space-y-2 w-72">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-400" />
            <input
              type="text"
              placeholder="搜索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

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

          <div className="max-h-60 overflow-y-auto pr-1 space-y-0.5 scrollbar-thin">
            {filteredCores.map((core) => {
              const isSelected = core.name === selectedCore.name;
              return (
                <button
                  key={core.name}
                  onClick={() => { onSelectCore(core); setIsOpen(false); }}
                  className={`w-full text-left p-2 rounded-md transition-colors flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-50/50 text-indigo-600 font-semibold border border-indigo-100'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div>
                    <span className="text-xs font-medium">{core.name}</span>
                    <span className="text-[9px] font-mono text-slate-400 ml-2">{core.arch}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 uppercase">
                    {core.series.replace('nuclei-', '').replace('-series', '')}
                  </span>
                </button>
              );
            })}
            {filteredCores.length === 0 && (
              <div className="text-center py-4 text-slate-400 text-xs">无匹配的核心</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};