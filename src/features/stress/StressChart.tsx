import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

import type { StressLevel, StressPoint } from './computeStress'

const SCORE_H = 142
const BARS_H = 64
const GAP_H = 28
const X_AXIS_H = 18
const HEIGHT = SCORE_H + GAP_H + BARS_H + X_AXIS_H
const PAD = { top: 22, right: 12, left: 28 }
const SCORE_GRID = [0, 25, 50, 75, 100]
const BAR_MAX_W = 8
const BAR_GAP = 2

const INK = 'var(--text-ink)'
const MUTED = 'var(--text-muted)'
const SURFACE = 'var(--bg-warm)'
const ADDED = 'var(--chart-added)'
const COMPLETED = 'var(--chart-completed)'

export const LEVEL_LABEL: Record<StressLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  critical: 'Very high',
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function shortDate(key: string): string {
  return parseKey(key).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function longDate(key: string): string {
  return parseKey(key).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Column with a rounded data-end and a square baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return ''
  const r = Math.min(2, w / 2, h)
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

function niceMax(n: number): number {
  if (n <= 4) return 4
  const step = n <= 10 ? 2 : n <= 25 ? 5 : 10
  return Math.ceil(n / step) * step
}

type StressChartProps = {
  points: StressPoint[]
}

export function StressChart({ points }: StressChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = points.length
  const last = n - 1
  const innerW = Math.max(0, width - PAD.left - PAD.right)
  const slot = n > 0 ? innerW / n : 0
  const x = (i: number) => PAD.left + slot * (i + 0.5)

  // Score panel
  const scoreTop = PAD.top
  const scoreH = SCORE_H - PAD.top
  const yScore = (s: number) => scoreTop + scoreH - (s / 100) * scoreH

  // Bars panel
  const barsTop = SCORE_H + GAP_H
  const barMax = niceMax(
    Math.max(0, ...points.map((p) => Math.max(p.added, p.completed))),
  )
  const yBar = (v: number) => barsTop + BARS_H - (v / barMax) * BARS_H
  const barW = Math.max(2, Math.min(BAR_MAX_W, (slot - 6 - BAR_GAP) / 2))

  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${yScore(p.score)}`)
    .join(' ')
  const area =
    n > 0 ? `${line} L${x(last)},${yScore(0)} L${x(0)},${yScore(0)} Z` : ''

  const xTicks = n > 2 ? [0, Math.floor(last / 2), last] : [0, last]

  const handlePointer = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const rel = (e.clientX - rect.left) / rect.width
    setActive(Math.min(last, Math.max(0, Math.floor(rel * n))))
  }

  const handleKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      const step = e.key === 'ArrowLeft' ? -1 : 1
      setActive((cur) => Math.min(last, Math.max(0, (cur ?? last) + step)))
    } else if (e.key === 'Escape') {
      setActive(null)
    }
  }

  const activePoint = active !== null ? points[active] : null
  const tooltipLeft =
    active !== null ? Math.min(Math.max(x(active), 70), width - 70) : 0

  return (
    <div ref={wrapRef} className="relative w-full">
      {width > 0 && n > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          tabIndex={0}
          aria-label={`Daily stress score and tasks added vs completed for the last ${n} days. Use arrow keys to read each day.`}
          onKeyDown={handleKey}
          onFocus={() => setActive((cur) => cur ?? last)}
          onBlur={() => setActive(null)}
          className="block rounded-brutal-sm outline-none focus-visible:ring-2 focus-visible:ring-pink"
        >
          {/* ── Score panel ── */}
          <text
            x={PAD.left}
            y={0}
            dy="0.8em"
            fontSize={10}
            fontWeight={700}
            letterSpacing="0.1em"
            fill={MUTED}
          >
            STRESS SCORE · LAST {n} DAYS
          </text>
          {SCORE_GRID.map((g) => (
            <g key={g}>
              <line
                x1={PAD.left}
                x2={PAD.left + innerW}
                y1={yScore(g)}
                y2={yScore(g)}
                stroke={INK}
                strokeOpacity={g === 0 ? 0.2 : 0.08}
              />
              {g > 0 && (
                <text
                  x={PAD.left - 6}
                  y={yScore(g)}
                  dy="0.32em"
                  textAnchor="end"
                  fontSize={10}
                  fill={MUTED}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {g}
                </text>
              )}
            </g>
          ))}
          <path d={area} fill={INK} fillOpacity={0.06} />
          <path
            d={line}
            fill="none"
            stroke={INK}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* ── Added vs completed panel ── */}
          <g transform={`translate(${PAD.left}, ${barsTop - 10})`}>
            <rect y={-7} width={8} height={8} rx={2} fill={ADDED} />
            <text x={12} y={0} fontSize={10} fill={MUTED}>
              Added
            </text>
            <rect x={56} y={-7} width={8} height={8} rx={2} fill={COMPLETED} />
            <text x={68} y={0} fontSize={10} fill={MUTED}>
              Completed
            </text>
          </g>
          {[barMax / 2, barMax].map((g) => (
            <g key={g}>
              <line
                x1={PAD.left}
                x2={PAD.left + innerW}
                y1={yBar(g)}
                y2={yBar(g)}
                stroke={INK}
                strokeOpacity={0.08}
              />
              <text
                x={PAD.left - 6}
                y={yBar(g)}
                dy="0.32em"
                textAnchor="end"
                fontSize={10}
                fill={MUTED}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {g}
              </text>
            </g>
          ))}
          {points.map((p, i) => {
            const cx = x(i)
            const dim = active !== null && active !== i
            return (
              <g key={p.date} opacity={dim ? 0.45 : 1}>
                <path
                  d={barPath(
                    cx - barW - BAR_GAP / 2,
                    yBar(p.added),
                    barW,
                    yBar(0) - yBar(p.added),
                  )}
                  fill={ADDED}
                />
                <path
                  d={barPath(
                    cx + BAR_GAP / 2,
                    yBar(p.completed),
                    barW,
                    yBar(0) - yBar(p.completed),
                  )}
                  fill={COMPLETED}
                />
              </g>
            )
          })}
          <line
            x1={PAD.left}
            x2={PAD.left + innerW}
            y1={yBar(0)}
            y2={yBar(0)}
            stroke={INK}
            strokeOpacity={0.2}
          />

          {xTicks.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={HEIGHT - 4}
              textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'}
              dx={i === 0 ? -barW : i === last ? barW : 0}
              fontSize={10}
              fill={MUTED}
            >
              {i === last ? 'Today' : shortDate(points[i].date)}
            </text>
          ))}

          {/* ── Crosshair + markers ── */}
          {activePoint && active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={scoreTop}
              y2={yBar(0)}
              stroke={INK}
              strokeOpacity={0.25}
            />
          )}
          <circle
            cx={x(last)}
            cy={yScore(points[last].score)}
            r={4}
            fill={INK}
            stroke={SURFACE}
            strokeWidth={2}
          />
          {activePoint && active !== null && active !== last && (
            <circle
              cx={x(active)}
              cy={yScore(activePoint.score)}
              r={4}
              fill={INK}
              stroke={SURFACE}
              strokeWidth={2}
            />
          )}

          <rect
            x={PAD.left}
            y={0}
            width={innerW}
            height={HEIGHT}
            fill="transparent"
            onPointerMove={handlePointer}
            onPointerDown={handlePointer}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      )}

      {activePoint && (
        <div
          className="pointer-events-none absolute top-4 -translate-x-1/2 whitespace-nowrap rounded-brutal-sm border-2 border-ink/15 bg-warm px-3 py-2 shadow-brutal-soft dark:border-dark-ink/15 dark:bg-dark-warm dark:shadow-brutal-soft-dark"
          style={{ left: tooltipLeft }}
        >
          <div className="mb-1 text-xs text-muted dark:text-dark-muted">
            {longDate(activePoint.date)}
          </div>
          <div className="text-sm text-ink dark:text-dark-ink">
            <span className="font-bold">{activePoint.score}</span>{' '}
            <span className="text-muted dark:text-dark-muted">
              stress · {LEVEL_LABEL[activePoint.level]}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-sm text-ink dark:text-dark-ink">
            <span
              className="h-0.5 w-3 rounded-full"
              style={{ background: ADDED }}
            />
            <span className="font-bold">{activePoint.added}</span>
            <span className="text-muted dark:text-dark-muted">added</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-ink dark:text-dark-ink">
            <span
              className="h-0.5 w-3 rounded-full"
              style={{ background: COMPLETED }}
            />
            <span className="font-bold">{activePoint.completed}</span>
            <span className="text-muted dark:text-dark-muted">completed</span>
          </div>
        </div>
      )}

      <table className="sr-only">
        <caption>Daily stress score and task activity</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Score</th>
            <th scope="col">Level</th>
            <th scope="col">Added</th>
            <th scope="col">Completed</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <td>{longDate(p.date)}</td>
              <td>{p.score}</td>
              <td>{LEVEL_LABEL[p.level]}</td>
              <td>{p.added}</td>
              <td>{p.completed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
