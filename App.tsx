
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import EditorPanel from './components/EditorPanel';
import ResultsPanel from './components/ResultsPanel';
import { StrategyConfig, LogEntry, LogLevel, Metrics, StrategyType, Stock, Trade } from './types';
import { 
    INITIAL_PYTHON_CODE, 
    MOCK_LOGS, 
    generateChartData, 
    DEFAULT_METRICS, 
    STRATEGY_CODES, 
    STOCK_POOL,
    generateDeterministicMetrics,
    generateDeterministicTrades
} from './constants';
import { Settings, Code, BarChart2 } from 'lucide-react';

const App: React.FC = () => {
  // State Management
  const [config, setConfig] = useState<StrategyConfig>(() => {
    return {
        initialCapital: 100000,
        startDate: '2024-01-01',
        endDate: '2025-12-01',
        shortPeriod: 10, // MA10
        longPeriod: 20,  // MA20
        stopLoss: 5,
        takeProfit: 15,
        volumeRatio: 1.5,
        peRatio: 30,
        gridStep: 2.0,
        gridSize: 1000,
        t0Threshold: 0.5,
        t0TakeProfit: 1.5,
        t0StopLoss: 1.0,
        limitUpThreshold: 9.0
    };
  });

  const [selectedStock, setSelectedStock] = useState<Stock>(STOCK_POOL[0]);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('DualMA');
  const [code, setCode] = useState<string>(INITIAL_PYTHON_CODE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(DEFAULT_METRICS);
  const [trades, setTrades] = useState<Trade[]>([]);
  
  // Mobile Tab State
  const [activeTab, setActiveTab] = useState<'config' | 'editor' | 'results'>('config');

  // Helper to refresh simulation data
  const refreshSimulation = (currentStrategy: StrategyType, currentStock: Stock, currentConfig: StrategyConfig) => {
      const newMetrics = generateDeterministicMetrics(currentStrategy, currentStock.code, currentConfig);
      setMetrics(newMetrics);
      
      const newTrades = generateDeterministicTrades(currentStrategy, currentStock.code, currentConfig);
      setTrades(newTrades);
  };

  // Initialize Logs and Simulation
  useEffect(() => {
    let delay = 0;
    const initialLogs = MOCK_LOGS;
    setLogs([]);
    initialLogs.forEach((log) => {
        delay += 300;
        setTimeout(() => {
            setLogs(prev => [...prev, log]);
        }, delay);
    });
    // Calculate initial metrics and trades
    refreshSimulation(selectedStrategy, selectedStock, config);
  }, []); // Run once on mount

  // Refresh trades when config changes (debounced slightly via logic flow, but here direct for responsiveness)
  useEffect(() => {
      refreshSimulation(selectedStrategy, selectedStock, config);
  }, [config, selectedStrategy, selectedStock]);

  // --- Two-Way Binding Logic ---

  // 1. Config (Slider) -> Code
  const updateCodeFromConfig = (newConfig: StrategyConfig) => {
    let newCode = code;
    
    // Helper param replacer
    const replaceParam = (paramName: string, value: number) => {
        const regex = new RegExp(`\\('${paramName}',\\s*[0-9.]+\\)`, 'g');
        newCode = newCode.replace(regex, `('${paramName}', ${value})`);
    };

    // Update specific strategy params
    if (selectedStrategy === 'DualMA') {
        replaceParam('period_fast', newConfig.shortPeriod);
        replaceParam('period_slow', newConfig.longPeriod);
        replaceParam('stop_loss', newConfig.stopLoss);
        replaceParam('take_profit', newConfig.takeProfit);
    } else if (selectedStrategy === 'SingleMA') {
        replaceParam('period', newConfig.shortPeriod);
        replaceParam('stop_loss', newConfig.stopLoss);
        replaceParam('take_profit', newConfig.takeProfit);
    } else if (selectedStrategy === 'SmallCap') {
        replaceParam('volume_ratio', newConfig.volumeRatio);
        replaceParam('pe_ratio', newConfig.peRatio);
    } else if (selectedStrategy === 'Grid') {
        replaceParam('grid_step', newConfig.gridStep);
        replaceParam('grid_size', newConfig.gridSize);
        replaceParam('stop_loss', newConfig.stopLoss);
        replaceParam('take_profit', newConfig.takeProfit);
    } else if (selectedStrategy === 'T0') {
        replaceParam('threshold', newConfig.t0Threshold);
        replaceParam('take_profit', newConfig.t0TakeProfit);
        replaceParam('stop_loss', newConfig.t0StopLoss);
    } else if (selectedStrategy === 'LimitUp') {
        replaceParam('threshold', newConfig.limitUpThreshold);
    }

    // Try to update Initial Capital comment
    const capitalCommentRegex = /# Initial Capital: \d+/;
    if (capitalCommentRegex.test(newCode)) {
        newCode = newCode.replace(capitalCommentRegex, `# Initial Capital: ${newConfig.initialCapital}`);
    } else {
        const lines = newCode.split('\n');
        if (lines[0].includes('strategy.py')) {
             lines.splice(1, 0, `\n# Initial Capital: ${newConfig.initialCapital}`);
             newCode = lines.join('\n');
        }
    }

    if (newCode !== code) {
        setCode(newCode);
    }
  };

  // 2. Code -> Config (Parses code to update sliders when user types)
  const updateConfigFromCode = (currentCode: string) => {
      const getParam = (paramName: string): number | null => {
        const regex = new RegExp(`\\('${paramName}',\\s*([0-9.]+)\\)`);
        const match = currentCode.match(regex);
        return match ? parseFloat(match[1]) : null;
      };

      const newC = { ...config };
      let changed = false;

      // Map python params to config keys
      const mappings: Record<string, keyof StrategyConfig> = {
          'period_fast': 'shortPeriod',
          'period_slow': 'longPeriod',
          'stop_loss': 'stopLoss',
          'take_profit': 'takeProfit',
          'period': 'shortPeriod', // Shared for SingleMA
          'volume_ratio': 'volumeRatio',
          'pe_ratio': 'peRatio',
          'grid_step': 'gridStep',
          'grid_size': 'gridSize',
          'threshold': selectedStrategy === 'T0' ? 't0Threshold' : 'limitUpThreshold',
      };
      
      if (selectedStrategy === 'T0') {
          if (getParam('threshold') !== null) newC.t0Threshold = getParam('threshold')!;
          if (getParam('take_profit') !== null) newC.t0TakeProfit = getParam('take_profit')!;
          if (getParam('stop_loss') !== null) newC.t0StopLoss = getParam('stop_loss')!;
          changed = true;
      } else if (selectedStrategy === 'LimitUp') {
           if (getParam('threshold') !== null) newC.limitUpThreshold = getParam('threshold')!;
           changed = true;
      } else {
          for (const [pyParam, configKey] of Object.entries(mappings)) {
              const val = getParam(pyParam);
              if (val !== null && val !== config[configKey]) {
                  // @ts-ignore
                  newC[configKey] = val;
                  changed = true;
              }
          }
      }
      
      const capitalMatch = currentCode.match(/# Initial Capital: (\d+)/);
      if (capitalMatch) {
          const cap = parseInt(capitalMatch[1]);
          if (cap !== config.initialCapital) {
              newC.initialCapital = cap;
              changed = true;
          }
      }

      if (changed) {
          setConfig(newC);
      }
  };

  // --- Event Handlers ---

  const handleConfigChange = (newConfig: StrategyConfig) => {
    setConfig(newConfig);
    updateCodeFromConfig(newConfig);
  };

  const handleSaveConfig = () => {
      if (selectedStrategy === 'DualMA' && config.shortPeriod >= config.longPeriod) {
           setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-GB'), level: LogLevel.ERROR, message: `[错误] 保存失败：短期均线必须小于长期均线！` }]);
           return;
      }
      if (config.startDate > config.endDate) {
           setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-GB'), level: LogLevel.ERROR, message: `[错误] 保存失败：开始时间不能晚于结束时间！` }]);
           return;
      }
      setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-GB'), level: LogLevel.SUCCESS, message: `[系统] 参数已保存: ${selectedStrategy} / ${selectedStock.name} (Funds: ${config.initialCapital})` }]);
  };

  const handleCodeChange = (newCode: string) => {
      setCode(newCode);
      updateConfigFromCode(newCode);
  };

  const handleStrategySelect = (type: StrategyType) => {
    setSelectedStrategy(type);
    
    let newCode = STRATEGY_CODES[type];
    const lines = newCode.split('\n');
    if (lines[0].includes('strategy.py')) {
         lines.splice(1, 0, `\n# Initial Capital: ${config.initialCapital}`);
         newCode = lines.join('\n');
    }
    setCode(newCode);
    
    let newStock = selectedStock;
    if (type === 'SmallCap') {
        const csi300 = STOCK_POOL.find(s => s.code === 'CSI_300');
        if (csi300) {
            newStock = csi300;
            setSelectedStock(csi300);
        }
    } else {
        if (selectedStock.code === 'CSI_300') {
            const firstStock = STOCK_POOL.find(s => s.code !== 'CSI_300');
            if (firstStock) {
                newStock = firstStock;
                setSelectedStock(firstStock);
            }
        }
    }

    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-GB'), level: LogLevel.INFO, message: `[系统] 切换策略模板: ${type}` }]);
  };

  const handleStockChange = (stock: Stock) => {
      if (selectedStrategy === 'SmallCap' && stock.code !== 'CSI_300') return;
      if (selectedStrategy !== 'SmallCap' && stock.code === 'CSI_300') return;

      setSelectedStock(stock);
      setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-GB'), level: LogLevel.INFO, message: `[数据] 切换回测标的: ${stock.name} (${stock.code})` }]);
  };

  const validateBacktest = (): boolean => {
      if (selectedStrategy === 'DualMA') {
          if (config.shortPeriod >= config.longPeriod) {
              setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-GB'), level: LogLevel.ERROR, message: `[错误] 回测失败：短期均线(${config.shortPeriod}) 必须小于 长期均线(${config.longPeriod})！` }]);
              return false;
          }
      }
      if (config.startDate > config.endDate) {
          setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-GB'), level: LogLevel.ERROR, message: `[错误] 回测失败：开始时间不能晚于结束时间！` }]);
          return false;
      }
      return true;
  };

  const handleRunBacktest = () => {
    if (!validateBacktest()) return;

    // Switch to Results tab on mobile automatically when running
    if (window.innerWidth < 768) {
        setActiveTab('results');
    }

    setLogs(prev => [
        ...prev, 
        { time: new Date().toLocaleTimeString('en-GB'), level: LogLevel.WARN, message: `[系统] 正在回测 ${selectedStock.name} (Capital: ${config.initialCapital})...` },
    ]);
    
    setTimeout(() => {
        // Trigger a fresh calculation (although effect handles it, this confirms the 'Run' action visually in logs)
        refreshSimulation(selectedStrategy, selectedStock, config);
        
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-GB'), level: LogLevel.SUCCESS, message: '[完成] 回测结束，指标已更新。' }]);
    }, 800);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Mobile Tab Content Wrapper */}
      <div className={`flex-1 md:flex flex-col md:flex-row h-[calc(100vh-60px)] md:h-screen w-full`}>
          
          {/* Sidebar */}
          <div className={`${activeTab === 'config' ? 'block' : 'hidden md:block'} w-full md:w-auto h-full`}>
              <Sidebar 
                config={config} 
                onConfigChange={handleConfigChange} 
                selectedStrategy={selectedStrategy}
                onSelectStrategy={handleStrategySelect}
                selectedStock={selectedStock}
                onSelectStock={handleStockChange}
                onSave={handleSaveConfig}
              />
          </div>

          {/* Editor */}
          <div className={`${activeTab === 'editor' ? 'flex' : 'hidden md:flex'} flex-1 w-full h-full`}>
              <EditorPanel 
                code={code} 
                onCodeChange={handleCodeChange} 
                logs={logs}
                onRun={handleRunBacktest}
              />
          </div>

          {/* Results */}
          <div className={`${activeTab === 'results' ? 'block' : 'hidden md:block'} w-full md:w-auto h-full`}>
              <ResultsPanel 
                chartData={generateChartData(config.initialCapital, trades, config.startDate, config.endDate)}
                trades={trades}
                metrics={metrics}
              />
          </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 w-full h-[60px] bg-slate-900 border-t border-slate-800 flex justify-around items-center z-50">
          <button 
            onClick={() => setActiveTab('config')}
            className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'config' ? 'text-primary-500' : 'text-slate-500'}`}
          >
              <Settings className="w-5 h-5" />
              <span className="text-[10px]">配置</span>
          </button>
          <button 
            onClick={() => setActiveTab('editor')}
            className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'editor' ? 'text-primary-500' : 'text-slate-500'}`}
          >
              <Code className="w-5 h-5" />
              <span className="text-[10px]">代码</span>
          </button>
          <button 
            onClick={() => setActiveTab('results')}
            className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'results' ? 'text-primary-500' : 'text-slate-500'}`}
          >
              <BarChart2 className="w-5 h-5" />
              <span className="text-[10px]">结果</span>
          </button>
      </div>
    </div>
  );
};

export default App;
