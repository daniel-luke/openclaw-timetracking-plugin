import type { EntryRegistry, CurrentSession } from '../entry-registry.js'

export function makeStartTool(getRegistry: () => EntryRegistry) {
  return {
    name: 'timetracking_start',
    description:
      'Start a new time tracking session for a project. ' +
      'Fails if a session is already running — use timetracking_stop first. ' +
      'Use start_time to backdate the session start (e.g. "I started at 9:00").',
    parameters: {
      type: 'object' as const,
      properties: {
        project: {
          type: 'string',
          description: 'Project, task, or customer name to track time against.',
        },
        note: {
          type: 'string',
          description: 'Optional note describing what you are working on.',
        },
        start_time: {
          type: 'string',
          description: 'Optional ISO 8601 datetime to backdate the session start, e.g. "2026-03-04T09:00:00". Defaults to now.',
        },
      },
      required: ['project'],
    },
    async execute(
      _ctx: unknown,
      { project, note, start_time }: { project: string; note?: string; start_time?: string },
    ): Promise<unknown> {
      const registry = getRegistry()
      const existing = await registry.getCurrentSession()
      if (existing) {
        return {
          error: `Already tracking "${existing.project}" since ${existing.start}. Stop it first with timetracking_stop.`,
        }
      }

      const start = start_time ?? new Date().toISOString()
      const session: CurrentSession = {
        id: String(new Date(start).getTime()),
        start,
        project,
        note,
      }
      await registry.saveCurrentSession(session)

      return {
        success: true,
        message: `Started tracking "${project}"${note ? ` — ${note}` : ''}.`,
        session,
      }
    },
  }
}
