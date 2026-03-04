import * as path from 'path'
import { EntryRegistry } from './entry-registry.js'
import { makeStartTool } from './tools/timetracking-start.js'
import { makeStopTool } from './tools/timetracking-stop.js'
import { makeStatusTool } from './tools/timetracking-status.js'
import { makeListTool } from './tools/timetracking-list.js'
import { makeUpdateTool } from './tools/timetracking-update.js'
import { makeDeleteTool } from './tools/timetracking-delete.js'
import { makeSummaryTool } from './tools/timetracking-summary.js'

interface PluginState {
  registry?: EntryRegistry
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function register(api: any): void {
  const state: PluginState = {}

  function resolveWorkdir(): string {
    return path.resolve(
      api.workspace?.path?.('timetracking') ??
        path.join(process.env.HOME ?? '~', '.openclaw', 'workspace', 'timetracking'),
    )
  }

  api.registerService?.({
    id: 'timetracking-registry',
    async start() {
      const workdir = resolveWorkdir()
      state.registry = new EntryRegistry(workdir)
      api.logger?.info(`[timetracking-plugin] Initialized. Storage: ${workdir}`)
    },
  })

  // Inject current status into every agent turn for natural language context
  api.registerHook?.(
    'command:new',
    async () => {
      if (!state.registry) return undefined
      const session = await state.registry.getCurrentSession()
      const today = toDateString(new Date())
      const todayEntries = await state.registry.getEntriesForDate(today)
      const block = state.registry.buildContextBlock(session, todayEntries)
      return { systemContext: block }
    },
    { description: 'Inject time tracking status for natural language session awareness' },
  )

  // Register all tools
  api.registerTool?.(makeStartTool(() => state.registry!))
  api.registerTool?.(makeStopTool(() => state.registry!))
  api.registerTool?.(makeStatusTool(() => state.registry!))
  api.registerTool?.(makeListTool(() => state.registry!))
  api.registerTool?.(makeUpdateTool(() => state.registry!))
  api.registerTool?.(makeDeleteTool(() => state.registry!))
  api.registerTool?.(makeSummaryTool(() => state.registry!))

  // Register CLI: `openclaw timetracking status|list|summary`
  api.registerCli?.({
    name: 'timetracking',
    description: 'Time tracking plugin commands',
    subcommands: [
      {
        name: 'status',
        description: 'Show current tracking status and today\'s totals',
        async handler() {
          if (!state.registry) {
            console.error('Plugin not yet started. Try again in a moment.')
            return
          }
          const session = await state.registry.getCurrentSession()
          const today = toDateString(new Date())
          const entries = await state.registry.getEntriesForDate(today)
          const totalMs = entries.reduce((sum, e) => {
            return sum + (new Date(e.end).getTime() - new Date(e.start).getTime())
          }, 0)

          if (session) {
            const elapsed = Date.now() - new Date(session.start).getTime()
            console.log(`Tracking: "${session.project}" since ${session.start} (${formatDuration(elapsed)} elapsed)`)
            if (session.note) console.log(`Note: ${session.note}`)
          } else {
            console.log('Not currently tracking.')
          }
          console.log(`Today: ${entries.length} session(s) — ${formatDuration(totalMs)} total`)
        },
      },
      {
        name: 'list',
        description: 'List today\'s time tracking entries',
        async handler() {
          if (!state.registry) {
            console.error('Plugin not yet started. Try again in a moment.')
            return
          }
          const today = toDateString(new Date())
          const entries = await state.registry.getEntriesForDate(today)
          if (entries.length === 0) {
            console.log('No entries today.')
            return
          }
          for (const e of entries) {
            const ms = new Date(e.end).getTime() - new Date(e.start).getTime()
            const note = e.note ? ` — ${e.note}` : ''
            console.log(`[${e.id}] ${e.project} ${formatDuration(ms)}${note}`)
          }
        },
      },
    ],
  })
}
