import { useState } from 'react'
import { Activity, ChevronDown } from 'lucide-react'

import type { StressLevel } from './computeStress'
import { LEVEL_LABEL, StressChart } from './StressChart'
import { useStressLevel } from './useStressLevel'

const LEVEL_META: Record<StressLevel, { bar: string; tip: string }> = {
  low: {
    bar: 'bg-sage',
    tip: 'Workload looks manageable. Nice pace!',
  },
  moderate: {
    bar: 'bg-pink',
    tip: 'Tasks are building up. Finish what you started before adding more.',
  },
  high: {
    bar: 'bg-pink-deep',
    tip: 'More is coming in than going out. Drop or postpone a few tasks.',
  },
  critical: {
    bar: 'bg-rose',
    tip: 'Too much on your plate. Pick the top 1–3 tasks and take a break.',
  },
}

type StressMeterProps = {
  workspaceId: string | null
}

export function StressMeter({ workspaceId }: StressMeterProps) {
  const [open, setOpen] = useState(false)
  const { score, level, factors, history, isLoading } =
    useStressLevel(workspaceId)
  const meta = LEVEL_META[level]

  if (isLoading) return null

  return (
    <section className="mb-4 rounded-brutal-sm border-2 border-ink/15 bg-warm px-4 py-3 dark:border-dark-ink/15 dark:bg-dark-warm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <Activity className="h-4 w-4 shrink-0 text-muted dark:text-dark-muted" />
        <span className="text-xs font-bold uppercase tracking-widest text-muted dark:text-dark-muted">
          Stress level
        </span>
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-ivory"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={score}
          aria-label={`Stress level ${score} of 100, ${LEVEL_LABEL[level]}`}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${meta.bar}`}
            style={{ width: `${Math.max(score, 2)}%` }}
          />
        </div>
        <span className="text-sm font-bold text-ink dark:text-dark-ink">
          {LEVEL_LABEL[level]}
        </span>
        <span className="w-8 text-right text-sm tabular-nums text-muted dark:text-dark-muted">
          {score}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform dark:text-dark-muted ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="mt-3 border-t-2 border-ink/10 pt-3 dark:border-dark-ink/10">
          <StressChart points={history} />
          <p className="mb-2 mt-3 text-sm text-ink dark:text-dark-ink">
            {meta.tip}
          </p>
          {factors.length === 0 ? (
            <p className="text-sm text-muted dark:text-dark-muted">
              No stress factors right now.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {factors.map((f) => (
                <li
                  key={f.key}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="text-ink dark:text-dark-ink">
                    <span className="font-medium">{f.label}</span>
                    <span className="text-muted dark:text-dark-muted">
                      {' '}
                      · {f.detail}
                    </span>
                  </span>
                  <span
                    className={`tabular-nums font-bold ${
                      f.points < 0
                        ? 'text-ink dark:text-dark-ink'
                        : 'text-pink-deep dark:text-dark-pink-deep'
                    }`}
                  >
                    {f.points > 0 ? `+${f.points}` : f.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
