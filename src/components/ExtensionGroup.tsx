import React from 'react';
import type { CpuCore } from '../data/cores';
import { EXTENSIONS, EXTENSION_CATEGORIES } from '../data/extensions';
import type { Extension } from '../data/extensions';
import { getExtensionDisabledReason } from '../utils/marchBuilder';
import { AlertCircle } from 'lucide-react';

interface ExtensionGroupProps {
  selectedCore: CpuCore;
  selectedIds: Set<string>;
  onToggleExtension: (id: string) => void;
  onZcAllSelect: () => void;
  onZcClear: () => void;
  onSelectAllCategory: (catId: string) => void;
}

const CATEGORIES_WITH_ALL_SELECT = ['crypto-scalar', 'crypto-vector', 'mop', 'bf16', 'float', 'zihint', 'cmo', 'bitmanip'];

export const ExtensionGroup: React.FC<ExtensionGroupProps> = ({
  selectedCore,
  selectedIds,
  onToggleExtension,
  onZcAllSelect,
  onZcClear,
  onSelectAllCategory,
}) => {

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
    const isPassivelyChecked = isChecked && parentName !== null && ext.id !== 'ext_zk_zks' && ext.id !== 'ext_zk' && ext.id !== 'ext_zkn' && ext.id !== 'ext_zks';

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
      <div
        key={ext.id}
        id={`ext-card-${ext.id}`}
        onClick={() => !isDisabled && onToggleExtension(ext.id)}
        className={containerClass}
        title={disabledReason || ext.description}
      >
        <div className="flex items-center h-5">
          <input
            id={`ext-${ext.id}`}
            type="checkbox"
            checked={isChecked}
            disabled={isDisabled}
            onChange={() => {}}
            className={`h-3.5 w-3.5 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500 ${
              isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
          />
        </div>
        <div className="ml-2 flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className={labelClass}>{ext.name}</span>
            {ext.isComposite && (
              <span className="text-[8px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200/50 px-1 py-0.5 rounded-md tracking-wider">组合</span>
            )}
            {ext.type === 'custom' && (
              <span className="text-[8px] font-bold bg-amber-100 text-amber-700 border border-amber-300/50 px-1 py-0.5 rounded-md tracking-wider">Nuclei</span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 leading-normal break-words line-clamp-2">{ext.description}</p>
          {isPassivelyChecked && (
            <span className="text-[8px] text-indigo-500 font-bold mt-0.5 flex items-center gap-0.5">已由 {parentName} 自动包含</span>
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
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>{category.name}</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{category.description}</p>
              </div>

              <div className="flex gap-1">
                {category.id === 'zc' && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); onZcAllSelect(); }}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-100 transition-colors shadow-sm">按核心自动全选</button>
                    <button onClick={(e) => { e.stopPropagation(); onZcClear(); }}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-slate-50 text-slate-500 border border-slate-200 rounded hover:bg-slate-100 transition-colors shadow-sm">清空</button>
                  </>
                )}
                {CATEGORIES_WITH_ALL_SELECT.includes(category.id) && (
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
  );
};