
import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Scatter,
  AreaChart,
  Area
} from 'recharts';
import { ChartDataPoint, Trade, Metrics } from '../types';
import { BarChart2 } from 'lucide-react';

interface ResultsPanelProps {
  chartData: ChartDataPoint[];
  trades: Trade[];
  metrics: Metrics;
}

const MetricCard: React.FC<{ label: string; value: string; color?: string }> = ({ 
  label, 
  value, 
  color = 'text-white' 
}) => (
  <div className="bg-slate-800 p-3 rounded-md border border-slate-700 flex flex-col gap-1">
    <span className="text-slate-400 text-xs font-medium">{label}</span>
    <span className={`text-xl font-bold font-mono ${color}`}>{value}</span>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-600 p-2 rounded shadow-xl text-xs">
        <p className="text-slate-300 font-bold mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
                {entry.name}: {entry.value.toLocaleString()}
            </p>
        ))}
        {payload[0].payload.signal && (
             <p className={`font-bold mt-1 ${payload[0].payload.signal === 'buy' ? 'text-red-500' : 'text-green-500'}`}>
                Signal: {payload[0].payload.signal.toUpperCase()}
             </p>
        )}
      </div>
    );
  }
  return null;
};

const ResultsPanel: React.FC<ResultsPanelProps> = ({ chartData, trades, metrics }) => {
  const [chartMode, setChartMode] = useState<'price' | 'equity'>('price');

  return (
    <div className="w-96 bg-slate-900 border-l border-slate-700 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-slate-400" />
        <span className="text-slate-200 font-semibold text-sm">回测结果</span>
      </div>

      {/* Metrics Grid */}
      <div className="p-4">
        <h3 className="text-slate-500 text-xs font-medium mb-3">核心指标</h3>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <MetricCard label="总收益率" value={metrics.totalReturn} color="text-red-500" />
          <MetricCard label="年化收益" value={metrics.annualReturn} color="text-red-500" />
          <MetricCard label="夏普比率" value={metrics.sharpeRatio} />
        </div>
        <div className="grid grid-cols-3 gap-2">
           <MetricCard label="最大回撤" value={metrics.maxDrawdown} color="text-green-500" />
           <MetricCard label="胜率" value={metrics.winRate} />
           <MetricCard label="交易次数" value={metrics.tradeCount} />
        </div>
      </div>

      {/* Chart Section */}
      <div className="flex-1 min-h-[300px] border-t border-slate-700 bg-slate-850 p-4">
        <div className="flex items-center justify-between mb-4">
            <div className="flex bg-slate-800 rounded p-0.5">
                <button 
                    onClick={() => setChartMode('price')}
                    className={`px-3 py-1 text-xs rounded shadow-sm transition-colors ${chartMode === 'price' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    K线图 (D1)
                </button>
                <button 
                    onClick={() => setChartMode('equity')}
                    className={`px-3 py-1 text-xs rounded shadow-sm transition-colors ${chartMode === 'equity' ? 'bg-purple-900/50 text-purple-200' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    账户净值
                </button>
            </div>
        </div>
        
        <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'price' ? (
                    <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="date" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="price" stroke="#64748b" dot={false} strokeWidth={1} name="Price" />
                        <Line type="monotone" dataKey="ma5" stroke="#3b82f6" dot={false} strokeWidth={1} name="MA5" />
                        <Line type="monotone" dataKey="ma20" stroke="#eab308" dot={false} strokeWidth={1} name="MA20" />
                        <Scatter dataKey="price" fill="none" shape={(props: any) => {
                            const { cx, cy, payload } = props;
                            if (payload.signal === 'buy') {
                                return <path d={`M${cx},${cy+10} L${cx-4},${cy+18} L${cx+4},${cy+18} Z`} fill="#ef4444" />; // Red Up Arrow
                            }
                            if (payload.signal === 'sell') {
                                return <path d={`M${cx},${cy-10} L${cx-4},${cy-18} L${cx+4},${cy-18} Z`} fill="#10b981" />; // Green Down Arrow
                            }
                            return null;
                        }} />
                    </ComposedChart>
                ) : (
                    <AreaChart data={chartData}>
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
                        />
                    </AreaChart>
                )}
            </ResponsiveContainer>
        </div>
      </div>

      {/* Trades List */}
      <div className="border-t border-slate-700 bg-slate-900 flex-1 flex flex-col">
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
