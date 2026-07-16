import React, { useState } from 'react';
import type { LogEntry } from '../utils/marchBuilder';
import { Copy, Check, Terminal, Code2, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface ResultPanelProps {
  march: string;
  mabi: string;
  logs: LogEntry[];
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  march,
  mabi,
  logs,
}) => {
  const [copiedMarch, setCopiedMarch] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  const copyToClipboard = (text: string, type: 'march' | 'full') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'march') {
        setCopiedMarch(true);
        setTimeout(() => setCopiedMarch(false), 2000);
      } else {
        setCopiedFull(true);
        setTimeout(() => setCopiedFull(false), 2000);
      }
    });
  };

  const fullCommand = `-march=${march} -mabi=${mabi}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl sticky top-6 space-y-6">
      <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
        <Code2 className="h-5 w-5 text-purple-400" />
        <span>生成结果 (GCC Options)</span>
      </h2>

      {/* Generated flags */}
      <div className="space-y-4">
        {/* -march */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>指令集架构 (-march)</span>
            <button
              onClick={() => copyToClipboard(`-march=${march}`, 'march')}
              className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-medium transition-colors bg-purple-950/20 px-2 py-0.5 border border-purple-800/30 rounded"
            >
              {copiedMarch ? (
                <>
                  <Check className="h-3 w-3" />
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>复制</span>
                </>
              )}
            </button>
          </div>
          <div className="bg-slate-950 border border-slate-850 rounded-lg p-3 font-mono text-sm text-purple-400 select-all break-all shadow-inner">
            -march={march}
          </div>
        </div>

        {/* -mabi */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            应用二进制接口 (-mabi)
          </span>
          <div className="bg-slate-950 border border-slate-850 rounded-lg p-3 font-mono text-sm text-slate-300 shadow-inner">
            -mabi={mabi}
          </div>
        </div>

        {/* Full Command */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>完整 GCC 编译参数</span>
            <button
              onClick={() => copyToClipboard(fullCommand, 'full')}
              className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-medium transition-colors bg-purple-950/20 px-2 py-0.5 border border-purple-800/30 rounded"
            >
              {copiedFull ? (
                <>
                  <Check className="h-3 w-3" />
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>复制</span>
                </>
              )}
            </button>
          </div>
          <div className="bg-slate-950 border border-slate-850 rounded-lg p-3 font-mono text-sm text-slate-200 select-all break-all shadow-inner">
            {fullCommand}
          </div>
        </div>
      </div>

      {/* Assembly Logs */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5 text-slate-500" />
          <span>构建决策日志 (Build Log)</span>
        </h3>
        <div className="bg-slate-950 border border-slate-850 rounded-lg p-4 font-mono text-xs text-slate-400 space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          {logs.map((log, index) => {
            let Icon = Info;
            let colorClass = "text-slate-400";
            if (log.type === 'warn') {
              Icon = AlertTriangle;
              colorClass = "text-amber-500";
            } else if (log.type === 'success') {
              Icon = CheckCircle2;
              colorClass = "text-emerald-500";
            }
            return (
              <div key={index} className={`flex items-start gap-2 ${colorClass}`}>
                <Icon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">{log.message}</span>
              </div>
            );
          })}
          {logs.length === 0 && (
            <div className="text-slate-600 text-center py-4">无编译日志</div>
          )}
        </div>
      </div>
    </div>
  );
};
