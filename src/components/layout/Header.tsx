import { Link } from '@tanstack/react-router'
import { BarChart3, Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react'
import { useDarkMode } from '@/contexts/DarkModeContext'
import { useCurrentWorkspace, DEFAULT_WORKSPACE_SLUG } from '@/features/workspaces'

type HeaderProps = {
  collapsed: boolean
  onToggle: () => void
}

export function Header({ collapsed, onToggle }: HeaderProps) {
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  const { rawId } = useCurrentWorkspace()
  const wsParam = rawId || DEFAULT_WORKSPACE_SLUG

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b-2 border-ink/10 bg-cream/80 px-6 backdrop-blur-sm dark:border-dark-ink/10 dark:bg-dark-cream/80">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-9 w-9 items-center justify-center rounded-brutal-sm border-2 border-ink/20 bg-warm text-ink transition-all hover:border-ink hover:shadow-brutal-soft active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:cursor-pointer dark:border-dark-ink/20 dark:bg-dark-warm dark:text-dark-ink dark:hover:border-dark-ink dark:hover:shadow-brutal-soft-dark"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/w/$workspaceId/statistics"
          params={{ workspaceId: wsParam }}
          aria-label="View statistics"
          title="View statistics"
          className="flex h-9 w-9 items-center justify-center rounded-brutal-sm border-2 border-ink/20 bg-warm text-ink transition-all hover:border-ink hover:shadow-brutal-soft active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:cursor-pointer dark:border-dark-ink/20 dark:bg-dark-warm dark:text-dark-ink dark:hover:border-dark-ink dark:hover:shadow-brutal-soft-dark"
        >
          <BarChart3 className="h-4 w-4" />
        </Link>
        <button
        type="button"
        onClick={toggleDarkMode}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className="flex h-9 w-9 items-center justify-center rounded-brutal-sm border-2 border-ink/20 bg-warm text-ink transition-all hover:border-ink hover:shadow-brutal-soft active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:cursor-pointer dark:border-dark-ink/20 dark:bg-dark-warm dark:text-dark-ink dark:hover:border-dark-ink dark:hover:shadow-brutal-soft-dark"
      >
        {isDarkMode ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </button>
      </div>
    </header>
  )
}
