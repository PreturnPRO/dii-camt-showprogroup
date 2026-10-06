import { describe, expect, it } from 'vitest';
import { buildLeaderboard } from './activity-leaderboard';

const enrol = (studentId: string, name: string | null, rewardGranted: boolean) => ({
  studentId, rewardGranted, status: rewardGranted ? 'completed' : 'registered',
  student: { id: studentId, user: name === null ? null : { name, nameThai: name } },
});

describe('buildLeaderboard', () => {
  const activities = [
    { gamificationPoints: 50, enrollments: [enrol('a', 'Alice', true), enrol('b', 'Bob', false)] },
    { gamificationPoints: 20, enrollments: [enrol('a', 'Alice', true), enrol('c', null, true)] },
  ];

  it('counts only rewarded enrollments, never half points for merely registering', () => {
    const rows = buildLeaderboard(activities, 'x');
    expect(rows).toEqual([{ rank: 1, studentId: 'a', name: 'Alice', points: 70, isViewer: false }]);
  });

  it('keeps an opted-out student off other people\'s boards but shows them to themselves', () => {
    expect(buildLeaderboard(activities, 'x').some((r) => r.studentId === 'c')).toBe(false);
    const own = buildLeaderboard(activities, 'c').find((r) => r.studentId === 'c');
    expect(own).toMatchObject({ points: 20, isViewer: true });
  });

  it('is empty when nobody has been rewarded', () => {
    expect(buildLeaderboard([{ gamificationPoints: 10, enrollments: [enrol('b', 'Bob', false)] }], 'b')).toEqual([]);
  });
});
