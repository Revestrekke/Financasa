export interface Goal {
  id?: string | number;
  nome?: string;
  atual?: number | string;
  alvo?: number | string;
}

export function getGoalProgress(goal: Goal): number {
  return Math.min(100, Math.round(((Number(goal.atual) || 0) / (Number(goal.alvo) || 1)) * 100));
}
