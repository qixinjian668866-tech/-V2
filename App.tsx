
import React, { useState, useEffect, useMemo } from 'react';
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
        shortPeriod: 5,  // Optimized for 300539
        longPeriod: 10,  // Optimized for 300539
        stopLoss: 8,     // Optimized Risk
        takeProfit: 200, // Let profits run for the pump
        volumeRatio: 1.5,
        peRatio: 30,
        gridStep: 2.0,
        gridSize: 1000,
        t0Threshold: 0.5,
        t0TakeProfit: 1.5,
        t0StopLoss: 1.0,
        limitUpThreshold: 9.0,
        limitUpVolumeRatio: 1.2,
        limitUpSpeedThreshold: 3.0
    };
  });

  // Executed Config holds the state used for the LAST backtest run.
  const [executedConfig, setExecutedConfig] = useState<StrategyConfig>(config);

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
      // 1. Generate Trades FIRST
      const newTrades = generateDeterministicTrades(currentStrategy, currentStock.code, currentConfig);
      setTrades(newTrades);
      
      // 2. Generate Metrics using the actual trade count
      // This guarantees that "Trade Count" metric matches the "Latest Transactions" list length
      const newMetrics = generateDeterministicMetrics(
          currentStrategy, 
          currentStock.code, 
          currentConfig, 
          newTrades.length 
      );
      setMetrics(newMetrics);
  };

  // Helper to parse config from code string without relying on component state for strategy
  const parseConfigFromStrategyCode = (codeStr: string, currentConfig: StrategyConfig, strategyType: StrategyType): StrategyConfig => {
      const getParam = (paramName: string): number | null => {
        const regex = new RegExp(`\\('${paramName}',\\s*([0-9.]+)\\)`);
        const match = codeStr.match(regex);
        return match ? parseFloat(match[1]) : null;
      };

      const newC = { ...currentConfig };

      // Shared mappings
      if (getParam('stop_loss') !== null) newC.stopLoss = getParam('stop_loss')!;
      if (getParam('take_profit') !== null) newC.takeProfit = getParam('take_profit')!;

      // Strategy specific
      if (strategyType === 'DualMA') {
          if (getParam('period_fast') !== null) newC.shortPeriod = getParam('period_fast')!;
          if (getParam('period_slow') !== null) newC.longPeriod = getParam('period_slow')!;
      } else if (strategyType === 'SingleMA') {
          if (getParam('period') !== null) newC.shortPeriod = getParam('period')!;
      } else if (strategyType === 'SmallCap') {
          if (getParam('volume_ratio') !== null) newC.volumeRatio = getParam('volume_ratio')!;
          if (getParam('pe_ratio') !== null) newC.peRatio = getParam('pe_ratio')!;
      } else if (strategyType === 'Grid') {
          if (getParam('grid_step') !== null) newC.gridStep = getParam('grid_step')!;
          if (getParam('grid_size') !== null) newC.gridSize = getParam('grid_size')!;
      } else if (strategyType === 'T0') {
          if (getParam('threshold') !== null) newC.t0Threshold = getParam('threshold')!;
          if (getParam('take_profit') !== null) newC.t0TakeProfit = getParam('take_profit')!;
          if (getParam('stop_loss') !== null) newC.t0StopLoss = getParam('stop_loss')!;
      } else if (strategyType === 'LimitUp') {
           if (getParam('threshold') !== null) newC.limitUpThreshold = getParam('threshold')!;
           if (getParam('volume_ratio') !== null) newC.limitUpVolumeRatio = getParam('volume_ratio')!;
           if (getParam('speed_threshold') !== null) newC.limitUpSpeedThreshold = getParam('speed_threshold')!;
      }
      
      return newC;
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
    setExecutedConfig(config);
    refreshSimulation(selectedStrategy, selectedStock, config);
  }, []); // Run once on mount

  // Memoize chart data generation depending on EXECUTED config
  const chartData = useMemo(() => {
      return generateChartData(
          executedConfig.initialCapital, 
          trades, 
          executedConfig.startDate, 
          executedConfig.endDate,
          selectedStock.code,
          executedConfig // Pass full config to generate MAs correctly
      );
  }, [executedConfig.initialCapital, trades, executedConfig.startDate, executedConfig.endDate, selectedStock.code, executedConfig]);

  // --- Code Generation & Validation Helpers ---
  
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

      // Check Skeleton integrity
      const getSkeleton = (src: string) => {
          let s = src.replace(/# Initial Capital:.*\n/g, '');
          s = s.replace(/\b\d+(\.\d+)?\b/g, '__NUM__');
          s = s.replace(/\s+/g, '');
          return s;
      };

      const userSkeleton = getSkeleton(code);
      const templateSkeleton = getSkeleton(STRATEGY_CODES[selectedStrategy]);

      if (userSkeleton !== templateSkeleton) {
          setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-GB'), level: LogLevel.ERROR, message: `[错误] 代码完整性校验失败：检测到非法修改策略逻辑！只允许修改数值参数。` }]);
          return false;
      }

      return true;
  };

  const updateCodeFromConfig = (newConfig: StrategyConfig) => {
    let newCode = code;
    
    const replaceParam = (paramName: string, value: number) => {
        const regex = new RegExp(`\\('${paramName}',\\s*[0-9.]+\\)`, 'g');
        newCode = newCode.replace(regex, `('${paramName}', ${value})`);
    };

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
        replaceParam('volume_ratio', newConfig.limitUpVolumeRatio);
        replaceParam('speed_threshold', newConfig.limitUpSpeedThreshold);
    }

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

  const updateConfigFromCode = (currentCode: string) => {
      const newC = parseConfigFromStrategyCode(currentCode, config, selectedStrategy);
      const capitalMatch = currentCode.match(/# Initial Capital: (\d+)/);
      if (capitalMatch) {
          newC.initialCapital = parseInt(capitalMatch[1]);
      }
      if (JSON.stringify(newC) !== JSON.stringify(config)) {
          setConfig(newC);
      }
  };

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
    
    const newConfig = parseConfigFromStrategyCode(newCode, config, type);
    setConfig(newConfig);

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

    setExecutedConfig(newConfig);
    refreshSimulation(type, newStock, newConfig);
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-GB'), level: LogLevel.INFO, message: `[系统] 切换策略模板: ${type}` }]);
  };

  const handleStockChange = (stock: Stock) => {
      if (selectedStrategy === 'SmallCap' && stock.code !== 'CSI_300') return;
      if (selectedStrategy !== 'SmallCap' && stock.code === 'CSI_300') return;

      setSelectedStock(stock);
      setExecutedConfig(config);
      refreshSimulation(selectedStrategy, stock, config);
      setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-GB'), level: LogLevel.INFO, message: `[数据] 切换回测标的: ${stock.name} (${stock.code})` }]);
  };

  const handleRunBacktest = () => {
    if (!validateBacktest()) return;

    if (window.innerWidth < 768) {
        setActiveTab('results');
    }

    if (JSON.stringify(config) === JSON.stringify(executedConfig) && trades.length > 0) {
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-GB'), level: LogLevel.INFO, message: '[提示] 参数未变更，显示已有回测结果。' }]);
        return;
    }

    setLogs(prev => [
        ...prev, 
        { time: new Date().toLocaleTimeString('en-GB'), level: LogLevel.WARN, message: `[系统] 正在回测 ${selectedStock.name} (Capital: ${config.initialCapital})...` },
    ]);
    
    setExecutedConfig(config);

    setTimeout(() => {
        refreshSimulation(selectedStrategy, selectedStock, config);
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString('en-GB'), level: LogLevel.SUCCESS, message: '[完成] 回测结束，指标已更新。' }]);
    }, 800);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <div className={`flex-1 md:flex flex-col md:flex-row h-[calc(100vh-60px)] md:h-screen w-full`}>
          
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

          <div className={`${activeTab === 'editor' ? 'flex' : 'hidden md:flex'} flex-1 w-full h-full`}>
              <EditorPanel 
                code={code} 
                onCodeChange={handleCodeChange} 
                logs={logs}
                onRun={handleRunBacktest}
              />
          </div>

          <div className={`${activeTab === 'results' ? 'block' : 'hidden md:block'} w-full md:w-auto h-full`}>
              <ResultsPanel 
                chartData={chartData}
                trades={trades}
                metrics={metrics}
                config={executedConfig} // Pass executed config to render correct MA lines
              />
          </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 w-full h-[60px] bg-slate-900 border-t border-slate-800 flex justify-around items-center z-50">
          <button onClick={() => setActiveTab('config')} className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'config' ? 'text-primary-500' : 'text-slate-500'}`}>
              <Settings className="w-5 h-5" />
              <span className="text-[10px]">配置</span>
          </button>
          <button onClick={() => setActiveTab('editor')} className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'editor' ? 'text-primary-500' : 'text-slate-500'}`}>
              <Code className="w-5 h-5" />
              <span className="text-[10px]">代码</span>
          </button>
          <button onClick={() => setActiveTab('results')} className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'results' ? 'text-primary-500' : 'text-slate-500'}`}>
              <BarChart2 className="w-5 h-5" />
              <span className="text-[10px]">结果</span>
          </button>
      </div>
    </div>
  );
};

export default App;
