
export interface StrategyConfig {
  // Global Params
  initialCapital: number;

  // Date Range
  startDate: string;
  endDate: string;

  // MA Params
  shortPeriod: number;
  longPeriod: number;
  
  // Risk Params
  stopLoss: number;
  takeProfit: number;
  
  // Small Cap Params
  volumeRatio: number;
  peRatio: number;

  // Grid Params
  gridStep: number;
  gridSize: number;

  // T0 Params
  t0Threshold: number; // deviation from prev close
  t0TakeProfit: number;
  t0StopLoss: number;

  // Limit Up Params
  limitUpThreshold: number;
  limitUpVolumeRatio: number;
  limitUpSpeedThreshold: number;
}

export interface Stock {
  code: string;
  name: string;
}

export interface Trade {
  date: string;
  direction: 'Buy' | 'Sell';
  price: number;
  pl?: number;
}

export interface ChartDataPoint {
  date: string;
  price: number;
  ma5: number;
  ma20: number;
  equity?: number;
  signal?: 'buy' | 'sell';
  pl?: number;
}

export interface Metric {
  label: string;
  value: string;
  color?: string;
}

export interface Metrics {
  annualReturn: string;
  benchmarkReturn: string;
  sharpeRatio: string;
  maxDrawdown: string;
  winRate: string;
  tradeCount: string;
}

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
}

export interface LogEntry {
  time: string;
  level: LogLevel;
  message: string;
}

export type StrategyType = 'DualMA' | 'SingleMA' | 'SmallCap' | 'Grid' | 'T0' | 'LimitUp';