import React, { useState, useMemo } from 'react';
import type { CpuCore } from '../data/cores';
import { NUCLEI_CORES } from '../data/cores';
import { Search } from 'lucide-react';

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
    if (seriesId === 'all') return '全部系列';
    return seriesId.replace('nuclei-', '').replace('-series', '') + ' 系列';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col h-full">
      <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <span>处理器核心选择 (CPU Core)</span>
      </h2>

      {/* Search & Series Filters */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="搜索 Core 名称 (如 N307, UX900)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {seriesList.map((series) => (
            <button
              key={series}
              onClick={() => setSelectedSeries(series)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedSeries === series
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/50'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              {getSeriesDisplayName(series)}
            </button>
          ))}
        </div>
      </div>

      {/* Core Grid */}
      <div className="flex-1 overflow-y-auto max-h-[480px] pr-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        <div className="grid grid-cols-2 gap-2">
          {filteredCores.map((core) => {
            const isSelected = core.name === selectedCore.name;
            return (
              <button
                key={core.name}
                onClick={() => onSelectCore(core)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-purple-950/20 border-purple-500 shadow-md shadow-purple-500/5'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-semibold text-sm ${isSelected ? 'text-purple-400' : 'text-slate-200'}`}>
                    {core.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {core.series.replace('nuclei-', '').replace('-series', '')}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
                  <div>Arch: <span className="text-slate-300">{core.arch}</span></div>
                  <div>ABI: <span className="text-slate-300">{core.abi}</span></div>
                </div>
              </button>
            );
          })}
          {filteredCores.length === 0 && (
            <div className="col-span-2 text-center py-8 text-slate-500 text-sm">
              无匹配的核心
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
