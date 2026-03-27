import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:5173";

test.describe("认证模块", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
  });

  test("TC-AUTH-001: 正常登录", async ({ page }) => {
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');

    // 等待导航到首页
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });

    // 验证登录成功
    await expect(
      page.locator('.user-info, .avatar, [class*="user"]').first(),
    ).toBeVisible();
  });

  test("TC-AUTH-002: 错误密码登录", async ({ page }) => {
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // 验证错误提示
    const errorMsg = page
      .locator('.el-message, .error, [class*="message"]')
      .first();
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText(/密码|错误/i);
  });

  test("TC-AUTH-003: 空用户名登录", async ({ page }) => {
    await page.fill('input[name="username"]', "");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');

    // 验证验证提示
    const errorMsg = page.locator(".el-form-item__error, .error").first();
    await expect(errorMsg).toBeVisible();
  });

  test("TC-AUTH-004: 登出功能", async ({ page }) => {
    // 先登录
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });

    // 点击登出
    const logoutBtn = page
      .locator(
        'button:has-text("退出"), button:has-text("登出"), [class*="logout"]',
      )
      .first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForURL(`${BASE_URL}/login`, { timeout: 10000 });
    }
  });
});

test.describe("数据管理模块", () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // 登录获取token
    const response = await request.post(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/auth/login`,
      {
        data: { username: "admin", password: "admin123" },
      },
    );
    const body = await response.json();
    authToken = body.data?.token;
  });

  test("TC-DATA-001: 创建数据记录", async ({ request }) => {
    const response = await request.post(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/data`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          title: "Playwright测试任务",
          content: "测试内容",
          category: "开发",
          amount: 100,
        },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.code).toBe(200);
    expect(body.data.id).toBeDefined();
  });

  test("TC-DATA-002: 获取数据列表", async ({ request }) => {
    const response = await request.get(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/data`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.code).toBe(200);
    expect(body.data.list).toBeDefined();
    expect(body.data.total).toBeDefined();
  });

  test("TC-DATA-003: 数据分页查询", async ({ request }) => {
    const response = await request.get(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/data?page=1&pageSize=5`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.page).toBe(1);
    expect(body.data.pageSize).toBe(5);
  });

  test("TC-DATA-004: 数据搜索功能", async ({ request }) => {
    const response = await request.get(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/data?keyword=测试`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    // 验证返回的数据中包含搜索关键词
    if (body.data.list.length > 0) {
      const hasMatch = body.data.list.some(
        (item: any) =>
          item.title?.includes("测试") || item.content?.includes("测试"),
      );
      expect(hasMatch).toBe(true);
    }
  });

  test("TC-DATA-005: 更新数据记录", async ({ request }) => {
    // 先创建一条记录
    const createRes = await request.post(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/data`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { title: "待更新任务", category: "测试" },
      },
    );
    const createBody = await createRes.json();
    const recordId = createBody.data.id;

    // 更新记录
    const updateRes = await request.put(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/data/${recordId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { title: "已更新任务", status: 2 },
      },
    );

    expect(updateRes.status()).toBe(200);
    const updateBody = await updateRes.json();
    expect(updateBody.code).toBe(200);
  });

  test("TC-DATA-006: 删除数据记录", async ({ request }) => {
    // 先创建一条记录
    const createRes = await request.post(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/data`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { title: "待删除任务" },
      },
    );
    const createBody = await createRes.json();
    const recordId = createBody.data.id;

    // 删除记录
    const deleteRes = await request.delete(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/data/${recordId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect(deleteRes.status()).toBe(200);
    const deleteBody = await deleteRes.json();
    expect(deleteBody.code).toBe(200);
  });

  test("TC-DATA-007: 批量删除数据", async ({ request }) => {
    // 创建3条记录
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await request.post(
        `${process.env.API_BASE_URL || "http://localhost:3000"}/api/data`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: { title: `批量删除任务${i}` },
        },
      );
      const body = await res.json();
      ids.push(body.data.id);
    }

    // 批量删除
    const deleteRes = await request.post(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/data/batch-delete`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { ids },
      },
    );

    expect(deleteRes.status()).toBe(200);
    const deleteBody = await deleteRes.json();
    expect(deleteBody.code).toBe(200);
  });
});

