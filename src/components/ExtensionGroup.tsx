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
}

export const ExtensionGroup: React.FC<ExtensionGroupProps> = ({
  selectedCore,
  selectedIds,
  onToggleExtension,
  onZcAllSelect,
  onZcClear,
}) => {

  const renderExtensionCheckbox = (ext: Extension) => {
    const disabledReason = getExtensionDisabledReason(ext.id, selectedIds, selectedCore);
    const isDisabled = disabledReason !== null;
    const isChecked = selectedIds.has(ext.id);

    // Color styling based on state
    let labelClass = "text-sm font-medium transition-colors ";
    let containerClass = "relative flex items-start p-3 rounded-lg border transition-all ";

    if (isDisabled) {
      labelClass += "text-slate-600 line-through";
      containerClass += "bg-slate-950/20 border-slate-900 opacity-40 cursor-not-allowed";
    } else if (isChecked) {
      labelClass += "text-purple-400";
      containerClass += "bg-purple-950/10 border-purple-500/60 hover:border-purple-500 cursor-pointer";
    } else {
      labelClass += "text-slate-300";
      containerClass += "bg-slate-950/40 border-slate-800 hover:border-slate-700 cursor-pointer";
    }

    return (
      <div
        key={ext.id}
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
            onChange={() => {}} // Handled by container click
            className={`h-4 w-4 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-950 focus:ring-offset-2 ${
              isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
          />
        </div>
        <div className="ml-3 flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <label htmlFor={`ext-${ext.id}`} className={labelClass}>
              {ext.name}
            </label>
            {ext.isComposite && (
              <span className="text-[9px] font-semibold bg-purple-950/80 text-purple-400 border border-purple-800/50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                组合
              </span>
            )}
            {ext.type === 'custom' && (
              <span className="text-[9px] font-semibold bg-blue-950/80 text-blue-400 border border-blue-800/50 px-1.5 py-0.5 rounded uppercase tracking-wider ml-1">
                Custom
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-normal line-clamp-2">
            {ext.description}
          </p>
          {isDisabled && (
            <div className="flex items-start gap-1 mt-1 text-[10px] text-red-400 font-medium leading-normal">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{disabledReason}</span>
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
    <div className="space-y-6">
      {EXTENSION_CATEGORIES.map((category) => {
        const exts = getCategorizedExtensions(category.id);

        // Hide categories if all extensions are unsupported by the current series/arch
        // e.g. Zmmul should not be visible or at least completely grayed out/hidden on non-100 series
        const allHiddenOrDisabled = exts.every(ext => {
          const reason = getExtensionDisabledReason(ext.id, selectedIds, selectedCore);
          return reason?.includes('系列处理器') || (ext.id === 'zmmul' && selectedCore.series !== 'nuclei-100-series');
        });

        if (allHiddenOrDisabled) return null;

        return (
          <div key={category.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-md font-semibold text-slate-100">
                  {category.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {category.description}
                </p>
              </div>

              {/* Special Action Buttons for Zc */}
              {category.id === 'zc' && (
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onZcAllSelect();
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium bg-purple-600/20 text-purple-400 border border-purple-500/40 rounded hover:bg-purple-600/30 transition-colors"
                  >
                    按核心全选 (Auto Zc)
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onZcClear();
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium bg-slate-950 text-slate-400 border border-slate-800 rounded hover:bg-slate-800 transition-colors"
                  >
                    清空
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {exts.map(renderExtensionCheckbox)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
