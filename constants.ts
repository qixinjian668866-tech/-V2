
import { ChartDataPoint, LogEntry, LogLevel, Trade, Metrics, StrategyType, Stock, StrategyConfig } from "./types";

export const STOCK_POOL: Stock[] = [
  { code: '300539.SZ', name: '横河精密' },
  { code: '603019.SH', name: '中科曙光' },
  { code: '301232.SZ', name: '飞沃科技' },
  { code: '603286.SH', name: '日盈电子' },
  { code: '601138.SH', name: '工业富联' },
  { code: 'CSI_300', name: '沪深300' }
];

export const MOCK_LOGS: LogEntry[] = [
  { time: '10:00:01', level: LogLevel.INFO, message: '[系统] 初始化回测引擎...' },
  { time: '10:00:02', level: LogLevel.INFO, message: '[数据] 加载历史行情数据...' },
  { time: '10:00:03', level: LogLevel.SUCCESS, message: '[系统] 策略加载成功' },
];

export const STRATEGY_CODES: Record<StrategyType, string> = {
    DualMA: `
# A-Share Dual Moving Average Strategy
# 双均线策略：短期均线上穿长期均线买入，下穿卖出

class DualThrustStrategy(Strategy):
    params = (
        ('period_fast', 5),   # 5日均线
        ('period_slow', 10),  # 10日均线
        ('stop_loss', 8),     # 止损 8%
        ('take_profit', 200)  # 止盈 200% (Running profit)
    )

    def __init__(self):
        # 初始化技术指标
        self.sma_fast = bt.indicators.SMA(
            self.data.close, 
            period=self.params.period_fast
        )
        self.sma_slow = bt.indicators.SMA(
            self.data.close, 
            period=self.params.period_slow
        )

    def next(self):
        # 策略逻辑
        if not self.position:
            if self.sma_fast[0] > self.sma_slow[0]:
                self.buy()
        else:
            if self.sma_fast[0] < self.sma_slow[0]:
                self.sell()
`,
    SingleMA: `
# Single Moving Average Strategy
# 单均线策略：价格站上均线买入，跌破卖出

class SingleMAStrategy(Strategy):
    params = (
        ('period', 10),       # 均线周期
        ('stop_loss', 5),
        ('take_profit', 15)
    )

    def __init__(self):
        self.sma = bt.indicators.SMA(
            self.data.close, 
            period=self.params.period
        )

    def next(self):
        if not self.position:
            if self.data.close[0] > self.sma[0]:
                self.buy()
        else:
            if self.data.close[0] < self.sma[0]:
                self.sell()
`,
    SmallCap: `
# Small Market Cap Rotation
# 小市值策略：每月轮动，选择市值最小的股票

class SmallCapStrategy(Strategy):
    params = (
        ('volume_ratio', 1.5), # 量比阈值
        ('pe_ratio', 30)       # 市盈率上限
    )

    def __init__(self):
        self.last_month = None

    def next(self):
        # 月度轮动逻辑
        current_month = self.data.datetime.date(0).month
        if self.last_month == current_month:
            return
        
        self.last_month = current_month
        
        # 卖出旧仓位，买入新仓位
        if self.position:
            self.sell()
        
        # 选股逻辑 (模拟)
        if self.data.pe[0] < self.params.pe_ratio:
            self.buy()
`,
    Grid: `
# Grid Trading Strategy
# 网格策略：价格下跌买入，上涨卖出

class GridStrategy(Strategy):
    params = (
        ('grid_step', 2.0),   # 网格间距 2%
        ('grid_size', 1000),  # 单笔交易数量
        ('stop_loss', 10),
        ('take_profit', 10)
    )

    def __init__(self):
        self.last_price = self.data.close[0]

    def next(self):
        change_pct = (self.data.close[0] - self.last_price) / self.last_price * 100
        
        if change_pct <= -self.params.grid_step:
            self.buy(size=self.params.grid_size)
            self.last_price = self.data.close[0]
            
        elif change_pct >= self.params.grid_step:
            if self.position.size >= self.params.grid_size:
                self.sell(size=self.params.grid_size)
                self.last_price = self.data.close[0]
`,
    T0: `
# Intraday T+0 Strategy
# T0策略：底仓做T，高抛低吸

class T0Strategy(Strategy):
    params = (
        ('threshold', 0.5),   # 开仓阈值 0.5%
        ('take_profit', 1.5), # 止盈 1.5%
        ('stop_loss', 1.0)    # 止损 1%
    )

    def next(self):
        # 获取昨日收盘价 (模拟)
        prev_close = self.data.close[-1]
        change = (self.data.close[0] - prev_close) / prev_close * 100
        
        # 做多T0
        if change < -self.params.threshold:
            self.buy()
            
        # 做空T0 (融券)
        elif change > self.params.threshold:
            self.sell()
`,
    LimitUp: `
# Limit Up Strategy (Da Ban)
# 打板策略：追击涨停板

class LimitUpStrategy(Strategy):
    params = (
        ('threshold', 9.0),      # 涨幅阈值
        ('volume_ratio', 1.2),   # 量比
        ('speed_threshold', 3.0) # 涨速
    )

    def next(self):
        # 计算涨幅
        pct_change = (self.data.close[0] - self.data.open[0]) / self.data.open[0] * 100
        
        if pct_change > self.params.threshold:
             # 扫板买入
            self.buy()
`
};

