"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  CandlestickSeriesPartialOptions,
  CandlestickSeries,
  AreaSeries,
} from "lightweight-charts";

export interface CandleDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CandlestickChartProps {
  data: CandleDataPoint[];
  height?: number;
  showVolume?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
  onCrosshairMove?: (price: number | null, time: Time | null) => void;
}

// Theme colors matching globals.css
const CHART_THEME = {
  background: "transparent",
  textColor: "#888888",
  gridColor: "rgba(38, 38, 38, 0.5)",
  borderColor: "#262626",
  upColor: "#4ade80",
  downColor: "#f87171",
  wickUpColor: "#4ade80",
  wickDownColor: "#f87171",
  crosshairColor: "#888888",
  lineColor: "#888888",
};

export function CandlestickChart({
  data,
  height = 300,
  title,
  subtitle,
  className = "",
  onCrosshairMove,
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);

  // Format candle data for lightweight-charts
  const formatData = useCallback((candles: CandleDataPoint[]): CandlestickData<Time>[] => {
    return candles
      .filter((c) => c.timestamp && !isNaN(c.timestamp))
      .map((c) => ({
        time: (c.timestamp / 1000) as Time, // Convert ms to seconds
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));
  }, []);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;

    // Create chart
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_THEME.background },
        textColor: CHART_THEME.textColor,
        fontFamily: "system-ui, sans-serif",
      },
      width: container.clientWidth,
      height: height,
      grid: {
        vertLines: { color: CHART_THEME.gridColor, style: 1 },
        horzLines: { color: CHART_THEME.gridColor, style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: CHART_THEME.crosshairColor,
          width: 1,
          style: 2,
          labelBackgroundColor: "#333333",
        },
        horzLine: {
          color: CHART_THEME.crosshairColor,
          width: 1,
          style: 2,
          labelBackgroundColor: "#333333",
        },
      },
      rightPriceScale: {
        borderColor: CHART_THEME.borderColor,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: CHART_THEME.borderColor,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 12,
        minBarSpacing: 4,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    // Candlestick series options
    const candlestickOptions: CandlestickSeriesPartialOptions = {
      upColor: CHART_THEME.upColor,
      downColor: CHART_THEME.downColor,
      wickUpColor: CHART_THEME.wickUpColor,
      wickDownColor: CHART_THEME.wickDownColor,
      borderVisible: false,
      priceFormat: {
        type: "price",
        precision: 8,
        minMove: 0.00000001,
      },
    };

    const candlestickSeries = chart.addSeries(CandlestickSeries, candlestickOptions);

    // Subscribe to crosshair move
    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.seriesData.size > 0) {
        const data = param.seriesData.get(candlestickSeries);
        if (data && "close" in data) {
          setCurrentPrice(data.close);
          onCrosshairMove?.(data.close, param.time);
        }
      } else {
        setCurrentPrice(null);
        onCrosshairMove?.(null, null);
      }
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height, onCrosshairMove]);

  // Update data when it changes
  useEffect(() => {
    if (!seriesRef.current || !data || data.length === 0) return;

    const formattedData = formatData(data);
    if (formattedData.length > 0) {
      seriesRef.current.setData(formattedData);

      // Calculate price change
      const firstCandle = formattedData[0];
      const lastCandle = formattedData[formattedData.length - 1];
      if (firstCandle.open > 0) {
        const change = ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100;
        setPriceChange(change);
      }

      // Fit content
      chartRef.current?.timeScale().fitContent();
    }
  }, [data, formatData]);

  const isPositive = priceChange !== null && priceChange >= 0;

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      {(title || subtitle) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-lg font-bold text-[color:var(--sf-text)]">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-[color:var(--sf-muted)]">{subtitle}</p>
            )}
          </div>
          {priceChange !== null && (
            <div
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                isPositive
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {isPositive ? "+" : ""}
              {priceChange.toFixed(2)}%
            </div>
          )}
        </div>
      )}

      {/* Current price tooltip */}
      {currentPrice !== null && (
        <div className="absolute top-2 right-2 z-10 px-3 py-1 rounded-lg bg-[color:var(--sf-surface)] border border-[color:var(--sf-outline)] text-sm">
          <span className="text-[color:var(--sf-muted)]">Price: </span>
          <span className="text-[color:var(--sf-text)] font-mono font-bold">
            {currentPrice.toFixed(8)}
          </span>
        </div>
      )}

      {/* Chart container */}
      <div
        ref={chartContainerRef}
        className="rounded-lg overflow-hidden"
        style={{
          background: "var(--sf-surface)",
          border: "1px solid var(--sf-outline)",
        }}
      />

      {/* No data state */}
      {(!data || data.length === 0) && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl"
          style={{
            background: "rgba(20, 20, 20, 0.9)",
          }}
        >
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[color:var(--sf-surface)] flex items-center justify-center">
              <svg
                className="w-6 h-6 text-[color:var(--sf-muted)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <p className="text-[color:var(--sf-muted)]">Loading chart data...</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact mini chart for cards and widgets
 */
export function MiniCandlestickChart({
  data,
  height = 80,
  className = "",
}: {
  data: CandleDataPoint[];
  height?: number;
  className?: string;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "transparent",
      },
      width: container.clientWidth,
      height: height,
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      crosshair: {
        mode: CrosshairMode.Hidden,
      },
      rightPriceScale: {
        visible: false,
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        visible: false,
      },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: CHART_THEME.upColor,
      downColor: CHART_THEME.downColor,
      wickUpColor: CHART_THEME.wickUpColor,
      wickDownColor: CHART_THEME.wickDownColor,
      borderVisible: false,
    });

    // Format and set data
    if (data && data.length > 0) {
      const formattedData = data
        .filter((c) => c.timestamp && !isNaN(c.timestamp))
        .map((c) => ({
          time: (c.timestamp / 1000) as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
        .sort((a, b) => (a.time as number) - (b.time as number));

      series.setData(formattedData);
      chart.timeScale().fitContent();
    }

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, height]);

  return (
    <div
      ref={chartContainerRef}
      className={`overflow-hidden ${className}`}
      style={{ height }}
    />
  );
}

