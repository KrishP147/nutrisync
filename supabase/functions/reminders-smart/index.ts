// Port of POST /api/reminders/smart from backend/app/main.py
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { generateContent } from "../_shared/gemini.ts";

interface Meal {
  total_calories?: number;
  total_protein_g?: number;
  total_carbs_g?: number;
  total_fat_g?: number;
  consumed_at?: string;
}

interface ActiveFast {
  started_at: string;
  planned_duration_hours?: number;
  ai_recommended?: boolean;
}

function wallClockHourMinute(iso: string): { hour: number; minute: number } {
  const match = iso.match(/T(\d{2}):(\d{2})/);
  if (match) return { hour: parseInt(match[1], 10), minute: parseInt(match[2], 10) };
  const d = new Date();
  return { hour: d.getHours(), minute: d.getMinutes() };
}

function getFallbackReminder(
  isFasting: boolean,
  hour: number,
  todaysCalories: number,
  goals: Record<string, number>,
) {
  const now = new Date().toISOString();

  if (isFasting) {
    return {
      type: "fasting",
      priority: "high",
      message: "You're currently fasting. Stay hydrated and focused!",
      action: "Drink water or herbal tea",
      icon: "timer",
      timestamp: now,
    };
  }

  const caloriesGoal = goals.calories ?? 2000;
  const caloriesRemaining = caloriesGoal - todaysCalories;

  if (caloriesRemaining > caloriesGoal * 0.7 && hour >= 11) {
    return {
      type: "nutrition",
      priority: "high",
      message: `You've only consumed ${todaysCalories.toFixed(0)} calories today.`,
      action: "Consider logging a meal soon",
      icon: "alert",
      timestamp: now,
    };
  }

  if (hour >= 6 && hour < 10) {
    return {
      type: "meal",
      priority: "medium",
      message: "Good morning! Time to fuel your day.",
      action: "Start with a protein-rich breakfast",
      icon: "utensils",
      timestamp: now,
    };
  } else if (hour >= 11 && hour < 14) {
    return {
      type: "meal",
      priority: "medium",
      message: "Lunchtime! Keep your energy up.",
      action: "Log a balanced meal",
      icon: "utensils",
      timestamp: now,
    };
  } else if (hour >= 17 && hour < 20) {
    return {
      type: "meal",
      priority: "medium",
      message: "Dinner time approaching.",
      action: "Plan a nutritious evening meal",
      icon: "utensils",
      timestamp: now,
    };
  }

  return {
    type: "general",
    priority: "low",
    message: "You're doing great! Stay consistent.",
    action: "Keep tracking your meals",
    icon: "trending",
    timestamp: now,
  };
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  const origin = req.headers.get("origin");

  const body = await req.json().catch(() => ({}));
  const currentTime: string = body.currentTime ?? new Date().toISOString();
  const isFasting: boolean = body.isFasting ?? false;
  const activeFast: ActiveFast | null = body.activeFast ?? null;
  const goals: Record<string, number> = body.goals ?? {};
  const recentMeals: Meal[] = body.recentMeals ?? [];
  const todaysMeals: Meal[] = body.todaysMeals ?? [];
  const fastingHistory: unknown[] = body.fastingHistory ?? [];

  try {
    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) {
      return jsonResponse({ detail: "GOOGLE_API_KEY not set" }, { status: 500 }, origin);
    }

    const { hour } = wallClockHourMinute(currentTime);
    const nowInstant = new Date(currentTime.replace("Z", "+00:00"));

    const todaysCalories = todaysMeals.reduce((s, m) => s + (m.total_calories ?? 0), 0);
    const todaysProtein = todaysMeals.reduce((s, m) => s + (m.total_protein_g ?? 0), 0);
    const todaysCarbs = todaysMeals.reduce((s, m) => s + (m.total_carbs_g ?? 0), 0);
    const todaysFat = todaysMeals.reduce((s, m) => s + (m.total_fat_g ?? 0), 0);

    const mealTimes: number[] = [];
    for (const meal of recentMeals.slice(0, 20)) {
      if (meal.consumed_at) {
        const { hour: h, minute: m } = wallClockHourMinute(meal.consumed_at);
        mealTimes.push(h + m / 60);
      }
    }

    const avgOf = (lo: number, hi: number) => {
      const inRange = mealTimes.filter((t) => t >= lo && t <= hi);
      const sum = inRange.reduce((a, b) => a + b, 0);
      return sum / Math.max(inRange.length, 1);
    };
    const avgBreakfastTime = avgOf(5, 11);
    const avgLunchTime = avgOf(11, 15);
    const avgDinnerTime = avgOf(17, 22);

    // Formats using the wall-clock hour/minute as written in the ISO string
    // (matches Python's now.strftime('%I:%M %p') on an offset-aware
    // datetime, which does not convert to the server's local timezone).
    const fmt12h = (h24: number, minute: number) => {
      let h = h24 % 12;
      if (h === 0) h = 12;
      const min = minute.toString().padStart(2, "0");
      const ampm = h24 >= 12 ? "PM" : "AM";
      return `${h.toString().padStart(2, "0")}:${min} ${ampm}`;
    };
    const { hour: nowHour, minute: nowMinute } = wallClockHourMinute(currentTime);

    let context = `You are a nutrition AI assistant. Analyze the user's current situation and provide ONE smart reminder - the MOST IMPORTANT thing they should know right now.

Current Time: ${fmt12h(nowHour, nowMinute)}
User is currently fasting: ${isFasting}

TODAY'S NUTRITION:
- Calories: ${todaysCalories.toFixed(0)} / ${goals.calories ?? 2000} kcal
- Protein: ${todaysProtein.toFixed(0)}g / ${goals.protein ?? 150}g
- Carbs: ${todaysCarbs.toFixed(0)}g / ${goals.carbs ?? 250}g
- Fat: ${todaysFat.toFixed(0)}g / ${goals.fat ?? 65}g
- Meals logged today: ${todaysMeals.length}

FASTING STATUS:`;

    if (isFasting && activeFast) {
      const startedAt = new Date(activeFast.started_at.replace("Z", "+00:00"));
      const elapsedSeconds = (nowInstant.getTime() - startedAt.getTime()) / 1000;
      const plannedSeconds = (activeFast.planned_duration_hours ?? 16) * 3600;
      const remainingSeconds = Math.max(0, plannedSeconds - elapsedSeconds);

      context += `
- Currently fasting for ${(elapsedSeconds / 3600).toFixed(1)} hours
- Planned duration: ${activeFast.planned_duration_hours ?? 16} hours
- Time remaining: ${(remainingSeconds / 3600).toFixed(1)} hours
- AI recommended: ${activeFast.ai_recommended ?? false}`;
    } else {
      context += `
- Not currently fasting
- Fasting enabled in goals: ${goals.fasting_enabled ?? false}
- Preferred schedule: ${(goals as Record<string, unknown>).fasting_schedule_type ?? "not set"}
- Recent fasting sessions: ${fastingHistory.length}`;
    }

    context += `

MEAL PATTERNS (from last 7 days):
- Typical breakfast time: ${avgBreakfastTime.toFixed(1)}:00 (${Math.round((avgBreakfastTime % 1) * 60).toString().padStart(2, "0")})
- Typical lunch time: ${avgLunchTime.toFixed(1)}:00 (${Math.round((avgLunchTime % 1) * 60).toString().padStart(2, "0")})
- Typical dinner time: ${avgDinnerTime.toFixed(1)}:00 (${Math.round((avgDinnerTime % 1) * 60).toString().padStart(2, "0")})
- Average meals per day: ${(recentMeals.length / 7).toFixed(1)}

GOALS:
- Fasting enabled: ${goals.fasting_enabled ?? false}
- Meal reminders enabled: ${(goals as Record<string, unknown>).meal_reminder_enabled ?? false}
- Calorie goal: ${goals.calories ?? 2000} kcal
- Protein goal: ${goals.protein ?? 150}g

Based on this analysis, determine the MOST IMPORTANT reminder right now. Consider:
1. If fasting is active and approaching completion
2. If user hasn't eaten and it's past their typical meal time
3. If they're far behind on any macro (especially protein)
4. If they should start fasting based on their schedule
5. If they need to log more meals today

Return a JSON object with:
{
    "type": "fasting" | "meal" | "nutrition" | "general",
    "priority": "high" | "medium" | "low",
    "message": "Clear, actionable message (1-2 sentences)",
    "action": "Specific next step to take",
    "details": "Optional additional context",
    "icon": "timer" | "utensils" | "trending" | "alert" | "bell",
    "timestamp": "${currentTime}"
}

Only return the JSON, no other text.`;

    console.log(`[REMINDERS] Requesting AI reminder for user at ${fmt12h(nowHour, nowMinute)}`);

    const responseText = await generateContent(apiKey, "gemini-2.0-flash-exp", [{ text: context }]);

    console.log("[REMINDERS] AI Response received");

    try {
      let cleaned = responseText.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.split("```")[1] ?? "";
        if (cleaned.startsWith("json")) cleaned = cleaned.slice(4);
      }
      const reminderData = JSON.parse(cleaned.trim());
      console.log(`[REMINDERS] Parsed reminder: ${reminderData.type} - ${reminderData.priority}`);
      return jsonResponse(reminderData, { status: 200 }, origin);
    } catch (e) {
      console.log(`[REMINDERS] Error parsing response: ${e}`);
      return jsonResponse(
        getFallbackReminder(isFasting, hour, todaysCalories, goals),
        { status: 200 },
        origin,
      );
    }
  } catch (e) {
    console.log(`[REMINDERS] Error: ${e}`);
    const fallbackCalories = todaysMeals.reduce((s, m) => s + (m.total_calories ?? 0), 0);
    return jsonResponse(
      getFallbackReminder(isFasting, new Date().getHours(), fallbackCalories, goals),
      { status: 200 },
      origin,
    );
  }
});
