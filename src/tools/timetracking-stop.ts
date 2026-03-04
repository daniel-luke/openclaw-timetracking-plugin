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

export function makeStopTool(getRegistry: () => EntryRegistry) {
  return {
    name: 'timetracking_stop',
    description:
      'Stop the currently running time tracking session and save it. ' +
      'Fails if no session is running. ' +
      'Use end_time to backdate the session end (e.g. "I stopped at 10:30").',
    parameters: {
      type: 'object' as const,
      properties: {
        note: {
          type: 'string',
          description: 'Optional note to append to the session (added to any existing note).',
        },
        end_time: {
          type: 'string',
          description: 'Optional ISO 8601 datetime to backdate the session end. Defaults to now.',
        },
      },
      required: [],
    },
    async execute(
      _ctx: unknown,
      { note, end_time }: { note?: string; end_time?: string },
    ): Promise<unknown> {
      const registry = getRegistry()
      const session = await registry.getCurrentSession()
      if (!session) {
        return { error: 'No active tracking session. Start one with timetracking_start.' }
      }

      const end = end_time ?? new Date().toISOString()
      const startMs = new Date(session.start).getTime()
      const endMs = new Date(end).getTime()

      if (endMs <= startMs) {
        return { error: `End time (${end}) must be after start time (${session.start}).` }
      }

      const mergedNote = [session.note, note].filter(Boolean).join(' — ') || undefined

      const entry: TimeEntry = {
        id: session.id,
        start: session.start,
        end,
        project: session.project,
        note: mergedNote,
      }

      const date = toDateString(session.start)
      await registry.appendEntry(date, entry)
      await registry.saveCurrentSession(null)

      const duration = formatDuration(endMs - startMs)
      return {
        success: true,
        message: `Stopped. Tracked "${session.project}" for ${duration}.`,
        entry,
        duration,
      }
    },
  }
}
