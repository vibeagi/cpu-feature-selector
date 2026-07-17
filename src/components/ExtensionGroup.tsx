import React, { useState } from 'react';
import type { CpuCore } from '../data/cores';
import { EXTENSIONS, EXTENSION_CATEGORIES } from '../data/extensions';
import type { Extension } from '../data/extensions';
import { getExtensionDisabledReason } from '../utils/marchBuilder';
import { AlertCircle, Info, ExternalLink, X } from 'lucide-react';
import EXTENSION_INFO from '../../extension.json';

interface ExtensionInfo {
  name: string;
  description: string;
  url: string;
}

const extInfoMap = new Map<string, ExtensionInfo>();
(EXTENSION_INFO as ExtensionInfo[]).forEach(e => extInfoMap.set(e.name, e));
// Map ext_ prefixed IDs to their base names for composite extensions
const extIdToInfoName: Record<string, string> = {
  'ext_zk': 'zk', 'ext_zkn': 'zkn', 'ext_zks': 'zks',
  'ext_zvkn': 'zvkn', 'ext_zvknc': 'zvknc', 'ext_zvkng': 'zvkng',
  'ext_zvks': 'zvks', 'ext_zvksc': 'zvksc', 'ext_zvksg': 'zvksg',
  'ext_b': 'b',
  'ext_c': 'zca', 'ext_zce': 'zce',
  'ext_zdinx': 'zdinx', 'ext_zhinx': 'zhinx',
};

interface ExtensionGroupProps {
  selectedCore: CpuCore;
  selectedIds: Set<string>;
  onToggleExtension: (id: string) => void;
  onSelectAllCategory: (catId: string) => void;
}

const CATEGORIES_WITH_ALL_SELECT = ['crypto-scalar', 'crypto-vector', 'mop', 'bf16', 'float', 'float-int', 'zihint', 'cmo', 'bitmanip'];

export const ExtensionGroup: React.FC<ExtensionGroupProps> = ({
  selectedCore,
  selectedIds,
  onToggleExtension,
  onSelectAllCategory,
}) => {
  const [infoExt, setInfoExt] = useState<ExtensionInfo | null>(null);

  const getParentCompositeId = (extId: string): string | null => {
    const parent = EXTENSIONS.find(e =>
      e.isComposite && e.components?.includes(extId) && selectedIds.has(e.id)
    );
    return parent ? parent.name : null;
  };

  const renderExtensionCheckbox = (ext: Extension) => {
    const disabledReason = getExtensionDisabledReason(ext.id, selectedIds, selectedCore);
    const isDisabled = disabledReason !== null;
    const isChecked = selectedIds.has(ext.id);
    const parentName = getParentCompositeId(ext.id);
    const isPassivelyChecked = isChecked && parentName !== null;
    const infoName = extIdToInfoName[ext.id] || ext.name;
    const info = extInfoMap.get(ext.name) || extInfoMap.get(infoName) || extInfoMap.get(ext.id);

    let labelClass = "text-xs font-semibold transition-colors ";
    let containerClass = "relative flex items-start p-2 rounded-lg border transition-all select-none ";

    if (isDisabled) {
      labelClass += "text-slate-400 line-through";
      containerClass += "bg-slate-100/50 border-slate-200 opacity-50 cursor-not-allowed";
    } else if (isPassivelyChecked) {
      labelClass += "text-indigo-600";
      containerClass += "bg-indigo-50/30 border-indigo-200 hover:border-indigo-400 cursor-pointer shadow-sm";
    } else if (isChecked) {
      labelClass += "text-indigo-700";
      containerClass += "bg-indigo-50 border-indigo-500 hover:border-indigo-600 cursor-pointer shadow-sm";
    } else {
      labelClass += "text-slate-700";
      containerClass += "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer";
    }

    return (
      <div key={ext.id} className={containerClass}>
        {/* Click area for checkbox toggle */}
        <div className="flex items-center h-5 flex-shrink-0" onClick={() => !isDisabled && onToggleExtension(ext.id)}>
          <input
            id={`ext-${ext.id}`}
            type="checkbox"
            checked={isChecked}
            disabled={isDisabled}
            onChange={() => {}}
            className={`h-3.5 w-3.5 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          />
        </div>
        <div className="ml-2 flex-1 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className={`${labelClass} truncate`}>{ext.name}</span>
            <div className="flex items-center gap-1 flex-shrink-0">
              {info && (
                <button
                  onClick={(e) => { e.stopPropagation(); setInfoExt(info); }}
                  className="text-slate-400 hover:text-indigo-600 transition-colors"
                  title="查看扩展详情"
                >
                  <Info className="h-3 w-3" />
                </button>
              )}
              {ext.isComposite && (
                <span className="text-[8px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200/50 px-1 py-0.5 rounded-md tracking-wider">组合</span>
              )}
              {ext.type === 'custom' && (
                <span className="text-[8px] font-bold bg-amber-100 text-amber-700 border border-amber-300/50 px-1 py-0.5 rounded-md tracking-wider">Nuclei</span>
              )}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 leading-normal break-words line-clamp-1">{ext.description}</p>
          {isPassivelyChecked && (
            <span className="text-[8px] text-indigo-500 font-bold mt-0.5">已由 {parentName} 自动包含</span>
          )}
          {isDisabled && (
            <div className="flex items-start gap-0.5 mt-0.5 text-[9px] text-red-500 font-medium leading-normal">
              <AlertCircle className="h-2.5 w-2.5 mt-0.5 flex-shrink-0" />
              <span className="break-words leading-snug">{disabledReason}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getCategorizedExtensions = (catId: string) => {
    return EXTENSIONS.filter(ext => ext.category === catId);
  };

  return (
    <>
      <div className="space-y-4">
        {EXTENSION_CATEGORIES.map((category) => {
          const exts = getCategorizedExtensions(category.id);
          const allHiddenOrDisabled = exts.every(ext => {
            const reason = getExtensionDisabledReason(ext.id, selectedIds, selectedCore);
            return reason?.includes('系列处理器') || (ext.id === 'zmmul' && selectedCore.series !== 'nuclei-100-series');
          });
          if (allHiddenOrDisabled) return null;

          return (
            <div key={category.id} id={`cat-${category.id}`} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm scroll-mt-24">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{category.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{category.description}</p>
                </div>
                <div className="flex gap-1">
                  {(CATEGORIES_WITH_ALL_SELECT.includes(category.id) || category.id === 'zc') && (
                    <button onClick={(e) => { e.stopPropagation(); onSelectAllCategory(category.id); }}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-100 transition-colors shadow-sm">全选</button>
                  )}
                </div>
              </div>

              {category.id === 'vector' ? (
                <>
                  <div className="mb-3">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="w-1 h-3 bg-indigo-400 rounded-full" />
                      Zvl*: Minimum Vector Length Standard Extensions
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {exts.filter(ext => ext.id.startsWith('zvl')).map(renderExtensionCheckbox)}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="w-1 h-3 bg-sky-400 rounded-full" />
                      Zve*: Vector Extensions for Embedded Processors
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {exts.filter(ext => !ext.id.startsWith('zvl')).map(renderExtensionCheckbox)}
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {exts.map(renderExtensionCheckbox)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Extension Info Popover */}
      {infoExt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setInfoExt(null)}>
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 font-mono">{infoExt.name}</h3>
              <button onClick={() => setInfoExt(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">{infoExt.description}</p>
            <a
              href={infoExt.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>查看官方文档 &rarr;</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
};