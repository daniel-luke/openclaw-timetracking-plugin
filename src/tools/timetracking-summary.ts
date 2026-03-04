import type { EntryRegistry, TimeEntry } from '../entry-registry.js'

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

function toDateString(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

export function makeSummaryTool(getRegistry: () => EntryRegistry) {
  return {
    name: 'timetracking_summary',
    description:
      'Get an aggregated summary of tracked time over a date range. ' +
      'Group by project (default) to see hours per project, or by day to see hours per day. ' +
      'Use a project filter to focus on a specific project.',
    parameters: {
      type: 'object' as const,
      properties: {
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
          description: 'Optional filter: only include entries matching this project name (case-insensitive substring).',
        },
        group_by: {
          type: 'string',
          enum: ['project', 'day'],
          description: 'Group results by "project" (default) or "day".',
        },
      },
      required: ['date_from', 'date_to'],
    },
    async execute(
      _ctx: unknown,
      { date_from, date_to, project, group_by = 'project' }: { date_from: string; date_to: string; project?: string; group_by?: string },
    ): Promise<unknown> {
      const registry = getRegistry()
      let entries = await registry.getEntriesForRange(date_from, date_to)

      if (project) {
        const lc = project.toLowerCase()
        entries = entries.filter((e: TimeEntry) => e.project.toLowerCase().includes(lc))
      }

      const totalMs = entries.reduce((sum: number, e: TimeEntry) => {
        return sum + (new Date(e.end).getTime() - new Date(e.start).getTime())
      }, 0)

      if (group_by === 'day') {
        const byDay: Record<string, number> = {}
        for (const entry of entries) {
          const day = toDateString(entry.start)
          const ms = new Date(entry.end).getTime() - new Date(entry.start).getTime()
          byDay[day] = (byDay[day] ?? 0) + ms
        }
        const rows = Object.entries(byDay)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([day, ms]) => ({ day, duration: formatDuration(ms), minutes: Math.round(ms / 60000) }))

        return {
          range: `${date_from} – ${date_to}`,
          group_by: 'day',
          rows,
          total: formatDuration(totalMs),
          total_minutes: Math.round(totalMs / 60000),
          session_count: entries.length,
        }
      }

      // group_by: project
      const byProject: Record<string, number> = {}
      for (const entry of entries) {
        const ms = new Date(entry.end).getTime() - new Date(entry.start).getTime()
        byProject[entry.project] = (byProject[entry.project] ?? 0) + ms
      }
      const rows = Object.entries(byProject)
        .sort(([, a], [, b]) => b - a)
        .map(([proj, ms]) => ({ project: proj, duration: formatDuration(ms), minutes: Math.round(ms / 60000) }))

      return {
        range: `${date_from} – ${date_to}`,
        group_by: 'project',
        rows,
        total: formatDuration(totalMs),
        total_minutes: Math.round(totalMs / 60000),
        session_count: entries.length,
      }
    },
  }
}
