import type { Task } from '@/db/schema'

export type StressLevel = 'low' | 'moderate' | 'high' | 'critical'

export type StressFactor = {
  key: string
  label: string
  detail: string
  /** Positive adds stress, negative relieves it. */
  points: number
}

export type StressResult = {
  score: number
  level: StressLevel
  factors: StressFactor[]
  stats: {
    active: number
    inProgress: number
    /** Average tasks completed per active day over the past week. */
    throughput: number
    /** Whether `throughput` fell back to the default (no recent history). */
    throughputIsDefault: boolean
    daysToClear: number
    addedRecently: number
    completedRecently: number
    completedToday: number
    overdue: number
    dueSoon: number
  }
}

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS

// Weights are deliberately simple so the breakdown stays explainable.

// Load: open tasks measured against the user's own pace.
const THROUGHPUT_WINDOW_DAYS = 7
const DEFAULT_THROUGHPUT = 3
const LOAD_COMFORT_DAYS = 1
const LOAD_FULL_DAYS = 5
const LOAD_MAX = 50

// Trend: more tasks coming in than going out.
const TREND_WINDOW_DAYS = 3
const TREND_POINTS = 5
const TREND_MAX = 30

// Lingering work.
const OLD_TODO_AFTER_MS = 7 * DAY_MS
const OLD_TODO_POINTS = 2
const OLD_TODO_MAX = 10
const STALE_AFTER_MS = 3 * DAY_MS
const STALE_POINTS = 4
const STALE_MAX = 10

// Relief.
const DONE_TODAY_RELIEF = 4
const DONE_TODAY_RELIEF_MAX = 20

// Deadline factors. The UI has no due-date input yet, so these stay at 0
// until it does.
const OVERDUE_POINTS = 12
const OVERDUE_MAX = 36
const DUE_SOON_POINTS = 6
const DUE_SOON_MAX = 18
const LATE_WINDOW_MS = 7 * DAY_MS
const LATE_POINTS = 3
const LATE_MAX = 9

function toTime(value: Date | string | null | undefined): number | null {
  if (!value) return null
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? null : t
}

