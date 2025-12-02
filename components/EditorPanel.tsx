
import React, { useRef, useEffect } from 'react';
import { Play, Terminal, Wand2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { LogEntry, LogLevel } from '../types';

interface EditorPanelProps {
  code: string;
  onCodeChange: (code: string) => void;
  logs: LogEntry[];
  onRun: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

const LogItem: React.FC<{ entry: LogEntry }> = ({ entry }) => {
  let colorClass = 'text-slate-400';
  if (entry.level === LogLevel.SUCCESS) colorClass = 'text-emerald-400';
  if (entry.level === LogLevel.WARN) colorClass = 'text-yellow-400';
  if (entry.level === LogLevel.ERROR) colorClass = 'text-red-400';

  return (
    <div className="flex gap-2 text-xs font-mono py-0.5">
      <span className="text-slate-600 select-none whitespace-nowrap">{entry.time}</span>
      <span className={colorClass}>{entry.message}</span>
    </div>
  );
};

const EditorPanel: React.FC<EditorPanelProps> = ({ 
  code, 
  onCodeChange, 
  logs, 
  onRun, 
  onAnalyze, 
  isAnalyzing 
}) => {
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden w-full pb-20 md:pb-0">
      {/* Editor Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 py-3 md:py-2 bg-slate-850 border-b border-slate-700 gap-2 md:gap-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded text-xs text-slate-300 border border-slate-700">
            <span className="text-blue-400 font-bold">{'</>'}</span>
            <span>策略代码</span>
          </div>
          <span className="text-xs text-slate-500 font-mono hidden md:inline">strategy.py</span>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
           <button 
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className={`flex-1 md:flex-none justify-center md:justify-start flex items-center gap-1.5 px-3 py-2 md:py-1.5 rounded text-xs font-medium transition-colors ${
                isAnalyzing ? 'bg-purple-900/50 text-purple-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white'
            }`}
          >
            <Wand2 className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'AI Thinking' : 'AI Analyze'}
          </button>
          
          <button 
            onClick={onRun}
            className="flex-1 md:flex-none justify-center md:justify-start flex items-center gap-1.5 bg-accent-600 hover:bg-accent-500 text-white px-4 py-2 md:py-1.5 rounded text-xs font-medium transition-colors shadow-lg shadow-red-900/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            开始回测
          </button>
        </div>
      </div>

      {/* Code Editor Area (Simulated) */}
      <div className="flex-1 relative bg-[#0d1117]">
        <textarea
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          spellCheck={false}
          className="w-full h-full bg-transparent text-slate-300 font-mono text-xs md:text-sm p-4 resize-none focus:outline-none leading-relaxed"
          style={{ 
            fontFamily: '"Fira Code", "Menlo", "Consolas", monospace',
          }}
        />
        {/* Simple status bar */}
        <div className="absolute top-2 right-4 text-xs text-slate-600 font-mono pointer-events-none">
            Python 3.9
        </div>
      </div>

      {/* Console Output */}
      <div className="h-48 md:h-64 bg-slate-950 border-t border-slate-800 flex flex-col shrink-0">
        <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">运行日志 / Console</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {logs.map((log, index) => (
            <LogItem key={index} entry={log} />
          ))}
          <div ref={consoleEndRef} />
        </div>
        <div className="px-2 py-1 bg-slate-900 border-t border-slate-800 flex justify-end gap-2">
            <div className="flex bg-blue-500 text-white rounded p-1">
                 <span className="text-[10px] font-bold px-1">du</span>
            </div>
             <div className="flex gap-2 text-slate-500">
                <Info className="w-4 h-4 cursor-pointer hover:text-slate-300" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;
