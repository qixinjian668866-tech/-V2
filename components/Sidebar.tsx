
import React, { useRef, useState } from 'react';
import { StrategyConfig, StrategyType, Stock } from '../types';
import { STOCK_POOL } from '../constants';
import { Settings, Save, Search, AlertTriangle, Calendar, Wallet, Upload, Cloud, Bird } from 'lucide-react';

interface SidebarProps {
  config: StrategyConfig;
  onConfigChange: (newConfig: StrategyConfig) => void;
  selectedStrategy: StrategyType;
  onSelectStrategy: (type: StrategyType) => void;
  selectedStock: Stock;
  onSelectStock: (stock: Stock) => void;
  onSave?: () => void;
}

const StrategyButton: React.FC<{ 
    label: string; 
    active?: boolean; 
    onClick: () => void 
}> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-3 md:py-2.5 rounded-md text-sm font-medium transition-all ${
      active
        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
    }`}
  >
    {label}
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ 
  config, 
  onConfigChange, 
  selectedStrategy, 
  onSelectStrategy,
  selectedStock,
  onSelectStock,
  onSave
}) => {
  // Empty string indicates default "Cloud" view; otherwise contains Blob URL for uploaded image
  const [avatarUrl, setAvatarUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: keyof StrategyConfig, value: number | string) => {
    onConfigChange({ ...config, [key]: value });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const url = URL.createObjectURL(file);
        setAvatarUrl(url);
    }
  };

  const getStrategyName = (type: StrategyType) => {
    switch(type) {
        case 'DualMA': return '双均线策略';
        case 'SingleMA': return '单均线策略';
        case 'SmallCap': return '小市值策略';
        case 'Grid': return '网格策略';
        case 'T0': return 'T0策略';
        case 'LimitUp': return '打板策略';
        default: return '策略';
    }
  }

  // Filter stock pool based on strategy
  const filteredStockPool = STOCK_POOL.filter(stock => {
      if (selectedStrategy === 'SmallCap') {
          return stock.code === 'CSI_300';
      } else {
          return stock.code !== 'CSI_300';
      }
  });

  // Helper for Input rendering
  const renderRangeInput = (label: string, key: keyof StrategyConfig, min: number, max: number, unit: string = '') => (
    <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-400">
            <span>{label}</span>
            <span className="text-slate-200">{config[key]}{unit}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={key.includes('Ratio') || key === 'gridStep' || key.includes('Threshold') || key === 't0TakeProfit' || key === 't0StopLoss' ? 0.1 : 1}
            value={config[key] as number}
            onChange={(e) => handleChange(key, parseFloat(e.target.value))}
            className="w-full h-2 md:h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500 touch-none"
        />
    </div>
  );

  const isDualMAInvalid = selectedStrategy === 'DualMA' && config.shortPeriod >= config.longPeriod;

  return (
    <div className="w-full md:w-72 bg-slate-900 border-r border-slate-700 flex flex-col h-full overflow-y-auto pb-20 md:pb-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center gap-3 sticky top-0 bg-slate-900 z-10">
        <div 
            className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden cursor-pointer group relative shrink-0"
            onClick={handleAvatarClick}
            title="点击上传头像"
        >
           {avatarUrl ? (
               <img 
                  src={avatarUrl}
                  alt="Logo" 
                  className="w-full h-full object-cover"
               />
           ) : (
               <div className="flex items-center justify-center w-full h-full">
                   <Cloud className="w-6 h-6 text-white" fill="white" />
               </div>
           )}
           
           {/* Overlay on hover */}
           <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <Upload className="w-4 h-4 text-white" />
           </div>
           <input 
               type="file" 
               ref={fileInputRef}
               onChange={handleFileChange}
               accept="image/*"
               className="hidden"
           />
        </div>
        <div>
          <h1 className="text-slate-100 font-bold text-lg leading-tight">蜂鸟量化</h1>
          <p className="text-slate-500 text-xs">量化回测训练平台</p>
        </div>
      </div>

       {/* Global Settings (Stock Selection) */}
       <div className="p-4 border-b border-slate-700">
        <h2 className="text-slate-400 text-xs font-semibold mb-3 flex items-center gap-2">
            <Search className="w-3 h-3" />
            回测标的选择
        </h2>
        <div className="relative">
            <select 
                value={selectedStock.code}
                onChange={(e) => {
                    const stock = STOCK_POOL.find(s => s.code === e.target.value);
                    if (stock) onSelectStock(stock);
                }}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-3 md:py-2 text-sm text-slate-200 focus:outline-none focus:border-primary-500 appearance-none"
            >
                {filteredStockPool.map(stock => (
                    <option key={stock.code} value={stock.code}>
                        {stock.code} - {stock.name}
                    </option>
                ))}
            </select>
            <div className="absolute right-3 top-3.5 md:top-2.5 pointer-events-none text-slate-500 text-xs">▼</div>
        </div>
      </div>

      {/* Strategy Library */}
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-slate-400 text-xs font-semibold mb-3 uppercase tracking-wider">策略模板库</h2>
        <div className="grid grid-cols-2 gap-2">
          <StrategyButton label="双均线策略" active={selectedStrategy === 'DualMA'} onClick={() => onSelectStrategy('DualMA')} />
          <StrategyButton label="单均线策略" active={selectedStrategy === 'SingleMA'} onClick={() => onSelectStrategy('SingleMA')} />
          <StrategyButton label="小市值策略" active={selectedStrategy === 'SmallCap'} onClick={() => onSelectStrategy('SmallCap')} />
          <StrategyButton label="网格策略" active={selectedStrategy === 'Grid'} onClick={() => onSelectStrategy('Grid')} />
          <StrategyButton label="T0策略" active={selectedStrategy === 'T0'} onClick={() => onSelectStrategy('T0')} />
          <StrategyButton label="打板策略" active={selectedStrategy === 'LimitUp'} onClick={() => onSelectStrategy('LimitUp')} />
        </div>
      </div>

      {/* Dynamic Parameter Config */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-4 text-primary-500">
          <Settings className="w-4 h-4" />
          <span className="font-semibold text-sm">参数配置: {getStrategyName(selectedStrategy)}</span>
        </div>

        <div className="space-y-6">
            {/* Common Date & Capital Settings */}
            <div className="space-y-4 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                    <label className="text-xs text-slate-400 flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        初始资金 (Initial Capital)
                    </label>
                    <input 
                        type="number"
                        min="10000"
                        step="10000"
                        value={config.initialCapital}
                        onChange={(e) => handleChange('initialCapital', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 md:py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-primary-500"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            开始时间
                        </label>
                        <input 
                            type="date"
                            min="2024-01-01"
                            max="2025-12-01"
                            value={config.startDate}
                            onChange={(e) => handleChange('startDate', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 md:py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-primary-500"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            结束时间
                        </label>
                        <input 
                            type="date"
                            min="2024-01-01"
                            max="2025-12-01"
                            value={config.endDate}
                            onChange={(e) => handleChange('endDate', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 md:py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-primary-500"
                        />
                    </div>
                </div>
                <div className="text-[10px] text-slate-500 text-center">
                    * 可选回测范围: 2024-01-01 至 2025-12-01
                </div>
            </div>

            {/* Strategy Specifics */}
            {selectedStrategy === 'DualMA' && (
                <>
                    {renderRangeInput("短期均线 (MA Fast)", "shortPeriod", 2, 20)}
                    {renderRangeInput("长期均线 (MA Slow)", "longPeriod", 10, 60)}
                    
                    {isDualMAInvalid && (
                        <div className="p-2 bg-red-900/20 border border-red-800/50 rounded flex items-start gap-2 animate-pulse">
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-red-400 text-xs">错误：短线数值必须小于长线数值！</span>
                        </div>
                    )}

                    {renderRangeInput("止盈比例 (TP %)", "takeProfit", 5, 50, '%')}
                    {renderRangeInput("止损比例 (SL %)", "stopLoss", 1, 20, '%')}
                </>
            )}

            {selectedStrategy === 'SingleMA' && (
                 <>
                    {renderRangeInput("均线周期 (MA Period)", "shortPeriod", 5, 60)}
                    {renderRangeInput("止盈比例 (TP %)", "takeProfit", 5, 50, '%')}
                    {renderRangeInput("止损比例 (SL %)", "stopLoss", 1, 20, '%')}
                </>
            )}

            {selectedStrategy === 'SmallCap' && (
                 <>
                    {renderRangeInput("量比阈值 (Volume Ratio)", "volumeRatio", 0.5, 5.0)}
                    {renderRangeInput("市盈率上限 (PE Ratio)", "peRatio", 10, 100)}
                </>
            )}

            {selectedStrategy === 'Grid' && (
                 <>
                    {renderRangeInput("网格间距 (Grid Step %)", "gridStep", 0.5, 10.0, '%')}
                    {renderRangeInput("单笔数量 (Grid Size)", "gridSize", 100, 5000)}
                    {renderRangeInput("止盈比例 (TP %)", "takeProfit", 5, 50, '%')}
                    {renderRangeInput("止损比例 (SL %)", "stopLoss", 1, 20, '%')}
                </>
            )}

            {selectedStrategy === 'T0' && (
                 <>
                    {renderRangeInput("开仓偏离 (Threshold %)", "t0Threshold", 0.1, 3.0, '%')}
                    {renderRangeInput("止盈比例 (TP %)", "t0TakeProfit", 0.5, 5.0, '%')}
                    {renderRangeInput("止损比例 (SL %)", "t0StopLoss", 0.5, 5.0, '%')}
                </>
            )}

             {selectedStrategy === 'LimitUp' && (
                 <>
                    {renderRangeInput("打板阈值 (Threshold %)", "limitUpThreshold", 5.0, 19.0, '%')}
                    {renderRangeInput("量比阈值 (Volume Ratio)", "limitUpVolumeRatio", 0.5, 5.0)}
                    {renderRangeInput("涨速阈值 (Speed %)", "limitUpSpeedThreshold", 1.0, 9.0, '%')}
                </>
            )}
        </div>

        <div className="mt-auto pt-6">
            <p className="text-[10px] text-slate-600 text-center leading-relaxed">
                该软件只提供回测训练，不可实盘且不构成任何投资建议。
            </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
