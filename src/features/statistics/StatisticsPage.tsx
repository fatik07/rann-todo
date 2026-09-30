import { useMemo } from 'react'
import { BarChart3 as BarChartIcon } from 'lucide-react'
import { useStatistics } from './hooks'
import { useCurrentWorkspace } from '@/features/workspaces'
import { Tooltip } from '@/components/shared/Tooltip'

const WEEKS_TO_SHOW = 52
const DAYS_PER_WEEK = 7

function getLevel(count: number, maxCount: number): number {
  if (count === 0) return 0
  if (maxCount === 0) return 1
  const ratio = count / maxCount
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 0.75) return 3
  return 4
}

function getLevelColor(level: number, isDark: boolean): string {
  const colors = isDark
    ? [
        'rgba(250, 248, 245, 0.1)', // level 0
        'rgba(122, 168, 120, 0.3)', // level 1
        'rgba(122, 168, 120, 0.5)', // level 2
        'rgba(122, 168, 120, 0.7)', // level 3
        'rgba(122, 168, 120, 1)', // level 4
      ]
    : [
        'rgba(31, 27, 22, 0.05)', // level 0
        'rgba(169, 212, 166, 0.3)', // level 1
        'rgba(169, 212, 166, 0.5)', // level 2
        'rgba(169, 212, 166, 0.7)', // level 3
        'rgba(169, 212, 166, 1)', // level 4
      ]
  return colors[level]
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getDayLabel(dayIndex: number): string {
  const days = ['', 'Mon', '', 'Wed', '', 'Fri', '']
  return days[dayIndex] || ''
}

export function StatisticsPage() {
  const { workspaceId } = useCurrentWorkspace()
  const { data: stats = [], isLoading, isError } = useStatistics({ workspaceId, days: 365 })

  const { gridData, maxCount, totalTasks, activeDays } = useMemo(() => {
    const statsMap = new Map<string, number>()
    for (const stat of stats) {
      statsMap.set(stat.date, stat.count)
    }

    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - (WEEKS_TO_SHOW * DAYS_PER_WEEK - 1))

    const grid: number[][] = []
    let max = 0
    let total = 0
    let active = 0

    for (let week = 0; week < WEEKS_TO_SHOW; week++) {
      const weekData: number[] = []
      for (let day = 0; day < DAYS_PER_WEEK; day++) {
        const currentDate = new Date(startDate)
        currentDate.setDate(currentDate.getDate() + week * DAYS_PER_WEEK + day)
        
        const dateKey = currentDate.toISOString().split('T')[0]
        const count = statsMap.get(dateKey) ?? 0
        weekData.push(count)
        
        if (count > max) max = count
        if (count > 0) {
          total += count
          active++
        }
      }
      grid.push(weekData)
    }

    return { gridData: grid, maxCount: max, totalTasks: total, activeDays: active }
  }, [stats])

  const isDark = document.documentElement.classList.contains('dark')

  return (
    <div className="mx-auto flex max-w-5xl flex-col px-8 py-10">
      <header className="mb-8">
        <h1 className="flex items-center gap-3 text-2xl font-bold uppercase tracking-widest text-pink-deep dark:text-dark-pink-deep">
          <BarChartIcon className="h-6 w-6" />
          Statistics
        </h1>
        <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted dark:text-dark-muted">
          <div>
            <span className="font-semibold text-ink dark:text-dark-ink">{totalTasks}</span>{' '}
            tasks completed
          </div>
          <div>
            <span className="font-semibold text-ink dark:text-dark-ink">{activeDays}</span>{' '}
            active days
          </div>
          <div>
            <span className="font-semibold text-ink dark:text-dark-ink">
              {activeDays > 0 ? (totalTasks / activeDays).toFixed(1) : '0'}
            </span>{' '}
            avg tasks/day
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="py-12 text-center text-muted dark:text-dark-muted">
          Loading statistics...
        </div>
      ) : isError ? (
        <div className="py-12 text-center text-rose dark:text-dark-rose">
          Failed to load statistics
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 pr-2 text-xs text-muted dark:text-dark-muted">
              <div className="h-4" />
              {Array.from({ length: DAYS_PER_WEEK }).map((_, i) => (
                <div key={i} className="h-4 w-6 flex items-center justify-center">
                  {getDayLabel(i)}
                </div>
              ))}
            </div>

            {/* Contribution grid */}
            <div className="flex flex-col gap-1 relative">
              {/* Month labels */}
              <div className="flex mb-1 relative h-4">
                {(() => {
                  const labels: { month: string; weekIndex: number }[] = []
                  let lastMonth = ''
                  for (let weekIndex = 0; weekIndex < WEEKS_TO_SHOW; weekIndex++) {
                    const date = new Date()
                    date.setDate(date.getDate() - (WEEKS_TO_SHOW - weekIndex) * 7)
                    const month = date.toLocaleDateString('en-US', { month: 'short' })
                    if (month !== lastMonth) {
                      labels.push({ month, weekIndex })
                      lastMonth = month
                    }
                  }
                  return labels.map(({ month, weekIndex }) => (
                    <div
                      key={month}
                      className="h-4 text-xs text-muted dark:text-dark-muted absolute"
                      style={{
                        left: `${32 + weekIndex * 28}px`,
                        minWidth: 35
                      }}
                    >
                      {month}
                    </div>
                  ))
                })()}
              </div>

              {/* Grid */}
              <div className="flex gap-3">
                {gridData.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((count, dayIndex) => {
                      const date = new Date()
                      date.setDate(
                        date.getDate() - (WEEKS_TO_SHOW - weekIndex - 1) * 7 - (DAYS_PER_WEEK - dayIndex - 1)
                      )
                      const level = getLevel(count, maxCount)
                      const color = getLevelColor(level, isDark)

                      return (
                        <Tooltip
                          key={`${weekIndex}-${dayIndex}`}
                          label={`${formatDate(date)}: ${count} task${count !== 1 ? 's' : ''}`}
                        >
                          <div
                            className="h-5 w-5 rounded-sm border border-ink/5 dark:border-dark-ink/5"
                            style={{
                              backgroundColor: color,
                            }}
                          />
                        </Tooltip>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted dark:text-dark-muted">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className="h-4 w-4 rounded-sm border border-ink/5 dark:border-dark-ink/5"
                style={{ backgroundColor: getLevelColor(level, isDark) }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      )}
    </div>
  )
}
