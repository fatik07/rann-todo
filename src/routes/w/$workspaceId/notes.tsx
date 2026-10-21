import { createFileRoute, redirect } from '@tanstack/react-router'

import { NotesPage } from '@/features/notes/NotesPage'

export const Route = createFileRoute('/w/$workspaceId/notes')({
  beforeLoad: ({ params }) => {
    if (!params.workspaceId) {
      throw redirect({
        to: '/w/$workspaceId/notes',
        params: { workspaceId: 'default' },
      })
    }
  },
  component: NotesPage,
})
