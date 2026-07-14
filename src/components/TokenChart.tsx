"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  LineSeries,
} from "lightweight-charts";

interface TokenChartProps {
  mint: string;
}

const TIMEFRAMES = [
  { label: "1H", value: "1h" },
  { label: "4H", value: "4h" },
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
  { label: "1M", value: "1m" },
];

export default function TokenChart({ mint }: TokenChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [timeframe, setTimeframe] = useState("1d");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#e0e0e0",
      },
      grid: {
        vertLines: { color: "#2a2a2a" },
        horzLines: { color: "#2a2a2a" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: "#4edea3",
      lineWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = lineSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    const fetchChartData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/tokens/${mint}/chart?timeframe=${timeframe}`,
        );
        const data = await res.json();

        if (seriesRef.current && data.data) {
          seriesRef.current.setData(
            data.data.map((d: any) => ({
              time: d.time / 1000,
              value: d.close,
            })),
          );
        }
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
  }, [mint, timeframe]);

  return (
    <div className="relative">
      {/* Timeframe Selector */}
      <div className="flex gap-xs mb-md overflow-x-auto hide-scrollbar pb-xs">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setTimeframe(tf.value)}
            className={`px-sm py-xs rounded font-mono text-[12px] whitespace-nowrap transition-colors shrink-0 ${
              timeframe === tf.value
                ? "bg-primary text-background"
                : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-container/50">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
