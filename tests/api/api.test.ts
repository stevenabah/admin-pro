/**
 * API 自动化测试脚本
 * 使用 Node.js Fetch API
 *
 * 运行方式:
 *   npx tsx tests/api/api.test.ts
 *   或
 *   npx vitest run tests/api
 */

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

interface ApiResponse<T = any> {
  code: number;
  message?: string;
  data?: T;
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function apiRequest<T = any>(
  method: string,
  endpoint: string,
  options: {
    body?: object;
    headers?: Record<string, string>;
  } = {},
): Promise<ApiResponse<T>> {
  const { body, headers = {} } = options;

  const start = Date.now();
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    const duration = Date.now() - start;

    return {
      code: response.status,
      ...data,
      _duration: duration,
      _status: response.status,
    };
  } catch (error) {
    const duration = Date.now() - start;
    throw new Error(`请求失败 (${duration}ms): ${error.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `期望 ${expected}, 实际 ${actual}`);
  }
}

function assertContains(actual: string, expected: string, message?: string) {
  if (!actual || !actual.includes(expected)) {
    throw new Error(message || `期望包含 "${expected}", 实际 "${actual}"`);
  }
}

async function runTest(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    console.log(`  ✓ ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - start;
    results.push({ name, passed: false, duration, error: error.message });
    console.log(`  ✗ ${name} (${duration}ms)`);
    console.log(`    Error: ${error.message}`);
  }
}

async function runSuite(name: string, fn: () => Promise<void>) {
  console.log(`\n${name}`);
  console.log("=".repeat(50));
  await fn();
}

// ==================== 测试用例 ====================

async function testHealthCheck() {
  await runTest("TC-API-001: 健康检查接口", async () => {
    const res = await apiRequest("GET", "/api/health");
    assertEqual(res.code, 200);
    assert(res.data?.status === "ok", "健康检查应返回 ok 状态");
  });
}

async function testAuthModule() {
  let authToken = "";

  await runSuite("认证模块测试", async () => {
    await runTest("TC-API-010: 正常登录", async () => {
      const res = await apiRequest("POST", "/api/auth/login", {
        body: { username: "admin", password: "admin123" },
      });
      assertEqual(res.code, 200, "登录应返回200");
      assertContains(res.message || "", "成功", "登录应成功");
      assert(res.data?.token, "应返回token");
      assertEqual(res.data?.user?.username, "admin", "用户名应为admin");
      authToken = res.data?.token;
    });

    await runTest("TC-API-011: 错误密码登录", async () => {
      const res = await apiRequest("POST", "/api/auth/login", {
        body: { username: "admin", password: "wrongpassword" },
      });
      assertEqual(res.code, 401, "错误密码应返回401");
    });

    await runTest("TC-API-012: 用户名不存在", async () => {
      const res = await apiRequest("POST", "/api/auth/login", {
        body: { username: "nonexistent", password: "anypassword" },
      });
      assertEqual(res.code, 401, "不存在的用户应返回401");
    });

    await runTest("TC-API-013: 空用户名登录", async () => {
      const res = await apiRequest("POST", "/api/auth/login", {
        body: { username: "", password: "admin123" },
      });
      assertEqual(res.code, 400, "空用户名应返回400");
    });

    await runTest("TC-API-014: 空密码登录", async () => {
      const res = await apiRequest("POST", "/api/auth/login", {
        body: { username: "admin", password: "" },
      });
      assertEqual(res.code, 400, "空密码应返回400");
    });

    await runTest("TC-API-015: 获取当前用户信息", async () => {
      const res = await apiRequest("GET", "/api/auth/user", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "应返回200");
      assertEqual(res.data?.username, "admin", "用户名应为admin");
    });

    await runTest("TC-API-016: 获取用户权限信息", async () => {
      const res = await apiRequest("GET", "/api/auth/userinfo", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "应返回200");
      assert(res.data?.permissions, "应包含权限列表");
      assert(res.data?.menus, "应包含菜单树");
    });

    await runTest("TC-API-017: 登出", async () => {
      const res = await apiRequest("POST", "/api/auth/logout", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "登出应返回200");
    });
  });

  return authToken;
}

async function testPermissionModule(authToken: string) {
  await runSuite("权限控制测试", async () => {
    await runTest("TC-API-020: 未登录访问受限接口", async () => {
      const res = await apiRequest("GET", "/api/users");
      assertEqual(res.code, 401, "未登录应返回401");
    });

    await runTest("TC-API-021: 无效Token访问", async () => {
      const res = await apiRequest("GET", "/api/users", {
        headers: { Authorization: "Bearer invalid_token_123" },
      });
      assertEqual(res.code, 401, "无效token应返回401");
    });

    await runTest("TC-API-022: 有效Token访问", async () => {
      const res = await apiRequest("GET", "/api/users", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "有效token应返回200");
    });
  });
}

async function testUserModule(authToken: string) {
  await runSuite("用户管理测试", async () => {
    await runTest("TC-API-030: 获取用户列表", async () => {
      const res = await apiRequest("GET", "/api/users", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "应返回200");
      assert(Array.isArray(res.data?.list), "应返回用户列表");
      assert(typeof res.data?.total === "number", "应返回总数");
    });

    await runTest("TC-API-031: 用户列表分页", async () => {
      const res = await apiRequest("GET", "/api/users?page=1&pageSize=5", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "应返回200");
      assertEqual(res.data?.page, 1, "页码应为1");
      assertEqual(res.data?.pageSize, 5, "每页应为5条");
    });

    await runTest("TC-API-032: 用户列表搜索", async () => {
      const res = await apiRequest("GET", "/api/users?keyword=admin", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "应返回200");
      // 验证返回的用户包含关键词（如果有结果）
      if (res.data?.list?.length > 0) {
        const hasMatch = res.data.list.some(
          (u: any) =>
            u.username?.includes("admin") ||
            u.nickname?.includes("admin") ||
            u.email?.includes("admin"),
        );
        assert(hasMatch, "应包含搜索关键词");
      }
    });

    await runTest("TC-API-033: 创建新用户", async () => {
      const timestamp = Date.now();
      const res = await apiRequest("POST", "/api/users", {
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          username: `apitest_${timestamp}`,
          password: "Test123456",
          nickname: `API测试用户${timestamp}`,
        },
      });
      assertEqual(res.code, 200, "创建用户应返回200");
    });

    await runTest("TC-API-034: 创建重复用户名", async () => {
      const res = await apiRequest("POST", "/api/users", {
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          username: "admin",
          password: "Test123456",
        },
      });
      assertEqual(res.code, 400, "重复用户名应返回400");
    });

    await runTest("TC-API-035: 更新用户信息", async () => {
      // 先创建一个用户
      const timestamp = Date.now();
      const createRes = await apiRequest("POST", "/api/users", {
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          username: `update_test_${timestamp}`,
          password: "Test123456",
          nickname: "原始昵称",
        },
      });

      // 更新用户
      const res = await apiRequest("PUT", `/api/users/${createRes.data?.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        body: { nickname: "新昵称" },
      });
      assertEqual(res.code, 200, "更新用户应返回200");
    });

    await runTest("TC-API-036: 删除用户", async () => {
      // 先创建一个用户
      const timestamp = Date.now();
      const createRes = await apiRequest("POST", "/api/users", {
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          username: `delete_test_${timestamp}`,
          password: "Test123456",
        },
      });

      // 删除用户
      const res = await apiRequest(
        "DELETE",
        `/api/users/${createRes.data?.id}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
      assertEqual(res.code, 200, "删除用户应返回200");
    });
  });
}

