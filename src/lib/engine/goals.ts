import { Goal } from "../types";
import { sipForTarget } from "./retirement";

export interface GoalAnalysis {
  goal: Goal;
  /** Inflated cost at the goal date */
  futureCost: number;
  /** FV of what's already saved for the goal */
  futureSaved: number;
  gap: number;
  /** Monthly SIP needed from today to fund the gap */
  monthlyNeeded: number;
  fundedPct: number;
}

export function analyzeGoal(goal: Goal, expectedReturnPct: number): GoalAnalysis {
  const futureCost = goal.presentCost * Math.pow(1 + goal.inflationPct / 100, goal.yearsToGoal);
  const futureSaved = goal.saved * Math.pow(1 + expectedReturnPct / 100, goal.yearsToGoal);
  const gap = Math.max(0, futureCost - futureSaved);
  return {
    goal,
    futureCost,
    futureSaved,
    gap,
    monthlyNeeded: sipForTarget(gap, goal.yearsToGoal * 12, expectedReturnPct),
    fundedPct: futureCost > 0 ? Math.min(100, (futureSaved / futureCost) * 100) : 100,
  };
}

/**
 * Total monthly SIP that goals divert away from retirement investing —
 * the "impact on retirement" of funding all goals from the same budget.
 */
export function totalGoalMonthly(goals: Goal[], expectedReturnPct: number): number {
  return goals.reduce((sum, g) => {
    const m = analyzeGoal(g, expectedReturnPct).monthlyNeeded;
    return sum + (Number.isFinite(m) ? m : 0);
  }, 0);
}