/**
 * Area chart variant for simpler price display
 */
export function AreaPriceChart({
  data,
  height = 120,
  className = "",
  showGradient = true,
}: {
  data: CandleDataPoint[];
  height?: number;
  className?: string;
  showGradient?: boolean;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [hoverPrice, setHoverPrice] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<string | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "transparent",
      },
      width: container.clientWidth,
      height: height,
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: {
          color: "rgba(255, 255, 255, 0.3)",
          width: 1,
          style: 2,
          labelVisible: false,
        },
        horzLine: {
          visible: false,
          labelVisible: false,
        },
      },
      rightPriceScale: {
        visible: false,
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        visible: false,
      },
      handleScroll: false,
      handleScale: false,
    });

    // Determine if overall trend is up or down
    const isUptrend =
      data.length >= 2 && data[data.length - 1].close >= data[0].open;

    const lineColor = isUptrend ? CHART_THEME.upColor : CHART_THEME.downColor;

    const series = chart.addSeries(AreaSeries, {
      lineColor: lineColor,
      topColor: showGradient
        ? isUptrend
          ? "rgba(74, 222, 128, 0.2)"
          : "rgba(248, 113, 113, 0.2)"
        : "transparent",
      bottomColor: "transparent",
      lineWidth: 2,
      priceFormat: {
        type: "price",
        precision: 8,
        minMove: 0.00000001,
      },
    });

    // Format and set data - use close prices
    if (data && data.length > 0) {
      const formattedData = data
        .filter((c) => c.timestamp && !isNaN(c.timestamp))
        .map((c) => ({
          time: (c.timestamp / 1000) as Time,
          value: c.close,
        }))
        .sort((a, b) => (a.time as number) - (b.time as number))
        // Remove duplicates by time, keeping the last one
        .reduce((acc, curr, index, arr) => {
          if (index === 0 || curr.time !== arr[index - 1].time) {
            acc.push(curr);
          } else {
            acc[acc.length - 1] = curr;
          }
          return acc;
        }, [] as Array<{ time: Time; value: number }>);

      series.setData(formattedData);
      chart.timeScale().fitContent();
    }

    // Subscribe to crosshair move for hover details
    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.seriesData.size > 0) {
        const priceData = param.seriesData.get(series);
        if (priceData && "value" in priceData) {
          setHoverPrice(priceData.value);
          const date = new Date((param.time as number) * 1000);
          setHoverTime(date.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }));
        }
      } else {
        setHoverPrice(null);
        setHoverTime(null);
      }
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, height, showGradient]);

  return (
    <div className={`relative ${className}`}>
      {hoverPrice !== null && (
        <div className="absolute top-1 left-1 z-10 px-2 py-1 rounded bg-[color:var(--sf-surface)]/90 border border-[color:var(--sf-outline)] text-xs">
          <span className="text-[color:var(--sf-text)] font-mono">{hoverPrice.toFixed(8)}</span>
          {hoverTime && (
            <span className="text-[color:var(--sf-muted)] ml-2">{hoverTime}</span>
          )}
        </div>
      )}
      <div
        ref={chartContainerRef}
        className="overflow-hidden"
        style={{ height }}
      />
    </div>
  );
}