async function testRoleModule(authToken: string) {
  await runSuite("角色管理测试", async () => {
    await runTest("TC-API-040: 获取角色列表", async () => {
      const res = await apiRequest("GET", "/api/roles", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "应返回200");
      assert(Array.isArray(res.data?.list), "应返回角色列表");
    });

    await runTest("TC-API-041: 获取权限列表", async () => {
      const res = await apiRequest("GET", "/api/permissions", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "应返回200");
    });
  });
}

async function testDataModule(authToken: string) {
  let createdRecordId = "";

  await runSuite("数据管理测试", async () => {
    await runTest("TC-API-050: 创建数据记录", async () => {
      const res = await apiRequest("POST", "/api/data", {
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          title: "API测试任务",
          content: "测试内容",
          category: "开发",
          amount: 100,
        },
      });
      assertEqual(res.code, 200, "创建数据应返回200");
      assert(res.data?.id, "应返回新建记录ID");
      createdRecordId = res.data?.id;
    });

    await runTest("TC-API-051: 获取数据列表", async () => {
      const res = await apiRequest("GET", "/api/data", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "应返回200");
      assert(Array.isArray(res.data?.list), "应返回数据列表");
    });

    await runTest("TC-API-052: 数据分页查询", async () => {
      const res = await apiRequest("GET", "/api/data?page=1&pageSize=10", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "应返回200");
      assertEqual(res.data?.page, 1, "页码应为1");
    });

    await runTest("TC-API-053: 数据搜索", async () => {
      const res = await apiRequest("GET", "/api/data?keyword=测试", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "应返回200");
    });

    await runTest("TC-API-054: 分类筛选", async () => {
      const res = await apiRequest("GET", "/api/data?category=开发", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "应返回200");
    });

    await runTest("TC-API-055: 更新数据状态", async () => {
      const res = await apiRequest("PUT", `/api/data/${createdRecordId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        body: { status: 2 },
      });
      assertEqual(res.code, 200, "更新数据应返回200");
    });

    await runTest("TC-API-056: 删除数据", async () => {
      const res = await apiRequest("DELETE", `/api/data/${createdRecordId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "删除数据应返回200");
    });

    await runTest("TC-API-057: 批量删除", async () => {
      // 先创建3条记录
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const res = await apiRequest("POST", "/api/data", {
          headers: { Authorization: `Bearer ${authToken}` },
          body: { title: `批量删除测试${i}` },
        });
        ids.push(res.data?.id);
      }

      // 批量删除
      const deleteRes = await apiRequest("POST", "/api/data/batch-delete", {
        headers: { Authorization: `Bearer ${authToken}` },
        body: { ids },
      });
      assertEqual(deleteRes.code, 200, "批量删除应返回200");
    });
  });
}

