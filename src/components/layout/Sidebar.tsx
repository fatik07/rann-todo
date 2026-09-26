import { Link, useRouterState } from '@tanstack/react-router'
import { CheckCircle2, History, LayoutList } from 'lucide-react'

import {
  DEFAULT_WORKSPACE_SLUG,
  useCurrentWorkspace,
} from '@/features/workspaces'
import { WorkspaceSwitcher } from '@/features/workspaces/components/WorkspaceSwitcher'

type SidebarProps = {
  collapsed: boolean
}

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const { rawId } = useCurrentWorkspace()
  const wsParam = rawId || DEFAULT_WORKSPACE_SLUG

  const dashboardActive =
    pathname === '/' ||
    (pathname.startsWith('/w/') && !pathname.endsWith('/history'))
  const historyActive = pathname === '/history' || pathname.endsWith('/history')

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col justify-between border-r-2 border-ink/10 bg-warm py-6 transition-[width,padding] duration-300 ease-out dark:border-dark-ink/10 dark:bg-dark-warm ${
        collapsed ? 'w-20 items-center px-3' : 'w-64 px-5'
      }`}
    >
      <div className={`flex w-full flex-col gap-6`}>
        <div
          className={`flex items-center ${
            collapsed ? 'justify-center' : 'gap-3'
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-brutal-sm bg-pink text-white shadow-brutal-soft dark:bg-dark-pink dark:shadow-brutal-pink-dark">
            <CheckCircle2 className="h-5 w-5" strokeWidth={3} />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold text-ink dark:text-dark-ink">
              Rann Todo
            </span>
          )}
        </div>

        <WorkspaceSwitcher collapsed={collapsed} />
        <div className="h-px w-full bg-ink/10 dark:bg-dark-ink/10" />

        <nav className="flex flex-col gap-2">
          <Link
            to="/w/$workspaceId"
            params={{ workspaceId: wsParam }}
            aria-label="Dashboard"
            title={collapsed ? 'Dashboard' : undefined}
            className={`flex items-center rounded-brutal-sm border-2 transition-all ${
              collapsed
                ? 'h-10 w-full justify-center'
                : 'gap-3 px-4 py-2.5 text-sm font-bold uppercase tracking-wider'
            } ${
              dashboardActive
                ? 'border-ink bg-pink-light text-ink shadow-brutal-soft dark:border-dark-ink dark:bg-dark-pink-light dark:text-dark-ink dark:shadow-brutal-soft-dark'
                : 'border-transparent text-muted hover:border-ink/15 hover:text-ink dark:text-dark-muted dark:hover:border-dark-ink/15 dark:hover:text-dark-ink'
            }`}
          >
            <LayoutList className="h-4 w-4 shrink-0" />
            {!collapsed && 'Dashboard'}
          </Link>
          <Link
            to="/w/$workspaceId/history"
            params={{ workspaceId: wsParam }}
            aria-label="History"
            title={collapsed ? 'History' : undefined}
            className={`flex items-center rounded-brutal-sm border-2 transition-all ${
              collapsed
                ? 'h-10 w-full justify-center'
                : 'gap-3 px-4 py-2.5 text-sm font-bold uppercase tracking-wider'
            } ${
              historyActive
                ? 'border-ink bg-pink-light text-ink shadow-brutal-soft dark:border-dark-ink dark:bg-dark-pink-light dark:text-dark-ink dark:shadow-brutal-soft-dark'
                : 'border-transparent text-muted hover:border-ink/15 hover:text-ink dark:text-dark-muted dark:hover:border-dark-ink/15 dark:hover:text-dark-ink'
            }`}
          >
            <History className="h-4 w-4 shrink-0" />
            {!collapsed && 'History'}
          </Link>
        </nav>
      </div>
    </aside>
  )
}
