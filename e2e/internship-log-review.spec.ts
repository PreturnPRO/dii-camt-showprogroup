import { expect, test, type APIRequestContext } from '@playwright/test';

// writes logs and reviews: only against a throw-away backend, never the dev server on :4000 by default
const API = process.env.TEST_API_BASE_URL ?? '';
test.skip(!API, 'set TEST_API_BASE_URL to a backend pointed at a test database');

async function auth(request: APIRequestContext, email: string) {
  const response = await request.post(`${API}/auth/login`, { data: { email, password: 'Password123!' } });
  expect(response.ok()).toBeTruthy();
  return { Authorization: `Bearer ${(await response.json()).token as string}` };
}

test('student diary review is scoped and persists', async ({ request }) => {
  const student = await auth(request, 'alice@student.showpro.local');
  const staff = await auth(request, 'staff@showpro.local');
  const otherStudent = await auth(request, 'bob@student.showpro.local');
  const created = await request.post(`${API}/internship/logs`, {
    headers: student,
    data: { date: new Date().toISOString().slice(0, 10), hours: 8, activities: 'Sprint 3 QA diary entry', learnings: 'Review workflow' },
  });
  expect(created.status()).toBe(201);
  const { id, updatedAt } = (await created.json()).log as { id: string; updatedAt: string };

  const forbidden = await request.patch(`${API}/internship/logs/${id}/review`, {
    headers: otherStudent, data: { status: 'approved' },
  });
  expect(forbidden.status()).toBe(403);

  const needsComment = await request.patch(`${API}/internship/logs/${id}/review`, {
    headers: staff, data: { status: 'changes_requested', updatedAt },
  });
  expect(needsComment.status()).toBe(400);

  const reviewed = await request.patch(`${API}/internship/logs/${id}/review`, {
    headers: staff, data: { status: 'changes_requested', comment: 'Please add more detail.', updatedAt },
  });
  expect(reviewed.ok()).toBeTruthy();
  const diary = await request.get(`${API}/internship/logs`, { headers: student });
  const log = (await diary.json()).internship.logs.find((item: { id: string }) => item.id === id);
  expect(log.reviewStatus).toBe('changes_requested');
  expect(log.reviewComment).toBe('Please add more detail.');
});