async function testFileModule(authToken: string) {
  await runSuite("文件管理测试", async () => {
    await runTest("TC-API-060: 获取文件列表", async () => {
      const res = await apiRequest("GET", "/api/files", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "应返回200");
    });
  });
}

async function testMediaModule(authToken: string) {
  await runSuite("媒体管理测试", async () => {
    await runTest("TC-API-070: 获取媒体列表", async () => {
      const res = await apiRequest("GET", "/api/media", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "应返回200");
    });
  });
}

async function testStatsModule(authToken: string) {
  await runSuite("数据统计测试", async () => {
    await runTest("TC-API-080: 获取仪表盘数据", async () => {
      const res = await apiRequest("GET", "/api/stats/dashboard", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "应返回200");
      assert(typeof res.data?.userCount === "number", "应包含用户数量");
    });

    await runTest("TC-API-081: 获取图表数据", async () => {
      const res = await apiRequest("GET", "/api/stats/chart-data", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "应返回200");
      assert(res.data?.visitChart, "应包含访问图表数据");
    });
  });
}

async function testBoundaryCases(authToken: string) {
  await runSuite("边界测试", async () => {
    await runTest("TC-API-090: 空标题创建数据", async () => {
      const res = await apiRequest("POST", "/api/data", {
        headers: { Authorization: `Bearer ${authToken}` },
        body: { title: "" },
      });
      // 应该返回错误或使用默认值
      assert([200, 400, 500].includes(res.code), "应返回有效状态码");
    });

    await runTest("TC-API-091: SQL注入防护", async () => {
      const res = await apiRequest(
        "GET",
        "/api/users?keyword=%27%20OR%20%271%27%3D%271",
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
      assertEqual(res.code, 200, "应返回200而不是暴露错误");
    });

    await runTest("TC-API-092: 超长标题", async () => {
      const res = await apiRequest("POST", "/api/data", {
        headers: { Authorization: `Bearer ${authToken}` },
        body: { title: "a".repeat(10000) },
      });
      assert([200, 400, 500].includes(res.code), "应返回有效状态码");
    });

    await runTest("TC-API-093: 负数分页参数", async () => {
      const res = await apiRequest("GET", "/api/users?page=-1", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assertEqual(res.code, 200, "应返回200而不是崩溃");
    });

    await runTest("TC-API-094: 金额精度", async () => {
      const res = await apiRequest("POST", "/api/data", {
        headers: { Authorization: `Bearer ${authToken}` },
        body: { title: "金额测试", amount: 99.999999 },
      });
      assertEqual(res.code, 200, "应正确处理金额精度");
    });
  });
}

async function testPerformance(authToken: string) {
  await runSuite("性能测试", async () => {
    await runTest("TC-API-100: API响应时间", async () => {
      const start = Date.now();
      const res = await apiRequest("GET", "/api/users", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const duration = Date.now() - start;

      assertEqual(res.code, 200, "应返回200");
      console.log(`      响应时间: ${duration}ms`);
      assert(duration < 1000, `响应时间应小于1秒, 实际 ${duration}ms`);
    });

    await runTest("TC-API-101: 并发请求", async () => {
      const promises = Array(10)
        .fill(null)
        .map(() =>
          apiRequest("GET", "/api/users", {
            headers: { Authorization: `Bearer ${authToken}` },
          }),
        );

      const start = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      assert(
        results.every((r) => r.code === 200),
        "所有请求应成功",
      );
      console.log(`      10个并发请求耗时: ${duration}ms`);
      assert(duration < 3000, "并发请求应在3秒内完成");
    });
  });
}

// ==================== 主函数 ====================

async function main() {
  console.log("=".repeat(60));
  console.log("Admin-Pro API 自动化测试");
  console.log("=".repeat(60));
  console.log(`\n测试地址: ${API_BASE_URL}`);
  console.log(`开始时间: ${new Date().toISOString()}\n`);

  // 先测试健康检查
  await testHealthCheck();

  // 测试认证模块（获取token）
  const authToken = await testAuthModule();

  if (!authToken) {
    console.error("\n无法获取认证Token，终止测试");
    process.exit(1);
  }

  console.log("\n已获取认证Token，继续测试...");

  // 执行其他模块测试
  await testPermissionModule(authToken);
  await testUserModule(authToken);
  await testRoleModule(authToken);
  await testDataModule(authToken);
  await testFileModule(authToken);
  await testMediaModule(authToken);
  await testStatsModule(authToken);
  await testBoundaryCases(authToken);
  await testPerformance(authToken);

  // 输出测试结果
  console.log("\n" + "=".repeat(60));
  console.log("测试结果汇总");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n总测试数: ${results.length}`);
  console.log(
    `通过: ${passed} (${((passed / results.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `失败: ${failed} (${((failed / results.length) * 100).toFixed(1)}%)`,
  );
  console.log(`总耗时: ${totalDuration}ms`);
  console.log(`平均耗时: ${Math.round(totalDuration / results.length)}ms`);

  if (failed > 0) {
    console.log("\n失败用例:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}`);
        console.log(`    ${r.error}`);
      });
  }

  console.log("\n" + "=".repeat(60));

  // 输出JUnit XML格式结果（可用于CI）
  const junitXml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="Admin-Pro API Tests" tests="${results.length}" failures="${failed}" time="${(totalDuration / 1000).toFixed(3)}">
${results.map((r) => `  <testcase name="${r.name}" time="${(r.duration / 1000).toFixed(3)}"${r.passed ? " />" : `>\n    <failure>${r.error}</failure>\n  </testcase>`}`).join("\n")}
</testsuite>`;

  // 保存测试结果
  const fs = await import("fs");
  fs.writeFileSync("test-results.xml", junitXml);
  console.log("\nJUnit XML结果已保存到: test-results.xml");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("测试执行失败:", error);
  process.exit(1);
});
