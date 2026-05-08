'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

type CandleInterval = '1m' | '5m' | '15m' | '1h' | '4h'

interface Candle {
  time:   number
  open:   number
  high:   number
  low:    number
  close:  number
  volume: number
}

interface Props {
  mint:     string
  symbol:   string
  height?:  number
}

const INTERVALS: { value: CandleInterval; label: string }[] = [
  { value: '1m',  label: '1m'  },
  { value: '5m',  label: '5m'  },
  { value: '15m', label: '15m' },
  { value: '1h',  label: '1h'  },
  { value: '4h',  label: '4h'  },
]

export function TokenChart({ mint, symbol, height = 420 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<any>(null)
  const candleRef    = useRef<any>(null)
  const volumeRef    = useRef<any>(null)

  const [interval,   setInterval_]    = useState<CandleInterval>('5m')
  const [candles,    setCandles]      = useState<Candle[]>([])
  const [loading,    setLoading]      = useState(true)
  const [lastPrice,  setLastPrice]    = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [chartReady, setChartReady]   = useState(false)
  const [isSimulated, setIsSimulated] = useState(false)

  // ── Helper: Generate simulated data ────────────────────────────────────────
  const generateSimulatedCandles = (seedStr: string, iv: CandleInterval): Candle[] => {
    // Basic deterministic random based on mint
    let seed = 0
    for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i)
    
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    const count = 100
    const now = Math.floor(Date.now() / 1000)
    const step = iv === '1m' ? 60 : iv === '5m' ? 300 : iv === '15m' ? 900 : iv === '1h' ? 3600 : 14400
    
    let price = 0.000001
    const result: Candle[] = []
    
    for (let i = 0; i < count; i++) {
      const time = now - (count - i) * step
      const open = price
      // Simulate typical bonding curve growth (pump)
      const change = (random() - 0.4) * 0.1 * price // biased upwards
      const close = price + change
      const high = Math.max(open, close) + (random() * 0.02 * price)
      const low = Math.min(open, close) - (random() * 0.02 * price)
      const volume = random() * 1000000
      
      result.push({ time, open, high, low, close, volume })
      price = close
    }
    return result
  }

  // ── Load candle data ────────────────────────────────────────────────────────
  const loadCandles = useCallback(async (iv: CandleInterval) => {
    try {
      const res  = await fetch(`/api/tokens/${mint}/candles?interval=${iv}&limit=500`)
      const data = await res.json()
      
      if (data.candles && data.candles.length > 5) {
        setCandles(data.candles)
        setIsSimulated(false)
        const last  = data.candles[data.candles.length - 1]
        const first = data.candles[0]
        setLastPrice(last.close)
        setPriceChange(first.open > 0 ? ((last.close - first.open) / first.open) * 100 : 0)
      } else {
        // Fallback to simulation
        const sim = generateSimulatedCandles(mint, iv)
        setCandles(sim)
        setIsSimulated(true)
        const last = sim[sim.length - 1]
        const first = sim[0]
        setLastPrice(last.close)
        setPriceChange(((last.close - first.open) / first.open) * 100)
      }
    } catch { 
        // Fallback on error
        const sim = generateSimulatedCandles(mint, iv)
        setCandles(sim)
        setIsSimulated(true)
    }
    finally { setLoading(false) }
  }, [mint])

  // ── Init chart ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true

    const init = async () => {
      if (!containerRef.current) return

      try {
        const lc = await import('lightweight-charts')
        const { createChart } = lc
        const CandlestickSeries = (lc as any).CandlestickSeries
        const HistogramSeries   = (lc as any).HistogramSeries
        const CrosshairMode     = (lc as any).CrosshairMode
        const LineStyle         = (lc as any).LineStyle

        if (!mounted || !containerRef.current) return

        // Destroy previous chart
        if (chartRef.current) {
          try { chartRef.current.remove() } catch { /* ignore */ }
          chartRef.current = null
        }

        const chart = createChart(containerRef.current, {
          width:   containerRef.current.clientWidth,
          height,
          layout: {
            background:  { color: '#080808' },
            textColor:   '#666',
            fontSize:    11,
            fontFamily:  'monospace',
          },
          grid: {
            vertLines:   { color: 'rgba(255,26,26,0.04)', style: LineStyle?.Dotted ?? 1 },
            horzLines:   { color: 'rgba(255,26,26,0.04)', style: LineStyle?.Dotted ?? 1 },
          },
          crosshair: {
            mode:     CrosshairMode?.Normal ?? 1,
            vertLine: { color: 'rgba(255,26,26,0.4)', labelBackgroundColor: '#1a0000' },
            horzLine: { color: 'rgba(255,26,26,0.4)', labelBackgroundColor: '#1a0000' },
          },
          rightPriceScale: {
            borderColor:  'rgba(255,26,26,0.1)',
            scaleMargins: { top: 0.1, bottom: 0.25 },
          },
          timeScale: {
            borderColor:    'rgba(255,26,26,0.1)',
            timeVisible:    true,
            secondsVisible: false,
            barSpacing:     8,
          },
          handleScroll: true,
          handleScale:  true,
        } as any)

        // Candlestick series (v4 vs v5 compatible)
        let candleSeries: any
        let volumeSeries: any
        if (typeof (chart as any).addSeries === 'function' && CandlestickSeries) {
          // v5 API
          candleSeries = (chart as any).addSeries(CandlestickSeries, {
            upColor:         '#22c55e',
            downColor:       '#ff1a1a',
            borderUpColor:   '#22c55e',
            borderDownColor: '#ff1a1a',
            wickUpColor:     '#22c55e',
            wickDownColor:   '#ff1a1a',
          })
          volumeSeries = (chart as any).addSeries(HistogramSeries, {
            color:       'rgba(255,26,26,0.15)',
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
          })
        } else {
          // v4 API fallback
          candleSeries = (chart as any).addCandlestickSeries({
            upColor:         '#22c55e',
            downColor:       '#ff1a1a',
            borderUpColor:   '#22c55e',
            borderDownColor: '#ff1a1a',
            wickUpColor:     '#22c55e',
            wickDownColor:   '#ff1a1a',
          })
          volumeSeries = (chart as any).addHistogramSeries({
            color:       'rgba(255,26,26,0.15)',
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
          })
        }
        try {
          chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
        } catch { /* ignore if priceScaleId not supported */ }

        chartRef.current  = chart
        candleRef.current = candleSeries
        volumeRef.current = volumeSeries

        // Responsive resize
        const resizeObs = new ResizeObserver(entries => {
          for (const entry of entries) {
            chart.applyOptions({ width: entry.contentRect.width })
          }
        })
        resizeObs.observe(containerRef.current)

        setChartReady(true)

        return () => resizeObs.disconnect()
      } catch (err) {
        console.error('[TokenChart] init error', err)
      }
    }

    init()
    return () => { mounted = false }
  }, [height])

  // ── Update chart data when candles change ───────────────────────────────────
  useEffect(() => {
    if (!chartReady || !candleRef.current || !volumeRef.current) return
    if (candles.length === 0) return

    const candleData = candles.map(c => ({
      time:  c.time as any,
      open:  c.open,
      high:  c.high,
      low:   c.low,
      close: c.close,
    }))

    const volumeData = candles.map(c => ({
      time:  c.time as any,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(34,197,94,0.2)' : 'rgba(255,26,26,0.2)',
    }))

    try {
      candleRef.current.setData(candleData)
      volumeRef.current.setData(volumeData)
      chartRef.current?.timeScale().fitContent()
    } catch { /* lightweight-charts can throw on duplicate times */ }
  }, [candles, chartReady])

  // ── Load candles + poll every 5s ───────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    loadCandles(interval)
    const id = setInterval(() => loadCandles(interval), 5_000)
    return () => clearInterval(id)
  }, [interval, loadCandles])

  // ── Price format helper ────────────────────────────────────────────────────
  const fmtPrice = (p: number) => {
    if (p < 0.000001) return p.toExponential(4)
    if (p < 0.01)     return p.toFixed(8)
    return p.toFixed(6)
  }

  return (
    <div className="w-full flex flex-col bg-[#080808] border border-red-900/20 rounded-sm overflow-hidden">
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 sm:py-2.5 border-b border-red-900/10 gap-3 sm:gap-4">
        {/* Symbol + price */}
        <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-xs font-black text-white font-mono uppercase tracking-wider truncate">
              {symbol}/SOL
            </span>
            {lastPrice !== null && (
              <span className="text-[10px] sm:text-xs font-mono text-white">
                {fmtPrice(lastPrice)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {priceChange !== 0 && (
              <span className={`text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded ${
                priceChange >= 0 ? 'text-green-400 bg-green-950/20' : 'text-red-400 bg-red-950/20'
              }`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            )}
            {isSimulated && (
              <span className="text-[7px] sm:text-[8px] font-mono text-white/20 uppercase tracking-[0.2em] border border-white/5 px-2 py-0.5 animate-pulse">
                SIM
              </span>
            )}
          </div>
        </div>

        {/* Interval selector */}
        <div className="flex gap-0.5 w-full sm:w-auto justify-between sm:justify-start overflow-x-auto no-scrollbar sm:overflow-visible">
          {INTERVALS.map(iv => (
            <button
              key={iv.value}
              onClick={() => setInterval_(iv.value)}
              className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all rounded-sm ${
                interval === iv.value
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : 'text-gray-600 hover:text-gray-400 border border-transparent hover:border-red-900/20'
              }`}
            >
              {iv.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart area ────────────────────────────────────────────────────── */}
      <div className="relative" style={{ height }}>
        <div ref={containerRef} className="w-full h-full" />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#080808]/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border border-red-900/30 border-t-red-500 rounded-full animate-spin" />
              <span className="text-[9px] text-gray-700 font-mono uppercase tracking-widest">Loading chart...</span>
            </div>
          </div>
        )}

        {/* No data overlay - Removed since we use simulation fallback */}
      </div>
    </div>
  )
}
