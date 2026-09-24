import { describe, expect, it } from 'vitest'
import type { Task } from '@/db/schema'

import {
  computeStress,
  computeStressHistory,
  stressLevelFor,
} from './computeStress'

// Thu 24 Sep 2026, 12:00 local
const NOW = new Date(2026, 8, 24, 12, 0, 0)
const HOUR = 3_600_000

function at(offsetHours: number): Date {
  return new Date(NOW.getTime() + offsetHours * HOUR)
}

let seq = 0
function task(overrides: Partial<Task> = {}): Task {
  seq++
  return {
    id: `t${seq}`,
    userId: 'u1',
    workspaceId: null,
    title: `Task ${seq}`,
    description: null,
    status: 'TODO',
    position: seq,
    dueDate: null,
    startedAt: null,
    completedAt: null,
    archivedAt: null,
    estimatedMinutes: null,
    focusCount: 0,
    // 4 days old: outside the 3-day trend window, younger than "lingering".
    createdAt: at(-96),
    updatedAt: NOW,
    ...overrides,
  }
}

function many(count: number, overrides: Partial<Task> = {}): Task[] {
  return Array.from({ length: count }, () => task(overrides))
}

function done(completedAt: Date, overrides: Partial<Task> = {}): Task {
  return task({ status: 'COMPLETED', completedAt, ...overrides })
}

function points(result: ReturnType<typeof computeStress>, key: string) {
  return result.factors.find((f) => f.key === key)?.points ?? 0
}

describe('computeStress', () => {
  it('is zero with no tasks', () => {
    const result = computeStress([], [], NOW)
    expect(result.score).toBe(0)
    expect(result.level).toBe('low')
    expect(result.factors).toEqual([])
  })

  describe('workload vs pace', () => {
    it('uses the default pace of 3/day without history', () => {
      const result = computeStress(many(9), [], NOW)
      expect(result.stats.throughputIsDefault).toBe(true)
      expect(result.stats.daysToClear).toBe(3)
      // 3 days → halfway between comfort (1) and full (5) → 25
      expect(points(result, 'load')).toBe(25)
    })

    it('is zero when the backlog clears within a day', () => {
      expect(points(computeStress(many(3), [], NOW), 'load')).toBe(0)
    })

    it('measures load against the personal pace', () => {
      // 4 completions over 2 days last week → 2/day
      const history = [
        done(at(-30)),
        done(at(-31)),
        done(at(-50)),
        done(at(-51)),
      ]
      const result = computeStress(many(6), history, NOW)
      expect(result.stats.throughput).toBe(2)
      expect(points(result, 'load')).toBe(25)
    })

    it('ignores days without completions when averaging pace', () => {
      // 4 completions all on one day → 4/day, not 4/7
      const history = many(4).map(() => done(at(-30)))
      const result = computeStress(many(8), history, NOW)
      expect(result.stats.throughput).toBe(4)
      expect(points(result, 'load')).toBe(13)
    })

    it("does not count today's completions in the pace", () => {
      const result = computeStress(many(3), [done(at(-1))], NOW)
      expect(result.stats.throughputIsDefault).toBe(true)
    })

    it('caps at 50 for a huge backlog', () => {
      expect(points(computeStress(many(40), [], NOW), 'load')).toBe(50)
    })
  })

  it('adds stress when more tasks come in than get done', () => {
    const fresh = many(4, { createdAt: at(-2) })
    const result = computeStress(fresh, [done(at(-1))], NOW)
    expect(result.stats.addedRecently).toBe(4)
    expect(result.stats.completedRecently).toBe(1)
    expect(points(result, 'trend')).toBe(15)
    // 4 open / 3 per day → 1.33 days → 4 load points, −4 for today's win
    expect(result.score).toBe(15 + 4 - 4)
  })

  it('does not count tasks created before the trend window', () => {
    expect(points(computeStress(many(3), [], NOW), 'trend')).toBe(0)
  })

  it('flags lingering todos and stuck in-progress work', () => {
    const result = computeStress(
      [
        ...many(2, { createdAt: at(-200) }),
        task({ status: 'IN_PROGRESS', startedAt: at(-100) }),
      ],
      [],
      NOW,
    )
    expect(points(result, 'oldTodo')).toBe(4)
    expect(points(result, 'stale')).toBe(4)
  })

  it('leaves deadline factors out while tasks have no due dates', () => {
    const keys = computeStress(many(20), [], NOW).factors.map((f) => f.key)
    expect(keys).not.toContain('overdue')
    expect(keys).not.toContain('dueSoon')
    expect(keys).not.toContain('late')
  })

  it('still scores deadlines once tasks have them', () => {
    const result = computeStress([task({ dueDate: at(-2) })], [], NOW)
    expect(points(result, 'overdue')).toBe(12)
  })

  it('never goes below 0 or above 100', () => {
    const wins = many(10).map(() => done(at(-1)))
    expect(computeStress([], wins, NOW).score).toBe(0)
    const heavy = many(40, { createdAt: at(-1) })
    expect(computeStress(heavy, [], NOW).score).toBe(80)
    const worst = [
      ...heavy,
      ...many(5, { createdAt: at(-200), dueDate: at(-1) }),
    ]
    expect(computeStress(worst, [], NOW).score).toBe(100)
  })
})

describe('stressLevelFor', () => {
  it('maps score bands', () => {
    expect(stressLevelFor(0)).toBe('low')
    expect(stressLevelFor(25)).toBe('moderate')
    expect(stressLevelFor(50)).toBe('high')
    expect(stressLevelFor(75)).toBe('critical')
  })
})

describe('computeStressHistory', () => {
  it('returns one point per day, oldest first, ending today', () => {
    const history = computeStressHistory([], [], 7, NOW)
    expect(history).toHaveLength(7)
    expect(history[0].date).toBe('2026-09-18')
    expect(history[6].date).toBe('2026-09-24')
  })

  it("matches the live score for today's point", () => {
    const active = many(9, { createdAt: at(-5) })
    const history = computeStressHistory(active, [], 3, NOW)
    expect(history[2].score).toBe(computeStress(active, [], NOW).score)
  })

  it('counts tasks added and completed per day', () => {
    const finished = done(at(-16), { createdAt: at(-40) }) // Sep 22 → Sep 23
    const open = task({ createdAt: at(-2) }) // today
    const [twoAgo, yesterday, today] = computeStressHistory(
      [open],
      [finished],
      3,
      NOW,
    )
    expect(twoAgo).toMatchObject({ added: 1, completed: 0 })
    expect(yesterday).toMatchObject({ added: 0, completed: 1 })
    expect(today).toMatchObject({ added: 1, completed: 0 })
  })

  it('replays past days from task timestamps', () => {
    // 6 tasks created 2 days ago, all still open → a pile-up on that day.
    const open = many(6, { createdAt: at(-40) })
    const [threeAgo, twoAgo] = computeStressHistory(open, [], 4, NOW)
    expect(threeAgo.score).toBe(0)
    // load: 6/3 = 2 days → 13; trend: 6 net → capped 30
    expect(twoAgo.score).toBe(13 + 30)
  })
})