export const INITIAL_PYTHON_CODE = STRATEGY_CODES['DualMA'];

// Placeholder for real data (temporarily unused as per user request)
const HENGHE_DATA = `code,date,open,high,low,close,change,volume,money
sz300539,2024/1/2,12.4,12.58,12.35,12.51,0.008,2535300,31734437
`;

const HOLIDAYS = new Set([
  '2024-01-01', 
  '2024-02-09', '2024-02-12', '2024-02-13', '2024-02-14', '2024-02-15', '2024-02-16', 
  '2024-04-04', '2024-04-05', 
  '2024-05-01', '2024-05-02', '2024-05-03', 
  '2024-06-10', 
  '2024-09-16', '2024-09-17', 
  '2024-10-01', '2024-10-02', '2024-10-03', '2024-10-04', '2024-10-07', 
  '2025-01-01', 
  '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-03', '2025-02-04', 
  '2025-04-04', 
  '2025-05-01', '2025-05-02', '2025-05-05', 
  '2025-06-02', 
  '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-06', '2025-10-07'
]);

// Deterministic Pseudo-Random with Config-Aware Seed
const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

// --- CSV Parser ---
const parseCSV = (csv: string) => {
    const lines = csv.trim().split('\n');
    const data = [];
    // Start from 1 to skip header
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 6) {
            const dateStr = parts[1].replace(/\//g, '-');
            data.push({
                date: dateStr,
                open: parseFloat(parts[2]),
                high: parseFloat(parts[3]),
                low: parseFloat(parts[4]),
                close: parseFloat(parts[5])
            });
        }
    }
    return data;
};