function capped(count: number, each: number, max: number): number {
  return Math.min(count * each, max)
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function startOfDay(d: Date): Date {
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  return s
}

function daysBefore(d: Date, days: number): number {
  const s = new Date(d)
  s.setDate(s.getDate() - days)
  return s.getTime()
}

function dateKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function stressLevelFor(score: number): StressLevel {
  if (score >= 75) return 'critical'
  if (score >= 50) return 'high'
  if (score >= 25) return 'moderate'
  return 'low'
}

/**
 * Estimate a 0–100 stress score from the user's workload.
 *
 * `activeTasks` are TODO/IN_PROGRESS tasks; `completedTasks` are
 * COMPLETED/ARCHIVED tasks (history). Pure — pass `now` for determinism.
 */
export function computeStress(
  activeTasks: Task[],
  completedTasks: Task[],
  now: Date = new Date(),
): StressResult {
  const nowMs = now.getTime()
  const today = startOfDay(now)
  const todayMs = today.getTime()
  const throughputFromMs = daysBefore(today, THROUGHPUT_WINDOW_DAYS)
  const trendFromMs = daysBefore(today, TREND_WINDOW_DAYS - 1)

  let inProgress = 0
  let stale = 0
  let oldTodo = 0
  let overdue = 0
  let dueSoon = 0

  for (const task of activeTasks) {
    if (task.status === 'IN_PROGRESS') {
      inProgress++
      const started = toTime(task.startedAt)
      if (started !== null && nowMs - started > STALE_AFTER_MS) stale++
    } else {
      const created = toTime(task.createdAt)
      if (created !== null && nowMs - created > OLD_TODO_AFTER_MS) oldTodo++
    }
    const due = toTime(task.dueDate)
    if (due !== null) {
      if (due < nowMs) overdue++
      else if (due - nowMs <= DAY_MS) dueSoon++
    }
  }

  let completedToday = 0
  let completedRecently = 0
  let lateRecently = 0
  let pastWeekCompletions = 0
  const pastWeekActiveDays = new Set<string>()

  for (const task of completedTasks) {
    const done = toTime(task.completedAt)
    if (done === null || done > nowMs) continue
    if (done >= todayMs) completedToday++
    if (done >= trendFromMs) completedRecently++
    // Baseline pace excludes today so finishing tasks now doesn't also
    // shift the yardstick they're measured against.
    if (done >= throughputFromMs && done < todayMs) {
      pastWeekCompletions++
      pastWeekActiveDays.add(dateKey(new Date(done)))
    }
    const due = toTime(task.dueDate)
    if (due !== null && done > due && nowMs - done <= LATE_WINDOW_MS) {
      lateRecently++
    }
  }

  let addedRecently = 0
  for (const task of [...activeTasks, ...completedTasks]) {
    const created = toTime(task.createdAt)
    if (created !== null && created >= trendFromMs && created <= nowMs) {
      addedRecently++
    }
  }

  // Only days with at least one completion count, so days off don't
  // drag the pace down.
  const throughputIsDefault = pastWeekActiveDays.size === 0
  const throughput = throughputIsDefault
    ? DEFAULT_THROUGHPUT
    : pastWeekCompletions / pastWeekActiveDays.size

  const active = activeTasks.length
  const daysToClear = active / throughput
  const loadRatio = Math.min(
    1,
    Math.max(
      0,
      (daysToClear - LOAD_COMFORT_DAYS) / (LOAD_FULL_DAYS - LOAD_COMFORT_DAYS),
    ),
  )
  const netAdded = Math.max(0, addedRecently - completedRecently)

  const paceNote = throughputIsDefault
    ? `default pace ${DEFAULT_THROUGHPUT}/day`
    : `your pace ${round1(throughput)}/day`

  const candidates: StressFactor[] = [
    {
      key: 'load',
      label: 'Workload',
      detail: `${plural(active, 'open task')} ≈ ${round1(daysToClear)} days at ${paceNote}`,
      points: Math.round(loadRatio * LOAD_MAX),
    },
    {
      key: 'trend',
      label: 'Piling up',
      detail: `${addedRecently} added vs ${completedRecently} completed in ${TREND_WINDOW_DAYS} days`,
      points: capped(netAdded, TREND_POINTS, TREND_MAX),
    },
    {
      key: 'oldTodo',
      label: 'Lingering',
      detail: `${plural(oldTodo, 'todo')} older than 7 days`,
      points: capped(oldTodo, OLD_TODO_POINTS, OLD_TODO_MAX),
    },
    {
      key: 'stale',
      label: 'Stuck',
      detail: `${plural(stale, 'task')} in progress for 3+ days`,
      points: capped(stale, STALE_POINTS, STALE_MAX),
    },
    {
      key: 'overdue',
      label: 'Overdue',
      detail: `${plural(overdue, 'task')} past due`,
      points: capped(overdue, OVERDUE_POINTS, OVERDUE_MAX),
    },
    {
      key: 'dueSoon',
      label: 'Due soon',
      detail: `${plural(dueSoon, 'task')} due within 24h`,
      points: capped(dueSoon, DUE_SOON_POINTS, DUE_SOON_MAX),
    },
    {
      key: 'late',
      label: 'Finished late',
      detail: `${plural(lateRecently, 'task')} completed after due date (7d)`,
      points: capped(lateRecently, LATE_POINTS, LATE_MAX),
    },
    {
      key: 'doneToday',
      label: 'Progress today',
      detail: `${plural(completedToday, 'task')} completed today`,
      points: -capped(completedToday, DONE_TODAY_RELIEF, DONE_TODAY_RELIEF_MAX),
    },
  ]

  const factors = candidates.filter((f) => f.points !== 0)
  const raw = factors.reduce((sum, f) => sum + f.points, 0)
  const score = Math.max(0, Math.min(100, raw))

  return {
    score,
    level: stressLevelFor(score),
    factors,
    stats: {
      active,
      inProgress,
      throughput,
      throughputIsDefault,
      daysToClear,
      addedRecently,
      completedRecently,
      completedToday,
      overdue,
      dueSoon,
    },
  }
}

export type StressPoint = {
  /** Local date key, YYYY-MM-DD. */
  date: string
  score: number
  level: StressLevel
  /** Tasks created that day. */
  added: number
  /** Tasks completed that day. */
  completed: number
}

/**
 * Reconstruct the daily stress score for the last `days` days (oldest first)
 * by replaying each day's end-of-day snapshot from task timestamps.
 * Deleted tasks are gone from the DB, so they can't be counted.
 */
export function computeStressHistory(
  activeTasks: Task[],
  completedTasks: Task[],
  days = 14,
  now: Date = new Date(),
): StressPoint[] {
  const all = [...activeTasks, ...completedTasks]
  const points: StressPoint[] = []

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = startOfDay(now)
    dayStart.setDate(dayStart.getDate() - i)
    const dayStartMs = dayStart.getTime()

    const end = new Date(dayStart)
    end.setHours(23, 59, 59, 999)
    const endMs = Math.min(end.getTime(), now.getTime())

    let added = 0
    let completedCount = 0
    const active: Task[] = []
    const done: Task[] = []
    for (const task of all) {
      const created = toTime(task.createdAt)
      if (created === null || created > endMs) continue
      if (created >= dayStartMs) added++
      const completed = toTime(task.completedAt)
      if (completed !== null && completed <= endMs) {
        if (completed >= dayStartMs) completedCount++
        done.push(task)
        continue
      }
      if (i > 0) {
        const started = toTime(task.startedAt)
        active.push({
          ...task,
          status: started !== null && started <= endMs ? 'IN_PROGRESS' : 'TODO',
        })
      }
    }

    // Today uses live statuses so the last point matches the meter exactly.
    const { score, level } =
      i === 0
        ? computeStress(activeTasks, completedTasks, now)
        : computeStress(active, done, end)

    points.push({
      date: dateKey(dayStart),
      score,
      level,
      added,
      completed: completedCount,
    })
  }

  return points
}
