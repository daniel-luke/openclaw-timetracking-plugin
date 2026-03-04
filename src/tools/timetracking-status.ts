import type { EntryRegistry } from '../entry-registry.js'

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function makeStatusTool(getRegistry: () => EntryRegistry) {
  return {
    name: 'timetracking_status',
    description: "Get the current time tracking status: whether a session is running, how long it's been going, and today's total tracked time.",
    parameters: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    async execute(_ctx: unknown, _params: Record<string, never>): Promise<unknown> {
      const registry = getRegistry()
      const session = await registry.getCurrentSession()
      const today = toDateString(new Date())
      const entries = await registry.getEntriesForDate(today)

      const totalTodayMs = entries.reduce((sum, e) => {
        return sum + (new Date(e.end).getTime() - new Date(e.start).getTime())
      }, 0)

      if (session) {
        const elapsed = Date.now() - new Date(session.start).getTime()
        return {
          tracking: true,
          project: session.project,
          note: session.note,
          start: session.start,
          elapsed: formatDuration(elapsed),
          today: {
            sessions: entries.length,
            total: formatDuration(totalTodayMs),
          },
        }
      }

      return {
        tracking: false,
        today: {
          sessions: entries.length,
          total: formatDuration(totalTodayMs),
        },
      }
    },
  }
}