// --- SIMULATION Engine for All Stocks ---
export const generateDeterministicTrades = (strategy: StrategyType, stockCode: string, config: StrategyConfig): Trade[] => {
  // NOTE: Real Data for 300539 DISABLED as per user request. 
  // if (stockCode === '300539.SZ') {
  //    return runRealBacktest(strategy, config).trades;
  // }

  const configString = JSON.stringify({ ...config, strategy, stockCode });
  const seed = hashCode(configString);
  
  const trades: Trade[] = [];
  const startDate = new Date(config.startDate);
  const endDate = new Date(config.endDate);
  
  let currentDate = new Date(startDate);
  let position = 0; 
  let entryPrice = 0;
  
  const stockSeed = hashCode(stockCode);
  const basePrice = 10 + (Math.abs(stockSeed) % 50); 
  let currentPrice = basePrice;
  
  let probabilityThreshold = 0.5;
  if (strategy === 'T0' || strategy === 'Grid') probabilityThreshold = 0.3; 
  if (strategy === 'DualMA') probabilityThreshold = 0.8; 

  let dayIndex = 0;
  let lastMonth = -1;

  while (currentDate <= endDate) {
    dayIndex++;
    const dayOfWeek = currentDate.getDay();
    const dateStr = currentDate.toISOString().split('T')[0];

    if (dayOfWeek === 0 || dayOfWeek === 6 || HOLIDAYS.has(dateStr)) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
    }

    const dailySeed = seed + dayIndex * 1000;
    const volatility = strategy === 'SmallCap' ? 0.04 : 0.02;
    const move = (seededRandom(dailySeed) - 0.48) * volatility; 
    currentPrice = currentPrice * (1 + move);

    let action = 'hold';
    const signalSeed = seededRandom(dailySeed + 500);

    if (strategy === 'SmallCap') {
        const currentMonth = currentDate.getMonth();
        if (currentMonth !== lastMonth) {
             if (position === 1) {
                 action = 'sell';
             } else {
                 if (signalSeed > 0.2) action = 'buy';
             }
             lastMonth = currentMonth;
        }
    } else {
        if (position === 0) {
            if (signalSeed > probabilityThreshold) action = 'buy';
        } else {
            const pnl = (currentPrice - entryPrice) / entryPrice * 100;
            if (pnl > config.takeProfit || pnl < -config.stopLoss) {
                action = 'sell';
            } else if (signalSeed > probabilityThreshold && strategy !== 'DualMA') {
                action = 'sell'; 
            } else if (strategy === 'DualMA' && signalSeed > 0.9) {
                action = 'sell';
            }
        }
    }

    if (action === 'buy' && position === 0) {
        trades.push({ date: dateStr, direction: 'Buy', price: parseFloat(currentPrice.toFixed(2)), pl: 0 });
        position = 1;
        entryPrice = currentPrice;
    } else if (action === 'sell' && position === 1) {
        const realPL = (currentPrice - entryPrice) * 1000;
        trades.push({ date: dateStr, direction: 'Sell', price: parseFloat(currentPrice.toFixed(2)), pl: parseFloat(realPL.toFixed(2)) });
        position = 0;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return trades;
};

// --- Chart Data Generator ---
export const generateChartData = (
    initialCapital: number, 
    trades: Trade[], 
    startDateStr: string, 
    endDateStr: string,
    stockCode: string,
    config?: StrategyConfig
): ChartDataPoint[] => {
  // NOTE: Real Data for 300539 DISABLED. Using simulation logic.
  
  const data: ChartDataPoint[] = [];
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  
  let currentDate = new Date(startDate);
  const tradeMap = new Map<string, Trade>();
  trades.forEach(t => tradeMap.set(t.date, t));

  // Initial Price Sim
  let currentPrice = trades.length > 0 ? trades[0].price : 10;
  // If simulation start date is before first trade, walk price backward or use base
  // Simplified: just start random walk
  
  let currentEquity = initialCapital;
  let holding = false;
  let lastEntryPrice = 0;

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay();

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !HOLIDAYS.has(dateStr)) {
        const trade = tradeMap.get(dateStr);
        
        if (trade) {
            currentPrice = trade.price;
            if (trade.direction === 'Buy') {
                holding = true;
                lastEntryPrice = currentPrice;
            } else {
                holding = false;
                if (trade.pl) currentEquity += trade.pl;
            }
        } else {
            const move = (Math.random() - 0.48) * 0.03;
            currentPrice = currentPrice * (1 + move);
        }
        
        let dailyEquity = currentEquity;
        if (holding) {
            const shares = Math.floor(currentEquity / lastEntryPrice);
            const unrealizedPL = (currentPrice - lastEntryPrice) * shares;
            dailyEquity = currentEquity + unrealizedPL;
        }

        data.push({
            date: dateStr,
            price: parseFloat(currentPrice.toFixed(2)),
            open: parseFloat(currentPrice.toFixed(2)),
            high: parseFloat(currentPrice.toFixed(2)),
            low: parseFloat(currentPrice.toFixed(2)),
            maShort: parseFloat((currentPrice * (1 + (Math.random() - 0.5) * 0.05)).toFixed(2)),
            maLong: parseFloat((currentPrice * (1 + (Math.random() - 0.5) * 0.1)).toFixed(2)),
            equity: Math.floor(dailyEquity),
            signal: trade ? (trade.direction === 'Buy' ? 'buy' : 'sell') : undefined,
            pl: trade?.pl
        });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return data;
};

export const generateDeterministicMetrics = (strategy: StrategyType, stockCode: string, config: StrategyConfig, tradeCountInput?: number): Metrics => {
  // Deterministic Simulation Metrics
  const configString = JSON.stringify({ ...config, strategy, stockCode });
  const seed = hashCode(configString);
  const rng = () => seededRandom(seed);

  const annualReturnRaw = 25 + (rng() * 30); 
  const maxDrawdownRaw = 6 + (rng() * 9); 
  const winRateRaw = 55 + (rng() * 20); 
  const sharpeRaw = 1.5 + (rng() * 1.5); 
  
  // IMPORTANT: Use input trade count if provided (matches latest transactions)
  const tradesRaw = tradeCountInput !== undefined ? tradeCountInput : Math.floor(20 + (rng() * 80));
  
  const benchmarkRaw = 8 + (seededRandom(seed + 1) * 4);

  return {
    annualReturn: `${annualReturnRaw.toFixed(2)}%`,
    benchmarkReturn: `${benchmarkRaw.toFixed(2)}%`,
    sharpeRatio: sharpeRaw.toFixed(2),
    maxDrawdown: `${maxDrawdownRaw.toFixed(2)}%`,
    winRate: `${winRateRaw.toFixed(2)}%`,
    tradeCount: tradesRaw.toString()
  };
};

export const DEFAULT_METRICS: Metrics = {
  annualReturn: "0.00%",
  benchmarkReturn: "0.00%",
  sharpeRatio: "0.00",
  maxDrawdown: "0.00%",
  winRate: "0.00%",
  tradeCount: "0"
};

// Placeholder for real backtest logic (kept for structure, currently unused)
const runRealBacktest = (strategy: StrategyType, config: StrategyConfig) => {
    return { trades: [], chartData: [] };
};
