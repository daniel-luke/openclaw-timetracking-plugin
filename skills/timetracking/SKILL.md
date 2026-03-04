---
name: timetracking
description: Track time on projects and tasks, query history, make corrections, and generate summaries
user-invocable: true
command-dispatch: tool
---

# Time Tracking

You have access to the user's time tracking data. The current status is always injected into your context under `[Time Tracking]` at the start of every conversation.

## Starting a Session

When the user says they are starting work on something, call `timetracking_start`.

Examples:
- "Start tracking Acme Corp" → `timetracking_start({ project: "Acme Corp" })`
- "I'm working on invoice processing for Acme Corp" → `timetracking_start({ project: "Acme Corp", note: "invoice processing" })`
- "Start tracking, I started at 9:00" → `timetracking_start({ project: "...", start_time: "2026-03-04T09:00:00" })`
- "I've been working on this since 8:30" → backdate using `start_time`

Always confirm: "Started tracking [project][note]. Good luck!"

If a session is already running, tell the user and ask if they want to stop it first.

## Stopping a Session

When the user says they are done, stopping, or taking a break, call `timetracking_stop`.

Examples:
- "Stop" / "I'm done" / "Stop tracking" → `timetracking_stop({})`
- "Stop, I finished at 10:30" → `timetracking_stop({ end_time: "2026-03-04T10:30:00" })`
- "Stop, add note: reviewed PR" → `timetracking_stop({ note: "reviewed PR" })`

Always confirm with the duration: "Stopped. You tracked [project] for [duration]."

## Querying History

When the user asks what they worked on or how long they worked, call `timetracking_list` or `timetracking_summary`.

### Date Resolution
Always resolve relative dates before calling tools:
- "today" → today's date (YYYY-MM-DD)
- "yesterday" → yesterday's date
- "this week" → Monday of the current week through today
- "last week" → Monday through Sunday of the previous week
- "this month" → first day of current month through today
- "last Monday" → the most recent Monday

### Examples
- "What did I do today?" → `timetracking_list({ date: "2026-03-04" })`
- "What did I work on this week?" → `timetracking_list({ date_from: "2026-03-02", date_to: "2026-03-04" })`
- "How many hours have I worked on Acme Corp this week?" → `timetracking_summary({ date_from: "...", date_to: "...", project: "Acme Corp" })`
- "When did I last work on Acme Corp?" → `timetracking_list({ date_from: "...", date_to: "...", project: "Acme Corp" })` — look at the most recent entry
- "Give me an overview of this week by project" → `timetracking_summary({ date_from: "...", date_to: "...", group_by: "project" })`
- "Show me what I did yesterday" → `timetracking_list({ date: "2026-03-03" })`

Present results in a friendly, human-readable format:
- For lists: show project, time range, duration, and note
- For summaries: show a table or bullet list of project → total time

## Making Corrections

When the user wants to correct or change an existing entry:

1. First, call `timetracking_list` to find the entry and its `id`
2. Then call `timetracking_update` with the relevant fields

Examples:
- "Change the last session to 45 minutes"
  1. `timetracking_list({ date: "today" })` → find the last entry, note its `start` time
  2. Compute new end = start + 45 minutes
  3. `timetracking_update({ date: "...", id: "...", end: "..." })`

- "Change the project of this morning's session to OpenSource"
  1. `timetracking_list({ date: "today" })` → find the entry
  2. `timetracking_update({ date: "...", id: "...", project: "OpenSource" })`

- "I actually started at 8:45, not 9:00"
  1. `timetracking_list({ date: "today" })` → find the entry
  2. `timetracking_update({ date: "...", id: "...", start: "2026-03-04T08:45:00" })`

Always confirm the change: "Updated — [project] now shows [new duration]."

## Deleting Entries

When the user wants to delete an entry:

1. First call `timetracking_list` to identify the entry
2. Confirm with the user: "Are you sure you want to delete the [project] session from [time]?"
3. Only then call `timetracking_delete`

Example:
- "Delete the session between 9:00 and 9:30 this morning"
  1. `timetracking_list({ date: "today" })` → identify the matching entry
  2. Confirm with the user
  3. `timetracking_delete({ date: "...", id: "..." })`

## Summaries

When the user wants an overview or summary:

- "Give me an overview of this week" → `timetracking_summary({ date_from: "...", date_to: "...", group_by: "project" })`
- "Show hours per day this week" → `timetracking_summary({ date_from: "...", date_to: "...", group_by: "day" })`
- "How many hours on Acme Corp this month?" → `timetracking_summary({ date_from: "...", date_to: "...", project: "Acme Corp" })`

Present summaries clearly:
```
This week (Mon Mar 2 – Wed Mar 4):
• Acme Corp     4h 30m
• OpenSource    1h 15m
• Internal      45m
─────────────────────
Total           6h 30m  (3 sessions)
```

## Current Status

When the user asks "Am I tracking?", "What am I working on?", or similar, call `timetracking_status` to get the live status. The `[Time Tracking]` context block is also always available at the top of your system context.
