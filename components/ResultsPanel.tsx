
import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  AreaChart, 
  Area,
  Scatter
} from 'recharts';
import { ChartDataPoint, Trade, Metrics, StrategyConfig } from '../types';
import { BarChart2, ZoomOut } from 'lucide-react';

interface ResultsPanelProps {
  chartData: ChartDataPoint[];
  trades: Trade[];
  metrics: Metrics;
  config?: StrategyConfig;
}

const MetricCard: React.FC<{ label: string; value: string; color?: string }> = ({ 
  label, 
  value, 
  color = 'text-white' 
}) => (
  <div className="bg-slate-800 p-2 md:p-3 rounded-md border border-slate-700 flex flex-col gap-1">
    <span className="text-slate-400 text-[10px] md:text-xs font-medium truncate">{label}</span>
    <span className={`text-base md:text-xl font-bold font-mono ${color}`}>{value}</span>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Filter out Signal and price entries, keeping only MA lines
    const filteredPayload = payload.filter((entry: any) => entry.name !== 'Signal' && entry.name !== 'price');
    const dataPoint = payload[0].payload as ChartDataPoint;

    return (
      <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-xl text-xs z-50">
        <div className="text-slate-400 mb-1 font-mono border-b border-slate-700 pb-1">
          {label}
        </div>

        {dataPoint.signal && (
            <div className={`mb-1 font-bold ${dataPoint.signal === 'buy' ? 'text-red-500' : 'text-green-500'}`}>
                {dataPoint.signal === 'buy' ? '操作: 买入' : '操作: 卖出'}
                {/* Price removed as requested */}
                {dataPoint.pl !== undefined && (
                    <span className="ml-2">
                        (盈亏: {dataPoint.pl > 0 ? '+' : ''}{dataPoint.pl.toFixed(0)})
                    </span>
                )}
            </div>
        )}
        {filteredPayload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, fontWeight: 'bold' }}>
                {/* Only show Name, remove Value as requested */}
                {entry.name}
            </p>
        ))}
      </div>
    );
  }
  return null;
};

const renderSignal = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload.signal) return null;
    
    const isBuy = payload.signal === 'buy';
    const pl = payload.pl;
    
    return (
        <g>
            <circle cx={cx} cy={cy} r={9} fill={isBuy ? "#ef4444" : "#22c55e"} stroke="#1e293b" strokeWidth={2} />
            <text 
                x={cx} 
                y={cy} 
                dy={3} 
                textAnchor="middle" 
                fill="white" 
                fontSize={10} 
                fontWeight="bold"
            >
                {isBuy ? '买' : '卖'}
            </text>
            
            {/* P/L Text for Sell (Next to price or further offset) */}
            {!isBuy && pl !== undefined && (
                <text 
                    x={cx} 
                    y={cy - 27} 
                    textAnchor="middle" 
                    fill={pl > 0 ? '#ef4444' : '#22c55e'} 
                    fontSize={9} 
                    fontWeight="bold"
                    style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}
                >
                    {pl > 0 ? '+' : ''}{pl.toFixed(0)}
                </text>
            )}
        </g>
    );
};

