# openclaw-timetracking-plugin

Time tracking plugin for [OpenClaw](https://openclaw.ai). Track sessions, query history, make corrections, and generate summaries — all through natural language.

## Features

- **Start & stop sessions** — tell the agent what you're working on in plain language
- **Backdate sessions** — "I started at 9:00" or "I stopped at 10:30"
- **Query history** — "What did I do today?", "When did I last work on Acme Corp?"
- **Summaries** — "Give me an overview of this week by project"
- **Corrections** — "Change the last session to 45 minutes", "Delete the 9:00–9:30 session"
- **Zero config** — no setup required, works out of the box

## Storage

Entries are stored as JSONL files in your OpenClaw workspace:

```
~/.openclaw/workspace/timetracking/
  2026-03-04.jsonl   ← one file per day
  2026-03-05.jsonl
  .current.json      ← active session state (present only while tracking)
```

Each entry:
```json
{ "id": "1709549400000", "start": "2026-03-04T09:00:00.000Z", "end": "2026-03-04T09:45:00.000Z", "project": "Acme Corp", "note": "Invoice processing" }
```

## Installation

1. Clone or copy this plugin into your OpenClaw custom plugins directory.
2. Run `npm install` inside the plugin folder.
3. Register the plugin in your OpenClaw config using the local path.

## Usage

### Starting and stopping

```
You:   Start tracking Acme Corp, working on the invoice module
Agent: Started tracking "Acme Corp" — invoice module. Good luck!

You:   Stop
Agent: Stopped. You tracked "Acme Corp" for 1h 15m.

You:   I've been working on Internal since 8:30, stop now
Agent: Started and stopped "Internal" — 8:30 to 10:00 (1h 30m).
```

### Querying

```
You:   What did I work on today?
You:   How many hours have I worked on Acme Corp this week?
You:   When did I last work on the OpenSource project?
You:   Am I currently tracking anything?
```

### Summaries

```
You:   Give me an overview of this week
You:   Show me hours per day this week
You:   How many hours on Acme Corp this month?
```

### Corrections

```
You:   Change the last session to 45 minutes
You:   Delete the session between 9:00 and 9:30 this morning
You:   Change this morning's project to Internal
You:   I actually started at 8:45, not 9:00
```

## Tools

| Tool | Description |
|---|---|
| `timetracking_start` | Start a session (supports backdating via `start_time`) |
| `timetracking_stop` | Stop and save the current session (supports backdating via `end_time`) |
| `timetracking_status` | Get live status and today's total |
| `timetracking_list` | List entries for a date, range, or project |
| `timetracking_update` | Correct start, end, project, or note of any entry |
| `timetracking_delete` | Delete an entry |
| `timetracking_summary` | Aggregated hours grouped by project or by day |

## CLI

```bash
openclaw timetracking status   # show current session and today's total
openclaw timetracking list     # list today's entries
```

## Development

```bash
npm install
npx tsc --noEmit   # type check
```
