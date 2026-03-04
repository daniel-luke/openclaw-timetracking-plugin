import type { EntryRegistry } from '../entry-registry.js'

function toDateString(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function makeUpdateTool(getRegistry: () => EntryRegistry) {
  return {
    name: 'timetracking_update',
    description:
      'Update an existing time tracking entry. ' +
      'Use timetracking_list first to find the entry id. ' +
      'You can also update the active session by passing its id. ' +
      'To change a session to a specific duration (e.g. "45 minutes"), compute the new end time from the existing start.',
    parameters: {
      type: 'object' as const,
      properties: {
        date: {
          type: 'string',
          description: 'Date of the entry in YYYY-MM-DD format.',
        },
        id: {
          type: 'string',
          description: 'Entry id (from timetracking_list results).',
        },
        start: {
          type: 'string',
          description: 'New start time in ISO 8601 format.',
        },
        end: {
          type: 'string',
          description: 'New end time in ISO 8601 format.',
        },
        project: {
          type: 'string',
          description: 'New project name.',
        },
        note: {
          type: 'string',
          description: 'New note (replaces existing note).',
        },
      },
      required: ['date', 'id'],
    },
    async execute(
      _ctx: unknown,
      { date, id, start, end, project, note }: { date: string; id: string; start?: string; end?: string; project?: string; note?: string },
    ): Promise<unknown> {
      const registry = getRegistry()

      // Check if this is the active session
      const session = await registry.getCurrentSession()
      if (session && session.id === id) {
        const updates: Partial<typeof session> = {}
        if (project) updates.project = project
        if (note) updates.note = note
        if (start) updates.start = start
        const updated = { ...session, ...updates }
        await registry.saveCurrentSession(updated)
        return { success: true, message: 'Active session updated.', session: updated }
      }

      const updates: Record<string, string> = {}
      if (start) updates.start = start
      if (end) updates.end = end
      if (project) updates.project = project
      if (note !== undefined) updates.note = note

      if (Object.keys(updates).length === 0) {
        return { error: 'No fields to update provided.' }
      }

      try {
        const updated = await registry.updateEntry(date, id, updates)
        const ms = new Date(updated.end).getTime() - new Date(updated.start).getTime()
        return {
          success: true,
          message: `Entry updated. New duration: ${formatDuration(ms)}.`,
          entry: { ...updated, duration: formatDuration(ms) },
        }
      } catch (err) {
        // If not found on given date, try inferring from id (id is ms timestamp = start time)
        const inferredDate = new Date(Number(id)).toISOString().slice(0, 10)
        if (inferredDate !== date) {
          try {
            const updated = await registry.updateEntry(inferredDate, id, updates)
            const ms = new Date(updated.end).getTime() - new Date(updated.start).getTime()
            return {
              success: true,
              message: `Entry updated (found on ${inferredDate}). New duration: ${formatDuration(ms)}.`,
              entry: { ...updated, duration: formatDuration(ms) },
            }
          } catch {
            // fall through
          }
        }
        return { error: (err as Error).message }
      }
    },
  }
}