const ResultsPanel: React.FC<ResultsPanelProps> = ({ chartData, trades, metrics, config }) => {
  const [chartMode, setChartMode] = useState<'price' | 'equity'>('price');
  
  // Zoom State
  const [zoomRange, setZoomRange] = useState<{ start: number; end: number } | null>(null);

  // Reset zoom when data changes completely (e.g. new backtest)
  useEffect(() => {
    setZoomRange(null);
  }, [chartData]);

  // Determine visible data
  const visibleData = zoomRange 
    ? chartData.slice(zoomRange.start, zoomRange.end) 
    : chartData;

  const handleWheel = (e: React.WheelEvent) => {
      // Calculate Zoom
      const totalLen = chartData.length;
      if (totalLen < 10) return;

      const currentStart = zoomRange ? zoomRange.start : 0;
      const currentEnd = zoomRange ? zoomRange.end : totalLen;
      const currentLen = currentEnd - currentStart;

      const ZOOM_SPEED = 0.1; // 10%
      let delta = Math.floor(currentLen * ZOOM_SPEED);
      if (delta < 1) delta = 1;

      let newStart = currentStart;
      let newEnd = currentEnd;

      if (e.deltaY < 0) {
          // Zoom In (Shrink range)
          newStart = Math.min(currentStart + delta, currentEnd - 10);
          newEnd = Math.max(currentEnd - delta, currentStart + 10);
      } else {
          // Zoom Out (Expand range)
          newStart = Math.max(0, currentStart - delta);
          newEnd = Math.min(totalLen, currentEnd + delta);
      }
      
      // Only update if valid range > 10 points
      if (newEnd - newStart >= 10) {
          setZoomRange({ start: newStart, end: newEnd });
      }
  };

  const handleResetZoom = () => {
      setZoomRange(null);
  };

  return (
    <div className="w-full md:w-96 bg-slate-900 border-l border-slate-700 flex flex-col h-full overflow-y-auto pb-20 md:pb-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center gap-2 sticky top-0 bg-slate-900 z-10">
        <BarChart2 className="w-4 h-4 text-slate-400" />
        <span className="text-slate-200 font-semibold text-sm">回测结果</span>
      </div>

      {/* Metrics Grid */}
      <div className="p-4">
        <h3 className="text-slate-500 text-xs font-medium mb-3">核心指标</h3>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <MetricCard label="年化收益" value={metrics.annualReturn} color="text-red-500" />
          <MetricCard label="基准年化收益" value={metrics.benchmarkReturn} color="text-red-500" />
          <MetricCard label="夏普比率" value={metrics.sharpeRatio} />
        </div>
        <div className="grid grid-cols-3 gap-2">
           <MetricCard label="最大回撤" value={metrics.maxDrawdown} color="text-green-500" />
           <MetricCard label="胜率" value={metrics.winRate} />
           <MetricCard label="交易次数" value={metrics.tradeCount} />
        </div>
      </div>

      {/* Chart Section */}
      <div className="flex-1 min-h-[350px] md:min-h-[300px] border-t border-slate-700 bg-slate-850 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
            <div className="flex bg-slate-800 rounded p-0.5">
                <button 
                    onClick={() => setChartMode('price')}
                    className={`px-3 py-1.5 md:py-1 text-xs rounded shadow-sm transition-colors ${chartMode === 'price' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    K线图 (D1)
                </button>
                <button 
                    onClick={() => setChartMode('equity')}
                    className={`px-3 py-1.5 md:py-1 text-xs rounded shadow-sm transition-colors ${chartMode === 'equity' ? 'bg-purple-900/50 text-purple-200' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    账户净值
                </button>
            </div>
            
            {/* Zoom Controls Overlay */}
            {zoomRange && (
                 <button 
                    onClick={handleResetZoom}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] text-slate-300 transition-colors"
                    title="重置缩放"
                 >
                     <ZoomOut className="w-3 h-3" />
                     复位
                 </button>
            )}
        </div>
        
        <div 
            className="flex-1 w-full min-h-[250px] relative"
            onWheel={handleWheel}
        >
            <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'price' ? (
                    <ComposedChart data={visibleData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="date" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="maShort" stroke="#3b82f6" dot={false} strokeWidth={1} name={`MA${config?.shortPeriod || 5}`} isAnimationActive={false} />
                        <Line type="monotone" dataKey="maLong" stroke="#eab308" dot={false} strokeWidth={1} name={`MA${config?.longPeriod || 20}`} isAnimationActive={false} />
                        <Scatter dataKey="price" shape={renderSignal} name="Signal" isAnimationActive={false} />
                    </ComposedChart>
                ) : (
                    <AreaChart data={visibleData}>
                        <defs>
                            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="date" hide />
                        <YAxis 
                            domain={['auto', 'auto']} 
                            hide 
                            tickFormatter={(val) => val.toLocaleString()}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                            type="monotone" 
                            dataKey="equity" 
                            stroke="#8884d8" 
                            fillOpacity={1} 
                            fill="url(#colorEquity)" 
                            name="Net Value"
                            isAnimationActive={false}
                        />
                    </AreaChart>
                )}
            </ResponsiveContainer>
            {!zoomRange && chartData.length > 50 && (
                <div className="absolute bottom-2 right-2 text-[10px] text-slate-600 pointer-events-none opacity-50 select-none">
                    * 滚动鼠标放大缩小
                </div>
            )}
        </div>
      </div>

      {/* Trades List */}
      <div className="border-t border-slate-700 bg-slate-900 flex-1 flex flex-col min-h-[200px]">
        <div className="px-4 py-3 border-b border-slate-800">
            <h3 className="text-slate-500 text-xs font-medium">最新交易</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-850 text-xs text-slate-500 font-medium">
                    <tr>
                        <th className="px-4 py-2 font-normal">日期</th>
                        <th className="px-4 py-2 font-normal">方向</th>
                        <th className="px-4 py-2 font-normal text-right">盈亏</th>
                    </tr>
                </thead>
                <tbody className="text-xs text-slate-300 font-mono">
                    {trades.map((trade, idx) => (
                        <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                            <td className="px-4 py-2 text-slate-400">{trade.date}</td>
                            <td className={`px-4 py-2 ${trade.direction === 'Buy' ? 'text-red-500' : 'text-green-500'}`}>
                                {trade.direction === 'Buy' ? '买' : '卖'}
                            </td>
                            <td className={`px-4 py-2 text-right ${trade.pl && trade.pl > 0 ? 'text-red-500' : (trade.pl && trade.pl < 0 ? 'text-green-500' : 'text-slate-500')}`}>
                                {trade.pl ? trade.pl.toFixed(2) : '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default ResultsPanel;
