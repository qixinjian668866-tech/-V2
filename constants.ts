
import { ChartDataPoint, LogEntry, LogLevel, Trade, Metrics, StrategyType, Stock, StrategyConfig } from "./types";

export const STOCK_POOL: Stock[] = [
  { code: '300539.SZ', name: '横河精密' },
  { code: '603019.SH', name: '中科曙光' },
  { code: '301232.SZ', name: '飞沃科技' },
  { code: '603286.SH', name: '日盈电子' },
  { code: '601138.SH', name: '工业富联' },
  { code: 'CSI_300', name: '沪深300' }
];

// Deterministic Random Generator
const pseudoRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

export const generateDeterministicMetrics = (
    strategy: StrategyType, 
    stockCode: string, 
    config: StrategyConfig
): Metrics => {
    const configStr = JSON.stringify(config);
    const signature = `${strategy}-${stockCode}-${configStr}`;

    let hash = 0;
    for (let i = 0; i < signature.length; i++) {
        const char = signature.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }

    const getVal = (offset: number, min: number, max: number) => {
        const r = pseudoRandom(Math.abs(hash + offset));
        return min + r * (max - min);
    };

    const ret = getVal(1, 5, 55);
    const dd = getVal(2, 6, 15);
    
    const sharpe = (ret / 20) + getVal(3, 0, 0.5); 
    const winRate = 45 + (ret * 0.4) + getVal(4, 0, 10);
    const finalWinRate = Math.min(winRate, 95);

    const tradeCount = Math.floor(getVal(5, 30, 120));

    return {
        totalReturn: `${ret.toFixed(2)}%`,
        annualReturn: `${ret.toFixed(2)}%`,
        sharpeRatio: sharpe.toFixed(2),
        maxDrawdown: `${dd.toFixed(2)}%`,
        winRate: `${finalWinRate.toFixed(1)}%`,
        tradeCount: tradeCount.toString()
    };
};

export const DEFAULT_METRICS: Metrics = {
    totalReturn: "25.50%",
    annualReturn: "25.50%",
    sharpeRatio: "1.20",
    maxDrawdown: "7.00%",
    winRate: "62.0%",
    tradeCount: "66"
};

export const STRATEGY_CODES: Record<StrategyType, string> = {
  'DualMA': `strategy.py                         Python 3.9

# A-Share Dual Moving Average
# 双均线策略: 短期均线上穿长期均线买入，下穿卖出

class DualThrustStrategy(Strategy):
    params = (
        ('period_fast', 10),  # 短期均线
        ('period_slow', 20), # 长期均线
        ('stop_loss', 5),    # 止损 %
        ('take_profit', 15), # 止盈 %
    )

    def __init__(self):
        self.sma_fast = bt.indicators.SMA(
            self.data.close,
            period=self.params.period_fast
        )
        self.sma_slow = bt.indicators.SMA(
            self.data.close,
            period=self.params.period_slow
        )

    def next(self):
        if not self.position:
            if self.sma_fast > self.sma_slow:
                self.buy()
        elif self.sma_fast < self.sma_slow:
            self.close()
            
        # 止盈止损逻辑 (模拟)
        if self.position:
             pnl_pct = (self.data.close[0] - self.position.price) / self.position.price * 100
             if pnl_pct < -self.params.stop_loss or pnl_pct > self.params.take_profit:
                 self.close()
`,
  'SingleMA': `strategy.py                         Python 3.9

# Single Moving Average Strategy
# 单均线策略: 价格在均线上方买入，下方卖出

class SingleMAStrategy(Strategy):
    params = (
        ('period', 10),      # 均线周期
        ('stop_loss', 5),    # 止损 %
        ('take_profit', 15), # 止盈 %
    )

    def __init__(self):
        self.sma = bt.indicators.SMA(self.data.close, period=self.params.period)

    def next(self):
        if not self.position and self.data.close[0] > self.sma[0]:
            self.buy()
        elif self.position and self.data.close[0] < self.sma[0]:
            self.close()
            
        if self.position:
             pnl_pct = (self.data.close[0] - self.position.price) / self.position.price * 100
             if pnl_pct < -self.params.stop_loss or pnl_pct > self.params.take_profit:
                 self.close()
`,
  'SmallCap': `strategy.py                         Python 3.9

# Small Market Cap Strategy
# 小市值策略: 轮动持有市值最小的股票 (每月调仓)

class SmallCapStrategy(Strategy):
    params = (
        ('hold_count', 3),
        ('volume_ratio', 1.5), # 量比阈值
        ('pe_ratio', 30),      # 市盈率阈值
    )

    def __init__(self):
        self.last_month = -1

    def next(self):
        # 每月调仓逻辑：检测月份变化
        dt = self.data.datetime.date(0)
        if self.last_month == dt.month:
            return
            
        self.last_month = dt.month
        
        # 筛选符合量比和PE条件的股票
        candidates = [
            d for d in self.datas 
            if d.volume_ratio > self.params.volume_ratio 
            and d.pe < self.params.pe_ratio
        ]
        
        # 按市值排序
        sorted_stocks = sorted(candidates, key=lambda d: d.market_cap)
        target_stocks = sorted_stocks[:self.params.hold_count]
        
        # 卖出不在目标池的持仓
        for stock in self.position:
            if stock not in target_stocks:
                self.close(stock)
        
        # 买入目标池股票
        for stock in target_stocks:
            if not self.getposition(stock):
                self.buy(stock)
`,
  'Grid': `strategy.py                         Python 3.9

# Grid Trading Strategy
# 网格策略: 价格下跌买入，价格上涨卖出

class GridStrategy(Strategy):
    params = (
        ('grid_step', 2.0),  # 网格间距 %
        ('grid_size', 1000), # 每格交易数量
        ('stop_loss', 5),    # 止损 %
        ('take_profit', 15), # 止盈 %
    )

    def __init__(self):
        self.last_price = self.data.close[0]

    def next(self):
        price = self.data.close[0]
        step_val = self.params.grid_step / 100.0
        
        # 下跌超过步长，买入
        if price <= self.last_price * (1 - step_val):
            self.buy(size=self.params.grid_size)
            self.last_price = price
        # 上涨超过步长，卖出
        elif price >= self.last_price * (1 + step_val):
            self.sell(size=self.params.grid_size)
            self.last_price = price
`,
  'T0': `strategy.py                         Python 3.9

# Intraday T+0 Strategy (日内T0)
# 逻辑: 价格偏离昨收一定幅度反向开仓，获利或止损平仓

class IntradayT0Strategy(Strategy):
    params = (
        ('threshold', 0.5),   # 开仓偏离阈值 % (默认 0.5%)
        ('take_profit', 1.5), # 止盈 % (默认 1.5%)
        ('stop_loss', 1.0),   # 止损 % (默认 1.0%)
    )

    def next(self):
        prev_close = self.data.close[-1] # 昨日收盘价
        price = self.data.close[0]       # 当前价格
        
        # 1. 开仓逻辑
        if not self.position:
            # 做多T0: 价格 < 昨收 * (1 - 阈值) -> 低吸
            if price < prev_close * (1 - self.params.threshold / 100):
                self.buy()
            # 做空T0: 价格 > 昨收 * (1 + 阈值) -> 高抛
            elif price > prev_close * (1 + self.params.threshold / 100):
                self.sell()
                
        # 2. 平仓逻辑 (盈亏比 1.5 : 1)
        elif self.position:
            # 计算浮动盈亏比例
            if self.position.size > 0: # 持有多单
                 pnl_pct = (price - self.position.price) / self.position.price * 100
            else: # 持有空单
                 pnl_pct = (self.position.price - price) / self.position.price * 100
                 
            # 止盈或止损
            if pnl_pct >= self.params.take_profit or pnl_pct <= -self.params.stop_loss:
                self.close()
`,
  'LimitUp': `strategy.py                         Python 3.9

# Limit Up Strategy (Da Ban)
# 打板策略: 涨幅超过阈值(如9%)时扫板买入

class LimitUpStrategy(Strategy):
    params = (
        ('threshold', 9.0),  # 涨幅触发阈值 %
    )

    def next(self):
        prev_close = self.data.close[-1]
        price = self.data.close[0]
        
        # 计算当日涨幅
        pct_change = (price - prev_close) / prev_close * 100
        
        # 触发买入: 涨幅 > 9% 且当前无持仓
        if not self.position and pct_change > self.params.threshold:
            self.buy() 
            
        # 简单的次日卖出逻辑 (模拟)
        if self.position:
             # 如果开板或者次日择机卖出
             pass 
`
};