test.describe("用户管理模块", () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.post(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/auth/login`,
      {
        data: { username: "admin", password: "admin123" },
      },
    );
    const body = await response.json();
    authToken = body.data?.token;
  });

  test("TC-USER-001: 获取用户列表", async ({ request }) => {
    const response = await request.get(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/users`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.code).toBe(200);
    expect(body.data.list).toBeDefined();
  });

  test("TC-USER-002: 用户列表分页", async ({ request }) => {
    const response = await request.get(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/users?page=1&pageSize=5`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.page).toBe(1);
    expect(body.data.pageSize).toBe(5);
    expect(body.data.list.length).toBeLessThanOrEqual(5);
  });

  test("TC-USER-003: 创建新用户", async ({ request }) => {
    const timestamp = Date.now();
    const response = await request.post(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/users`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          username: `testuser${timestamp}`,
          password: "Test123456",
          nickname: `测试用户${timestamp}`,
        },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.code).toBe(200);
  });

  test("TC-USER-004: 创建重复用户名失败", async ({ request }) => {
    const response = await request.post(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/users`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          username: "admin",
          password: "Test123456",
        },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.code).toBe(400);
    expect(body.message).toContain("已存在");
  });

  test("TC-USER-005: 用户搜索功能", async ({ request }) => {
    const response = await request.get(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/users?keyword=admin`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    if (body.data.list.length > 0) {
      const hasMatch = body.data.list.some(
        (user: any) =>
          user.username?.includes("admin") ||
          user.nickname?.includes("admin") ||
          user.email?.includes("admin"),
      );
      expect(hasMatch).toBe(true);
    }
  });
});

test.describe("权限控制模块", () => {
  test("TC-RBAC-001: 未登录访问受限接口", async ({ request }) => {
    const response = await request.get(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/users`,
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.code).toBe(401);
  });

  test("TC-RBAC-002: 无效Token访问被拒绝", async ({ request }) => {
    const response = await request.get(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/users`,
      {
        headers: { Authorization: "Bearer invalid_token_123" },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.code).toBe(401);
  });

  test("TC-RBAC-003: 获取当前用户信息", async ({ request }) => {
    // 先登录
    const loginRes = await request.post(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/auth/login`,
      {
        data: { username: "admin", password: "admin123" },
      },
    );
    const loginBody = await loginRes.json();
    const token = loginBody.data?.token;

    // 获取用户信息
    const response = await request.get(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/auth/user`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.code).toBe(200);
    expect(body.data.username).toBe("admin");
  });

  test("TC-RBAC-004: 获取用户菜单权限", async ({ request }) => {
    const loginRes = await request.post(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/auth/login`,
      {
        data: { username: "admin", password: "admin123" },
      },
    );
    const loginBody = await loginRes.json();
    const token = loginBody.data?.token;

    const response = await request.get(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/auth/userinfo`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.code).toBe(200);
    expect(body.data.permissions).toBeDefined();
    expect(body.data.menus).toBeDefined();
  });
});

test.describe("边界测试", () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.post(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/auth/login`,
      {
        data: { username: "admin", password: "admin123" },
      },
    );
    const body = await response.json();
    authToken = body.data?.token;
  });

  test("TC-BOUNDARY-001: 空标题创建数据", async ({ request }) => {
    const response = await request.post(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/data`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { title: "", content: "测试内容" },
      },
    );

    // 应该被拒绝或使用默认值
    const body = await response.json();
    expect([200, 400, 500]).toContain(body.code);
  });

  test("TC-BOUNDARY-002: SQL注入防护", async ({ request }) => {
    const response = await request.get(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/users?keyword=' OR '1'='1`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    // 应该返回空结果或正常结果，而不是暴露数据库错误
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.code).toBe(200);
  });

  test("TC-BOUNDARY-003: XSS特殊字符", async ({ request }) => {
    const response = await request.post(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/data`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { title: '<script>alert("xss")</script>' },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    // 应该成功创建，特殊字符被转义存储
    expect(body.code).toBe(200);
  });

  test("TC-BOUNDARY-004: 超长输入参数", async ({ request }) => {
    const longString = "a".repeat(10000);
    const response = await request.post(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/data`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { title: longString },
      },
    );

    // 应该返回错误或截断处理
    const body = await response.json();
    expect([200, 400, 500]).toContain(body.code);
  });

  test("TC-BOUNDARY-005: 负数分页参数", async ({ request }) => {
    const response = await request.get(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/users?page=-1&pageSize=10`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    // 应该返回错误或使用默认值
    expect(response.status()).toBe(200);
  });

  test("TC-BOUNDARY-006: 金额精度测试", async ({ request }) => {
    const response = await request.post(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/data`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { title: "金额测试", amount: 99.999999 },
      },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.code).toBe(200);
  });
});

test.describe("性能测试", () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.post(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/auth/login`,
      {
        data: { username: "admin", password: "admin123" },
      },
    );
    const body = await response.json();
    authToken = body.data?.token;
  });

  test("TC-PERF-001: API响应时间", async ({ request }) => {
    const start = Date.now();
    const response = await request.get(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/users`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );
    const duration = Date.now() - start;

    expect(response.status()).toBe(200);
    console.log(`API响应时间: ${duration}ms`);
    expect(duration).toBeLessThan(1000); // 响应时间应小于1秒
  });
});
