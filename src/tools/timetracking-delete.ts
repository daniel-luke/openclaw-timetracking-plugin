import type { EntryRegistry } from '../entry-registry.js'

function toDateString(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

export function makeDeleteTool(getRegistry: () => EntryRegistry) {
  return {
    name: 'timetracking_delete',
    description:
      'Delete a time tracking entry. ' +
      'Use timetracking_list first to find the entry id. ' +
      'Always confirm with the user before deleting — this cannot be undone.',
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
      },
      required: ['date', 'id'],
    },
    async execute(
      _ctx: unknown,
      { date, id }: { date: string; id: string },
    ): Promise<unknown> {
      const registry = getRegistry()

      try {
        const deleted = await registry.deleteEntry(date, id)
        return {
          success: true,
          message: `Deleted entry for "${deleted.project}" on ${date}.`,
          deleted,
        }
      } catch {
        // Try inferring date from id
        const inferredDate = new Date(Number(id)).toISOString().slice(0, 10)
        if (inferredDate !== date) {
          try {
            const deleted = await registry.deleteEntry(inferredDate, id)
            return {
              success: true,
              message: `Deleted entry for "${deleted.project}" on ${inferredDate}.`,
              deleted,
            }
          } catch {
            // fall through
          }
        }
        return { error: `Entry ${id} not found on ${date}.` }
      }
    },
  }
}
