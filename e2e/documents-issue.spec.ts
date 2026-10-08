import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";

async function token(request: APIRequestContext, email: string, password = "Password123!") {
  return (await (await request.post(`${API}/auth/login`, { data: { email, password } })).json()).token as string;
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await expect(page.locator("input[type=password]")).toBeVisible({ timeout: 15_000 });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
}

test("staff choose the document for a certificate request; nothing is generated from a guess", async ({ page, request }) => {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const stamp = Date.now();
  const email = `e2e-doc-${stamp}@example.com`;
  const studentCode = `65${String(stamp).slice(-7)}`;
  expect((await request.post(`${API}/users/import/students`, { headers: staff, data: { rows: [{
    studentId: studentCode, name: "Doc Student", nameThai: `นักศึกษา เอกสาร ${stamp}`, email, major: "DII", program: "DII", year: 1, semester: 1, academicYear: "2569", password: "Temp-Pass-123!",
  }] } })).ok()).toBeTruthy();
  const student = { Authorization: `Bearer ${await token(request, email, "Temp-Pass-123!")}` };
  const created = await request.post(`${API}/requests`, { headers: student, data: { type: "ขอใบรับรอง", title: "ขอใบรับรอง", description: "e2e" } });
  expect(created.ok()).toBeTruthy();
  const requestId = (await created.json()).request.id as string;

  await login(page, "staff@showpro.local");
  await page.goto("/documents");
  const row = page.getByTestId("document-request").filter({ hasText: studentCode });
  await expect(row).toHaveCount(1);
  const download = page.waitForEvent("download");
  await row.getByTestId("issue-transcript").click();
  expect((await download).suggestedFilename()).toBe(`transcript-${studentCode}.pdf`);
  await expect(row).toHaveCount(0);
  const after = (await (await request.get(`${API}/requests`, { headers: staff })).json()).requests.find((r: { id: string }) => r.id === requestId);
  expect(after.status).toBe("completed");

  // only cards the backend can really generate, each producing the document it is named after
  const cards = page.getByTestId("document-template");
  await expect(cards).toHaveCount(2);
  await expect(page.getByText(/หนังสือรับรองสถานภาพ|หนังสือลา|Leave Letter|Status Certificate/i)).toHaveCount(0);
});
