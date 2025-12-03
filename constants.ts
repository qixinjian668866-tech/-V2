
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

// Helper to generate a hash from inputs
const getHash = (inputs: string) => {
    let hash = 0;
    for (let i = 0; i < inputs.length; i++) {
        const char = inputs.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return hash;
};

export const generateDeterministicMetrics = (
    strategy: StrategyType, 
    stockCode: string, 
    config: StrategyConfig
): Metrics => {
    const signature = `${strategy}-${stockCode}-${JSON.stringify(config)}`;
    const hash = getHash(signature);

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

export const generateDeterministicTrades = (
    strategy: StrategyType,
    stockCode: string,
    config: StrategyConfig
): Trade[] => {
    const signature = `${strategy}-${stockCode}-${JSON.stringify(config)}`;
    const hash = getHash(signature);
    const trades: Trade[] = [];

    // Probability of trade per day (approx)
    let tradeProb = 0.02; // Default for trend strategies
    let holdDurationMean = 10; 

    if (strategy === 'T0') {
        tradeProb = 0.3; // High frequency
        holdDurationMean = 1;
    } else if (strategy === 'Grid') {
        tradeProb = 0.15;
        holdDurationMean = 3;
    } else if (strategy === 'LimitUp') {
        tradeProb = 0.05;
        holdDurationMean = 2;
    } else if (strategy === 'SmallCap') {
        tradeProb = 0.05; // Monthly-ish logic simulated via probability
        holdDurationMean = 20;
    }

    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    
    let currentDate = new Date(start);
    let holding = false;
    let entryPrice = 0;
    let basePrice = 1000 + pseudoRandom(hash) * 1000; // Start price 1000-2000
    let dayCounter = 0;

    // Helper to get consistent random for a specific day
    const getDailyVal = (offset: number) => pseudoRandom(Math.abs(hash + dayCounter * 100 + offset));

    while (currentDate <= end) {
        // Skip weekends
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
        }

        const dateStr = currentDate.toISOString().split('T')[0];
        const dailyRand = getDailyVal(0); // 0-1
        
        // Evolve price trend slightly
        const volatility = strategy === 'T0' ? 0.015 : 0.03;
        basePrice = basePrice * (1 + (getDailyVal(1) - 0.5) * volatility);
        if (basePrice < 1) basePrice = 1;

        if (holding) {
            // Check Exit
            const daysLeft = (end.getTime() - currentDate.getTime()) / (1000 * 3600 * 24);
            const forceExit = daysLeft <= 1; // Close before end
            
            // Random exit logic based on hold duration mean
            // simplistic poisson-like check
            const exitProb = 1 / holdDurationMean;
            const shouldExit = forceExit || (getDailyVal(2) < exitProb);

            if (shouldExit) {
                // Calculate P/L
                const isWin = getDailyVal(3) > 0.45; // Base win rate 55%
                let returnPct = 0;
                
                if (isWin) {
                    // Win: 0.5% to TakeProfit%
                    const maxTp = config.takeProfit || 10;
                    returnPct = (0.5 + getDailyVal(4) * maxTp) / 100;
                } else {
                    // Loss: -0.5% to -StopLoss%
                    const maxSl = config.stopLoss || 5;
                    returnPct = -(0.5 + getDailyVal(4) * maxSl) / 100;
                }

                // T0 overrides
                if (strategy === 'T0') returnPct *= 0.2;
                if (strategy === 'LimitUp' && isWin) returnPct = 0.09 + getDailyVal(5)*0.02; // ~9-11%

                const sellPrice = entryPrice * (1 + returnPct);
                
                // Position Sizing P/L
                const positionSize = config.initialCapital * 0.5;
                const shares = Math.floor(positionSize / entryPrice);
                const pl = (sellPrice - entryPrice) * shares;

                trades.push({
                    date: dateStr,
                    direction: 'Sell',
                    price: Number(sellPrice.toFixed(2)),
                    pl: Number(pl.toFixed(2))
                });

                holding = false;
                // Update base price to match reality
                basePrice = sellPrice;
            }

        } else {
            // Check Entry
            if (getDailyVal(5) < tradeProb) {
                entryPrice = basePrice;
                trades.push({
                    date: dateStr,
                    direction: 'Buy',
                    price: Number(entryPrice.toFixed(2))
                });
                holding = true;
            }
        }

        // Next Day
        currentDate.setDate(currentDate.getDate() + 1);
        dayCounter++;
    }

    return trades;
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
# 打板策略: 涨幅超标且量比、涨速达标时扫板买入

class LimitUpStrategy(Strategy):
    params = (
        ('threshold', 9.0),       # 涨幅触发阈值 %
        ('volume_ratio', 1.2),    # 量比阈值
        ('speed_threshold', 3.0), # 1分钟涨速阈值 %
    )

    def next(self):
        prev_close = self.data.close[-1]
        price = self.data.close[0]
        
        # 计算当日涨幅
        pct_change = (price - prev_close) / prev_close * 100
        
        # 模拟数据获取：量比和1分钟涨速
        # 实际交易中需分钟线数据计算
        current_volume_ratio = self.data.volume_ratio[0]
        current_speed = self.data.speed_1m[0]

        # 触发买入: 
        # 1. 涨幅 > 阈值 (如 9%)
        # 2. 量比 > 阈值 (如 1.2)
        # 3. 1分钟涨速 > 阈值 (如 3%)
        if not self.position:
             if (pct_change > self.params.threshold and 
                 current_volume_ratio > self.params.volume_ratio and
                 current_speed > self.params.speed_threshold):
                 self.buy() 
            
        # 简单的次日卖出逻辑
        if self.position:
             pass 
`
};

export const INITIAL_PYTHON_CODE = STRATEGY_CODES['DualMA'];

export const MOCK_LOGS: LogEntry[] = [
  { time: '17:07:25', level: LogLevel.INFO, message: '[数据] 验证标的权限 [OK]' },
  { time: '17:07:25', level: LogLevel.INFO, message: '[数据] 下载历史行情...' },
  { time: '17:07:25', level: LogLevel.SUCCESS, message: '[数据] 获取到 K线数据' },
  { time: '17:07:25', level: LogLevel.INFO, message: '[编译] 策略代码编译成功' },
  { time: '17:07:25', level: LogLevel.WARN, message: '[执行] 启动回测引擎...' },
  { time: '17:07:25', level: LogLevel.SUCCESS, message: '[交易] 策略执行完毕' },
  { time: '17:07:25', level: LogLevel.SUCCESS, message: '[统计] 权益结算完成' },
];

export const generateChartData = (
    initialCapital: number, 
    trades: Trade[],
    startDateStr: string,
    endDateStr: string
): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  
  // Create a map of trades for easier lookup
  const tradesMap = new Map<string, Trade>();
  trades.forEach(t => tradesMap.set(t.date, t));

  // Parse Dates
  const currentDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  let price = trades.length > 0 ? trades[0].price * 0.95 : 1220; // Start slightly below first trade or default
  let equity = initialCapital;
  let position = 0; // 0 = cash, 1 = long
  let shares = 0;
  
  const closePrices: number[] = [];

  while (currentDate <= endDate) {
      // 1. Format date as YYYY-MM-DD
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const dayOfWeek = currentDate.getDay(); // 0=Sun, 6=Sat
      const tradeToday = tradesMap.get(dateStr);

      // Skip weekends unless there is a forced trade
      if ((dayOfWeek === 0 || dayOfWeek === 6) && !tradeToday) {
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
      }

      // 2. Determine Price & Signal
      let signal: 'buy' | 'sell' | undefined = undefined;

      if (tradeToday) {
          price = tradeToday.price;
          if (tradeToday.direction === 'Buy') {
              signal = 'buy';
              if (position === 0) {
                  position = 1;
                  shares = equity / price; 
              }
          } else {
              signal = 'sell';
              if (position === 1) {
                  position = 0;
                  equity = shares * price;
                  shares = 0;
              }
          }
      } else {
          // Smooth random walk for non-trade days
          const seed = currentDate.getTime();
          const change = (Math.sin(seed) * (price * 0.01)) + ((Math.random() - 0.5) * (price * 0.02)); 
          price += change;
      }

      // Sanity check
      if (price < 1) price = 1;

      // 3. Update Equity
      if (position === 1 && !tradeToday) {
          // Holding stock, equity floats with price
          equity = shares * price;
      }

      closePrices.push(price);

      // 4. Calculate MAs
      const ma5 = closePrices.slice(-5).reduce((a, b) => a + b, 0) / Math.min(closePrices.length, 5);
      const ma10 = closePrices.slice(-10).reduce((a, b) => a + b, 0) / Math.min(closePrices.length, 10);

      data.push({
          date: dateStr,
          price: Number(price.toFixed(2)),
          ma5: Number(ma5.toFixed(2)),
          ma20: Number(ma10.toFixed(2)), // UI displays this as MA10
          equity: Number(equity.toFixed(2)),
          signal,
          pl: tradeToday?.pl
      });

      // Increment day
      currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return data;
};
