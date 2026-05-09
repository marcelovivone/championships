# Agent Cron Scheduling

This document describes how cron schedule expressions are used by the Agent Control Plane in this repository, where they are handled in code, timezone semantics, and examples you can copy.

Relevant code
- Scheduler registration and handling: `backend/src/agents/agent-schedule.service.ts`
- Saving/normalizing config: `backend/src/agents/agent-admin.service.ts`

Behavior summary
- The agent scheduler loads persisted agent configurations where:
  - `isEnabled = true`
  - `supportsSchedule = true`
  - `scheduleExpression IS NOT NULL`
  See `loadScheduledConfigs()` in `agent-schedule.service.ts`.
- The service uses the `cron` Node package and creates `new CronJob(scheduleExpression, ...)` for each persisted schedule. If a schedule expression is invalid the scheduler will log and skip it.
- When a schedule is registered the application stores trigger metadata including the next scheduled run time (from `job.nextDate()`). The UI displays that timestamp using the browser's locale via `toLocaleString()`.

Cron expression format
- The code expects standard five-field cron expressions (minute hour day-of-month month day-of-week):

  - Field 1: minute — `0-59`
  - Field 2: hour — `0-23`
  - Field 3: day of month — `1-31`
  - Field 4: month — `1-12` or `Jan-Dec`
  - Field 5: day of week — `0-6` (Sun-Sat) or `Sun-Sat`

- Examples:
  - `*/30 * * * *` → every 30 minutes
  - `0 * * * *` → every hour at minute 0
  - `0 2 * * *` → daily at 02:00
  - `0 */6 * * *` → every 6 hours (at minute 0)
  - `0 0,12 * * *` or `0 */12 * * *` → every 12 hours (00:00 and 12:00)

Timezone semantics
- By default the `cron` package evaluates expressions in the Node process/system timezone because no timezone is passed to `CronJob` in the current implementation.
- Therefore schedules are executed according to the server's local timezone (the environment where the backend process runs).
- UI note: the frontend converts `nextScheduledAt` to the browser locale for display, so displayed times may appear different to users in other timezones.

Making timezone explicit
- Option A — Force UTC (recommended for predictable cross-host behavior): set an explicit timezone when constructing the job in `agent-schedule.service.ts`, for example:

```ts
// example: force UTC for all cron jobs
const job = new CronJob(config.scheduleExpression, () => { ... }, null, true, 'UTC');
```

- Option B — Set process timezone via environment: start Node with `TZ=UTC` in UNIX-like environments, or run the service inside a container with `TZ` set. On Windows, the OS timezone controls `process.env.TZ` behaviour; running in a container is simpler for consistent timezone control.

Validation and errors
- The scheduler registers jobs in `registerSchedule()` and will throw/log if the cron expression is invalid. Invalid expressions are skipped and reported in the `reloadSchedules()` result under `invalidSchedules`.
- When saving agent config, empty or whitespace-only `scheduleExpression` is normalized to `null` by `saveAgentSetup()` in `agent-admin.service.ts`, which prevents scheduling.

Operational recommendations
- For production, prefer explicit timezone handling (Option A or a containerized process with `TZ`) so schedules are predictable regardless of host timezone.
- Use UTC for schedules that should be consistent across deployments and users in multiple timezones.
- When using human-readable recurring times (daily at specific hour), document whether you mean server-local or UTC to avoid confusion.

Where this doc is referenced
- Add a cross-reference from `documentation/DOCUMENTATION_CATALOG.md` under Agent Platform & Automation if desired.

If you want, I can:
- Patch the scheduler to force UTC by default, or
- Add example UI helpers to show the server timezone next to `Next run` timestamps in the admin UI.
