import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, History as HistoryIcon } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/shared/EmptyState'
import { HistoryCard } from '@/components/history/HistoryCard'
import { useHistory } from '@/features/history'
import { useCurrentWorkspace } from '@/features/workspaces'
import type { SubtaskProgress, Task } from '@/db/schema'

type HistoryTask = Task & SubtaskProgress

type FlatTask = { task: HistoryTask; date: string }

const MIN_PAGE_SIZE = 5
const MAX_PAGE_SIZE = 25
const ESTIMATED_ROW_PX = 80

function calcPageSize(): number {
  if (typeof window === 'undefined') return 10
  const usable = window.innerHeight * 0.7
  const estimated = Math.floor(usable / ESTIMATED_ROW_PX)
  return Math.max(MIN_PAGE_SIZE, Math.min(MAX_PAGE_SIZE, estimated))
}

function formatDateHeading(dateStr: string): string {
  const [y = 0, m = 1, d = 1] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function HistoryPage() {
  const { workspaceId } = useCurrentWorkspace()
  const { data: groups = [], isLoading, isError } = useHistory(workspaceId)

  const [pageSize, setPageSize] = useState<number>(calcPageSize)
  const [page, setPage] = useState(0)

  useEffect(() => {
    function update() {
      setPageSize(calcPageSize())
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const allTasks = useMemo<FlatTask[]>(
    () =>
      groups.flatMap((g) =>
        g.tasks
          .filter((t) => t.completedAt)
          .map((task) => ({ task, date: g.date })),
      ),
    [groups],
  )

  const totalTasks = allTasks.length
  const pageCount = Math.max(1, Math.ceil(totalTasks / pageSize))

  useEffect(() => {
    if (page >= pageCount) {
      setPage(Math.max(0, pageCount - 1))
    }
  }, [page, pageCount])

  const pagedTasks = useMemo(
    () => allTasks.slice(page * pageSize, (page + 1) * pageSize),
    [allTasks, page, pageSize],
  )

  const pagedGroups = useMemo(() => {
    const map = new Map<string, HistoryTask[]>()
    for (const { task, date } of pagedTasks) {
      const existing = map.get(date)
      if (existing) {
        existing.push(task)
      } else {
        map.set(date, [task])
      }
    }
    return Array.from(map.entries()).map(([date, tasks]) => ({
      date,
      tasks,
    }))
  }, [pagedTasks])

  const startIndex = totalTasks === 0 ? 0 : page * pageSize + 1
  const endIndex = Math.min(totalTasks, (page + 1) * pageSize)
  const showPagination = pageCount > 1

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-8 py-10">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-pink-deep dark:text-dark-pink-deep">
          History
        </h1>
        <div className="text-sm font-medium text-muted dark:text-dark-muted">
          <span className="text-ink dark:text-dark-ink">{totalTasks}</span>{' '}
          {totalTasks === 1 ? 'task' : 'tasks'} across{' '}
          <span className="text-ink dark:text-dark-ink">{groups.length}</span>{' '}
          {groups.length === 1 ? 'day' : 'days'}
        </div>
      </header>

      {isLoading ? (
        <div className="py-12 text-center text-muted dark:text-dark-muted">
          Loading history...
        </div>
      ) : isError ? (
        <EmptyState
          icon={<HistoryIcon className="h-12 w-12" />}
          title="Couldn't load history"
          description="Please try again later"
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon className="h-12 w-12" />}
          title="No history yet"
          description="Completed tasks will appear here"
        />
      ) : (
        <>
          <div className="flex flex-col gap-8">
            {pagedGroups.map((group) => (
              <section key={group.date}>
                <h2 className="mb-3 flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-muted dark:text-dark-muted">
                  <span className="h-px flex-1 bg-ink/15 dark:bg-dark-ink/15" />
                  <span className="whitespace-nowrap">
                    {formatDateHeading(group.date)}
                  </span>
                  <span className="h-px flex-1 bg-ink/15 dark:bg-dark-ink/15" />
                </h2>
                <div className="flex flex-col gap-2">
                  {group.tasks.map((task) => (
                    <HistoryCard key={task.id} task={task} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {showPagination && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink/10 pt-6 dark:border-dark-ink/10">
              <div className="text-sm text-muted dark:text-dark-muted">
                Showing{' '}
                <span className="font-semibold text-ink dark:text-dark-ink">
                  {startIndex}-{endIndex}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-ink dark:text-dark-ink">
                  {totalTasks}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  size="sm"
                  variant="secondary"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <span className="px-2 text-sm font-medium text-ink dark:text-dark-ink">
                  Page {page + 1} / {pageCount}
                </span>
                <Button
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={page >= pageCount - 1}
                  size="sm"
                  variant="secondary"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
