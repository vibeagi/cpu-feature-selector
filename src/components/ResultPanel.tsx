import React, { useState, useMemo } from 'react';
import type { LogEntry } from '../utils/marchBuilder';
import type { CpuCore } from '../data/cores';
import { Copy, Check, Terminal, Code2, AlertTriangle, Info, CheckCircle2, Settings2 } from 'lucide-react';

interface ResultPanelProps {
  march: string;
  mabi: string;
  logs: LogEntry[];
  selectedCore: CpuCore;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  march,
  mabi,
  logs,
  selectedCore,
}) => {
  const [copiedMarch, setCopiedMarch] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedSdk, setCopiedSdk] = useState(false);
  const [copiedQemu, setCopiedQemu] = useState(false);
  const [copiedXl, setCopiedXl] = useState(false);

  const copyToClipboard = (text: string, type: 'march' | 'full' | 'sdk' | 'qemu' | 'xl') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'march') setCopiedMarch(true);
      else if (type === 'full') setCopiedFull(true);
      else if (type === 'sdk') setCopiedSdk(true);
      else if (type === 'qemu') setCopiedQemu(true);
      else setCopiedXl(true);
      setTimeout(() => {
        if (type === 'march') setCopiedMarch(false);
        else if (type === 'full') setCopiedFull(false);
        else if (type === 'sdk') setCopiedSdk(false);
        else if (type === 'qemu') setCopiedQemu(false);
        else setCopiedXl(false);
      }, 2000);
    });
  };

  const mtune = selectedCore ? `-mtune=${selectedCore.series}` : '';
  const fullCommand = `-march=${march} -mabi=${mabi} ${mtune}`;

  // QEMU command and XL CPU Model command
  const qemuCommand = useMemo(() => {
    const isRV64 = selectedCore.arch.startsWith('rv64');
    const qemuBin = isRV64 ? 'qemu-system-riscv64' : 'qemu-system-riscv32';
    const coreName = selectedCore.name.toLowerCase();
    const parts = march.split('_');
    const extItems = parts.slice(1).filter(p => !p.startsWith('zvl'));
    const extStr = extItems.join('_');
    const zvlExt = parts.slice(1).find(p => p.startsWith('zvl'));
    let cpuArg = `nuclei-${coreName},ext=${extStr}`;
    if (zvlExt) {
      const bits = parseInt(zvlExt.replace('zvl', '').replace('b', ''), 10);
      cpuArg += `,vlen=${bits / 2}`;
    }
    return `${qemuBin} -M nuclei_evalsoc,download=ilm -cpu ${cpuArg} -smp 1 -icount shift=0 -nodefaults -nographic -serial stdio -kernel appilm.elf`;
  }, [march, selectedCore]);

  const cpuModelCommand = useMemo(() => {
    const coreName = selectedCore.name.toLowerCase();
    const parts = march.split('_');
    const extItems = parts.slice(1).filter(p => !p.startsWith('zvl'));
    const extStr = extItems.join('_');
    const zvlExt = parts.slice(1).find(p => p.startsWith('zvl'));
    let varch = '';
    if (zvlExt) {
      const bits = parseInt(zvlExt.replace('zvl', '').replace('b', ''), 10);
      varch = ` --varch=vlen:${bits}`;
    }
    return `xl_cpumodel -M nuclei_evalsoc --cpu=${coreName} --download=ilm --ext=${extStr}${varch} --smp=1  appilm.elf`;
  }, [march, selectedCore]);

  // Compute ARCH_EXT: everything after the base arch prefix, prefixed with _
  const archExt = useMemo(() => {
    const parts = march.split('_');
    if (parts.length <= 1) return '';
    return '_' + parts.slice(1).join('_');
  }, [march]);

  const sdkOptions = archExt
    ? `CORE=${selectedCore.name.toLowerCase()} ARCH_EXT=${archExt}`
    : `CORE=${selectedCore.name.toLowerCase()}`;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
        <Code2 className="h-4 w-4 text-indigo-600" />
        <span>生成结果 (GCC Options)</span>
      </h2>

      <div className="space-y-3.5">
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>指令集架构 (-march)</span>
            <button onClick={() => copyToClipboard(`-march=${march}`, 'march')}
              className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-500 font-semibold transition-colors">
              {copiedMarch ? <><Check className="h-3 w-3" /><span>已复制</span></> : <><Copy className="h-3 w-3" /><span>复制</span></>}
            </button>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-sm text-indigo-700 select-all break-all shadow-inner">
            -march={march}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">应用二进制接口 (-mabi)</span>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-sm text-slate-700 shadow-inner">
            -mabi={mabi}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">微架构优化 (-mtune)</span>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-sm text-slate-700 shadow-inner">
            {mtune}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>完整 GCC 编译参数</span>
            <button onClick={() => copyToClipboard(fullCommand, 'full')}
              className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-500 font-semibold transition-colors">
              {copiedFull ? <><Check className="h-3 w-3" /><span>已复制</span></> : <><Copy className="h-3 w-3" /><span>复制</span></>}
            </button>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-sm text-slate-800 select-all break-all shadow-inner">
            {fullCommand}
          </div>
        </div>
      </div>

      {/* Nuclei SDK Make Options */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5 text-slate-400" />
          <span>Nuclei SDK Make Options</span>
        </h3>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-[10px] text-slate-700 select-all break-all shadow-inner">
          {sdkOptions}
        </div>
        <button onClick={() => copyToClipboard(sdkOptions, 'sdk')}
          className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-500 font-semibold transition-colors">
          {copiedSdk ? <><Check className="h-3 w-3" /><span>已复制</span></> : <><Copy className="h-3 w-3" /><span>复制编译参数</span></>}
        </button>
      </div>

      {/* Nuclei QEMU Run Command */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5 text-slate-400" />
          <span>Nuclei QEMU Run Command</span>
        </h3>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-[10px] text-slate-700 select-all break-all shadow-inner leading-relaxed">
          {qemuCommand}
        </div>
        <button onClick={() => copyToClipboard(qemuCommand, 'qemu')}
          className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-500 font-semibold transition-colors">
          {copiedQemu ? <><Check className="h-3 w-3" /><span>已复制</span></> : <><Copy className="h-3 w-3" /><span>复制 QEMU 命令</span></>}
        </button>
      </div>

      {/* Nuclei CPU Model (xl_cpumodel) Command */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5 text-slate-400" />
          <span>Nuclei CPU Model (xl_cpumodel)</span>
        </h3>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-[10px] text-slate-700 select-all break-all shadow-inner leading-relaxed">
          {cpuModelCommand}
        </div>
        <button onClick={() => copyToClipboard(cpuModelCommand, 'xl')}
          className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-500 font-semibold transition-colors">
          {copiedXl ? <><Check className="h-3 w-3" /><span>已复制</span></> : <><Copy className="h-3 w-3" /><span>复制 XL CPU Model 命令</span></>}
        </button>
      </div>

      {/* Build Log */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5 text-slate-400" />
          <span>构建决策日志 (Build Log)</span>
        </h3>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-[10px] text-slate-500 space-y-2 max-h-[240px] overflow-y-auto scrollbar-thin">
          {logs.map((log, index) => {
            let Icon = Info;
            let colorClass = "text-slate-500";
            if (log.type === 'warn') { Icon = AlertTriangle; colorClass = "text-amber-600"; }
            else if (log.type === 'success') { Icon = CheckCircle2; colorClass = "text-emerald-600"; }
            return (
              <div key={index} className={`flex items-start gap-1.5 ${colorClass}`}>
                <Icon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">{log.message}</span>
              </div>
            );
          })}
          {logs.length === 0 && <div className="text-slate-400 text-center py-4">无编译日志</div>}
        </div>
      </div>
    </div>
  );
};