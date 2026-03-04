import type { EntryRegistry, TimeEntry } from '../entry-registry.js'

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

function withDuration(entry: TimeEntry) {
  const ms = new Date(entry.end).getTime() - new Date(entry.start).getTime()
  return { ...entry, duration: formatDuration(ms) }
}

export function makeListTool(getRegistry: () => EntryRegistry) {
  return {
    name: 'timetracking_list',
    description:
      'List time tracking entries for a specific date or date range, with optional project filter. ' +
      'Returns entries with computed durations. Defaults to today if no date is provided.',
    parameters: {
      type: 'object' as const,
      properties: {
        date: {
          type: 'string',
          description: 'Single date in YYYY-MM-DD format. Ignored if date_from/date_to are provided.',
        },
        date_from: {
          type: 'string',
          description: 'Start of date range in YYYY-MM-DD format (inclusive).',
        },
        date_to: {
          type: 'string',
          description: 'End of date range in YYYY-MM-DD format (inclusive).',
        },
        project: {
          type: 'string',
          description: 'Filter entries by project name (case-insensitive substring match).',
        },
      },
      required: [],
    },
    async execute(
      _ctx: unknown,
      { date, date_from, date_to, project }: { date?: string; date_from?: string; date_to?: string; project?: string },
    ): Promise<unknown> {
      const registry = getRegistry()
      let entries: TimeEntry[]

      if (date_from && date_to) {
        entries = await registry.getEntriesForRange(date_from, date_to)
      } else {
        const d = date ?? toDateString(new Date())
        entries = await registry.getEntriesForDate(d)
      }

      if (project) {
        const lc = project.toLowerCase()
        entries = entries.filter(e => e.project.toLowerCase().includes(lc))
      }

      const withDurations = entries.map(withDuration)
      const totalMs = entries.reduce((sum, e) => {
        return sum + (new Date(e.end).getTime() - new Date(e.start).getTime())
      }, 0)

      return {
        entries: withDurations,
        count: entries.length,
        total: formatDuration(totalMs),
      }
    },
  }
}