export const INITIAL_PYTHON_CODE = STRATEGY_CODES['DualMA'];

export const MOCK_TRADES: Trade[] = [
  { date: '2025-10-29', direction: 'Buy', price: 1233.31 },
  { date: '2025-10-30', direction: 'Sell', price: 1215.74, pl: -175.70 },
  { date: '2025-11-15', direction: 'Buy', price: 1240.50 },
  { date: '2025-11-20', direction: 'Sell', price: 1280.10, pl: 3960.00 },
  { date: '2025-12-01', direction: 'Buy', price: 1290.00 },
];

export const MOCK_LOGS: LogEntry[] = [
  { time: '17:07:25', level: LogLevel.INFO, message: '[数据] 验证标的权限 [OK]' },
  { time: '17:07:25', level: LogLevel.INFO, message: '[数据] 下载历史行情...' },
  { time: '17:07:25', level: LogLevel.SUCCESS, message: '[数据] 获取到 K线数据' },
  { time: '17:07:25', level: LogLevel.INFO, message: '[编译] 策略代码编译成功' },
  { time: '17:07:25', level: LogLevel.WARN, message: '[执行] 启动回测引擎...' },
  { time: '17:07:25', level: LogLevel.SUCCESS, message: '[交易] 策略执行完毕' },
  { time: '17:07:25', level: LogLevel.SUCCESS, message: '[统计] 权益结算完成' },
];

export const generateChartData = (initialCapital: number = 100000): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  let price = 1200;
  let equity = initialCapital;
  let position = 0; // 0 = cash, 1 = long

  for (let i = 0; i < 50; i++) {
    const change = (Math.random() - 0.40) * 30;
    const prevPrice = price;
    price += change;
    const ma5 = price + (Math.random() - 0.5) * 20;
    const ma20 = price + (Math.random() - 0.5) * 40;
    
    let signal: 'buy' | 'sell' | undefined = undefined;
    if (i === 10) signal = 'buy';
    if (i === 25) signal = 'sell';
    if (i === 35) signal = 'buy';

    // Simulate Equity
    if (signal === 'buy') {
        position = 1;
    } else if (signal === 'sell') {
        position = 0;
    }

    if (position === 1) {
        // Holding stock, equity changes with price percent change
        const pctChange = (price - prevPrice) / prevPrice;
        equity = equity * (1 + pctChange);
    } 
    // If position is 0, equity stays flat (ignoring interest)

    data.push({
      date: `2025-11-${(i + 1).toString().padStart(2, '0')}`,
      price: Math.round(price * 100) / 100,
      ma5: Math.round(ma5 * 100) / 100,
      ma20: Math.round(ma20 * 100) / 100,
      equity: Math.round(equity * 100) / 100,
      signal
    });
  }
  return data;
};
