import { NextRequest, NextResponse } from "next/server";
import {
  readReminderConfig,
  updateReminderConfig,
  shouldTriggerReminder,
  getNextReminderTime,
  markReminderTriggered,
  isValidTime,
} from "@/lib/reminder-service";
import type { ReminderConfig } from "@/lib/reminder-service";
import type { ApiResponse } from "@/lib/types";
import { DAYS_OF_WEEK, type DayOfWeek } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReminderResponse extends ReminderConfig {
  shouldTrigger: boolean;
  nextReminder: string | null;
}

/**
 * GET /api/reminder - Get reminder configuration and status
 */
export async function GET(): Promise<NextResponse<ApiResponse<ReminderResponse>>> {
  try {
    const config = readReminderConfig();
    const shouldTrigger = shouldTriggerReminder(config);
    const nextReminderDate = getNextReminderTime(config);

    return NextResponse.json({
      success: true,
      data: {
        ...config,
        shouldTrigger,
        nextReminder: nextReminderDate?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read reminder config",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reminder - Update reminder configuration
 * Body: { enabled?: boolean, time?: string, days?: string[], browserNotification?: boolean }
 */
export async function PUT(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ReminderConfig>>> {
  try {
    const body = await request.json();
    const { enabled, time, days, browserNotification } = body;

    // Validate time if provided
    if (time !== undefined && !isValidTime(time)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid time format. Use HH:MM (24-hour format)",
        },
        { status: 400 }
      );
    }

    // Validate days if provided
    if (days !== undefined) {
      if (!Array.isArray(days)) {
        return NextResponse.json(
          {
            success: false,
            error: "Days must be an array",
          },
          { status: 400 }
        );
      }

      const invalidDays = days.filter(
        (d: string) => !DAYS_OF_WEEK.includes(d as DayOfWeek)
      );
      if (invalidDays.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid days: ${invalidDays.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    const updates: Partial<ReminderConfig> = {};
    if (enabled !== undefined) updates.enabled = !!enabled;
    if (time !== undefined) updates.time = time;
    if (days !== undefined) updates.days = days;
    if (browserNotification !== undefined)
      updates.browserNotification = !!browserNotification;

    const updatedConfig = updateReminderConfig(updates);

    return NextResponse.json({
      success: true,
      data: updatedConfig,
      message: "Reminder settings updated",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update reminder config",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reminder - Mark reminder as triggered
 */
export async function POST(): Promise<NextResponse<ApiResponse>> {
  try {
    markReminderTriggered();

    return NextResponse.json({
      success: true,
      message: "Reminder marked as triggered",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to mark reminder triggered",
      },
      { status: 500 }
    );
  }
}
