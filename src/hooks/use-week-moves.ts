import React from 'react';
import { api, type ClassMoveView } from '@/lib/api';
import { thaiToday } from '@/lib/thai-date';
import { addDays, weekOf } from '@/lib/timetable';

/** this week's class moves for dashboards; an empty list when they cannot be loaded (the weekly classes still show) */
export const useWeekMoves = () => {
  const weekStart = weekOf(thaiToday());
  const [moves, setMoves] = React.useState<ClassMoveView[]>([]);
  React.useEffect(() => {
    let alive = true;
    api.classMoves.list(weekStart, addDays(weekStart, 6))
      .then((r) => { if (alive) setMoves(r.moves); })
      .catch(() => { if (alive) setMoves([]); });
    return () => { alive = false; };
  }, [weekStart]);
  return { weekStart, moves };
};
