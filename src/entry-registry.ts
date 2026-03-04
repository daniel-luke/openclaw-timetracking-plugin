import * as fs from 'fs'
import * as path from 'path'

export interface TimeEntry {
  id: string       // ms-since-epoch string, unique per session
  start: string    // ISO 8601
  end: string      // ISO 8601
  project: string
  note?: string
}

export interface CurrentSession {
  id: string
  start: string
  project: string
  note?: string
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export class EntryRegistry {
  private currentSessionPath: string

  constructor(private workdir: string) {
    this.currentSessionPath = path.join(workdir, '.current.json')
  }

  private filePath(date: string): string {
    return path.join(this.workdir, `${date}.jsonl`)
  }

  private ensureWorkdir(): void {
    if (!fs.existsSync(this.workdir)) {
      fs.mkdirSync(this.workdir, { recursive: true })
    }
  }

  async getEntriesForDate(date: string): Promise<TimeEntry[]> {
    const file = this.filePath(date)
    if (!fs.existsSync(file)) return []
    const lines = fs.readFileSync(file, 'utf-8').split('\n').filter(l => l.trim())
    return lines.map(l => JSON.parse(l) as TimeEntry)
  }

  async appendEntry(date: string, entry: TimeEntry): Promise<void> {
    this.ensureWorkdir()
    const file = this.filePath(date)
    fs.appendFileSync(file, JSON.stringify(entry) + '\n', 'utf-8')
  }

  async updateEntry(date: string, id: string, updates: Partial<Omit<TimeEntry, 'id'>>): Promise<TimeEntry> {
    const entries = await this.getEntriesForDate(date)
    const idx = entries.findIndex(e => e.id === id)
    if (idx === -1) throw new Error(`Entry ${id} not found on ${date}`)
    entries[idx] = { ...entries[idx], ...updates }
    this.ensureWorkdir()
    fs.writeFileSync(this.filePath(date), entries.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf-8')
    return entries[idx]
  }

  async deleteEntry(date: string, id: string): Promise<TimeEntry> {
    const entries = await this.getEntriesForDate(date)
    const idx = entries.findIndex(e => e.id === id)
    if (idx === -1) throw new Error(`Entry ${id} not found on ${date}`)
    const [deleted] = entries.splice(idx, 1)
    this.ensureWorkdir()
    if (entries.length === 0) {
      fs.unlinkSync(this.filePath(date))
    } else {
      fs.writeFileSync(this.filePath(date), entries.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf-8')
    }
    return deleted
  }

  async getEntriesForRange(from: string, to: string): Promise<TimeEntry[]> {
    const results: TimeEntry[] = []
    const start = new Date(from)
    const end = new Date(to)
    const cursor = new Date(start)
    while (cursor <= end) {
      const date = toDateString(cursor)
      const entries = await this.getEntriesForDate(date)
      results.push(...entries)
      cursor.setDate(cursor.getDate() + 1)
    }
    return results
  }

  async getCurrentSession(): Promise<CurrentSession | null> {
    if (!fs.existsSync(this.currentSessionPath)) return null
    try {
      return JSON.parse(fs.readFileSync(this.currentSessionPath, 'utf-8')) as CurrentSession
    } catch {
      return null
    }
  }

  async saveCurrentSession(session: CurrentSession | null): Promise<void> {
    this.ensureWorkdir()
    if (session === null) {
      if (fs.existsSync(this.currentSessionPath)) fs.unlinkSync(this.currentSessionPath)
    } else {
      fs.writeFileSync(this.currentSessionPath, JSON.stringify(session, null, 2), 'utf-8')
    }
  }

  buildContextBlock(session: CurrentSession | null, todayEntries: TimeEntry[]): string {
    const lines: string[] = ['[Time Tracking]']

    if (session) {
      const elapsed = Date.now() - new Date(session.start).getTime()
      const startTime = formatTime(session.start)
      lines.push(`Status: Tracking "${session.project}" since ${startTime} (${formatDuration(elapsed)} elapsed)`)
    } else {
      lines.push('Status: Not tracking')
    }

    const completedToday = todayEntries.filter(e => e.end)
    if (completedToday.length > 0) {
      const totalMs = completedToday.reduce((sum, e) => {
        return sum + (new Date(e.end).getTime() - new Date(e.start).getTime())
      }, 0)
      lines.push(`Today: ${completedToday.length} session${completedToday.length === 1 ? '' : 's'} — ${formatDuration(totalMs)} total`)
    } else {
      lines.push('Today: No completed sessions')
    }

    return lines.join('\n')
  }
}
