import { expect, test, type APIRequestContext } from "@playwright/test";

const API = "http://localhost:4000/api";

async function token(request: APIRequestContext, email: string, password = "Password123!") {
  return (await (await request.post(`${API}/auth/login`, { data: { email, password } })).json()).token as string;
}

/** a fresh student, so the seed students' sharing choices stay as they are */
async function freshStudent(request: APIRequestContext) {
  const staff = { Authorization: `Bearer ${await token(request, "staff@showpro.local")}` };
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `e2e-cvshare-${stamp}@example.com`;
  expect((await request.post(`${API}/users/import/students`, { headers: staff, data: { rows: [{
    studentId: `69${stamp.slice(-7)}`, name: "CV Share", nameThai: "แชร์ ซีวี", email, major: "DII", program: "DII", year: 3, semester: 1, academicYear: "2569", password: "Temp-Pass-123!",
  }] } })).ok()).toBeTruthy();
  const temp = { Authorization: `Bearer ${await token(request, email, "Temp-Pass-123!")}` };
  expect((await request.patch(`${API}/users/profile`, { headers: temp, data: { currentPassword: "Temp-Pass-123!", newPassword: "Password123!" } })).ok()).toBeTruthy();
  return email;
}

test("a student adds a CV link and chooses to share it with companies from Settings", async ({ page, request }) => {
  const email = await freshStudent(request);
  await page.goto("/login");
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", "Password123!");
  await page.keyboard.press("Enter");
  await page.waitForURL("**/dashboard");
  await page.goto("/settings");

  const card = page.getByTestId("cv-sharing");
  await expect(card.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  await card.getByLabel(/ลิงก์ CV/).fill("https://cv.example.com/me.pdf");
  await card.getByRole("switch").click();
  const saved = page.waitForResponse((r) => r.url().endsWith("/api/students/profile") && r.request().method() === "PATCH");
  await card.getByRole("button", { name: "บันทึก CV และการแชร์" }).click();
  expect((await saved).status()).toBe(200);

  const auth = { Authorization: `Bearer ${await token(request, email)}` };
  const profile = (await (await request.get(`${API}/students/profile`, { headers: auth })).json()).profile;
  expect(profile.cvUrl).toBe("https://cv.example.com/me.pdf");
  expect(profile.consent.allowDataSharing).toBe(true);

  await page.reload();
  await expect(page.getByTestId("cv-sharing").getByLabel(/ลิงก์ CV/)).toHaveValue("https://cv.example.com/me.pdf");
  await expect(page.getByTestId("cv-sharing").getByRole("switch")).toHaveAttribute("aria-checked", "true");
});
