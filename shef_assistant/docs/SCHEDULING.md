# Scheduled Prefill Guide

This guide explains how to set up automatic scheduled runs of the Shef prefill automation.

## Quick Start

1. **Configure the schedule** in `data/schedule.json`:

```json
{
  "enabled": true,
  "time": "10:00",
  "days": ["monday", "wednesday", "friday"],
  "lastRun": null
}
```

2. **Test the scheduled script** manually:

```bash
npm run shef:scheduled
```

3. **Set up a cron job** (see below)

## Configuration Options

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Master switch for scheduled runs |
| `time` | string | Preferred run time (HH:MM, for reference only) |
| `days` | array | Days of week to run: `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday` |
| `lastRun` | string | ISO timestamp of last run (auto-updated) |

## Idempotency

The scheduled script is idempotent - it will only run once per day, even if invoked multiple times. This is tracked via the `lastRun` field.

## Setting Up Cron

### macOS/Linux

Edit your crontab:

```bash
crontab -e
```

Add a line to run daily at 10 AM:

```cron
0 10 * * * cd /path/to/shef_assistant && npm run shef:scheduled >> /path/to/shef_assistant/artifacts/cron.log 2>&1
```

**Explanation:**
- `0 10 * * *` - Run at 10:00 AM every day
- The script's internal logic will skip if today is not a scheduled day
- Output is appended to `cron.log` for debugging

### Using launchd (macOS)

Create `~/Library/LaunchAgents/com.shef.scheduled.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.shef.scheduled</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/npm</string>
        <string>run</string>
        <string>shef:scheduled</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/shef_assistant</string>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>10</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/path/to/shef_assistant/artifacts/launchd.log</string>
    <key>StandardErrorPath</key>
    <string>/path/to/shef_assistant/artifacts/launchd-error.log</string>
</dict>
</plist>
```

Load the agent:

```bash
launchctl load ~/Library/LaunchAgents/com.shef.scheduled.plist
```

### Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Name: "Shef Prefill"
4. Trigger: Daily at 10:00 AM
5. Action: Start a program
   - Program: `cmd.exe`
   - Arguments: `/c cd /d C:\path\to\shef_assistant && npm run shef:scheduled`
6. Finish

## Logs

Run logs are stored in `artifacts/scheduled-runs/`:
- `run-YYYY-MM-DD.log` - Complete output from each scheduled run

## Troubleshooting

### Script doesn't run

1. Check if schedule is enabled:
   ```bash
   cat data/schedule.json
   ```

2. Verify today is a scheduled day:
   ```bash
   npm run shef:scheduled
   # Check the "Decision:" line in output
   ```

3. Check if it already ran today (lastRun field)

### Cron job doesn't run

1. Check cron logs:
   ```bash
   # macOS
   log show --predicate 'process == "cron"' --last 1h

   # Linux
   grep CRON /var/log/syslog
   ```

2. Ensure full paths are used in crontab

3. Verify npm/npx are in PATH for cron environment

### Browser issues in headless mode

The prefill script runs in visible browser mode by default (Shef has anti-bot detection). For cron jobs, you may need:

1. A display server (Xvfb on Linux)
2. Or run on a system with a display session

## Manual Testing

Test the scheduled script without affecting lastRun:

```bash
# View what would happen without running
cat data/schedule.json

# Run a prefill manually (bypasses schedule check)
npm run shef:prefill
```
