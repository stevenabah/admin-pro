# 测试文档索引

本文档索引了 Admin-Pro 后台管理系统的所有测试相关资源。

## 文档列表

### 1. 测试策略与计划

- **[TEST-STRATEGY.md](./TEST-STRATEGY.md)** - 完整测试方案文档
  - 测试计划（范围、目标、策略、环境、风险）
  - 测试用例设计（功能、边界、兼容性、性能）
  - 缺陷管理（报告模板、严重程度定义）

### 2. Sprint测试计划

- **[test-plan.md](./test-plan.md)** - Sprint 1 详细测试计划
  - 登录/登出功能测试用例
  - 用户管理CRUD测试用例
  - 权限控制测试用例
  - API接口测试用例
  - curl测试脚本

### 3. 任务管理模块测试用例

- **[TASK-TEST-DESIGN.md](./TASK-TEST-DESIGN.md)** - 基于PRD的任务管理专项测试
  - 任务创建功能测试用例（TC-TASK-C001 ~ TC-TASK-C007）
  - 任务分配功能测试用例（TC-TASK-A001 ~ TC-TASK-A005）
  - 任务跟踪功能测试用例（TC-TASK-T001 ~ TC-TASK-T009）
  - 统计报表功能测试用例（TC-TASK-S001 ~ TC-TASK-S010）
  - 权限控制测试用例（TC-TASK-P001 ~ TC-TASK-P004）
  - 性能与安全测试用例（TC-TASK-PERF001 ~ TC-TASK-SEC003）
  - 边界测试用例（TC-TASK-BOUND001 ~ TC-TASK-BOUND004）
  - 兼容性测试用例（TC-TASK-COMP001 ~ TC-TASK-COMP004）
  - API测试用例（API-TASK-001 ~ API-TASK-006）

## 自动化测试代码

### E2E测试 (Playwright)

- **[tests/e2e/playwright.config.ts](../tests/e2e/playwright.config.ts)** - Playwright配置
- **[tests/e2e/auth.spec.ts](../tests/e2e/auth.spec.ts)** - E2E测试用例
  - 认证模块测试
  - 数据管理模块测试
  - 用户管理模块测试
  - 权限控制模块测试
  - 边界测试
  - 性能测试

### 单元测试 (Vitest)

- **[tests/unit/vitest.config.ts](../tests/unit/vitest.config.ts)** - Vitest配置
- **[tests/unit/auth.test.ts](../tests/unit/auth.test.ts)** - 单元测试用例
  - 认证逻辑测试
  - 数据验证测试
  - 业务逻辑测试
  - 权限验证测试

### API测试

- **[tests/api/api.test.ts](../tests/api/api.test.ts)** - API自动化测试
  - 健康检查
  - 认证模块
  - 权限控制
  - 用户管理
  - 角色管理
  - 数据管理
  - 文件管理
  - 媒体管理
  - 数据统计
  - 边界测试
  - 性能测试

## 快速开始

### 1. 安装测试依赖

```bash
cd tests/e2e
npm install
```

### 2. 运行API测试

```bash
# 确保后端服务运行在 http://localhost:3000
npm run test:api
```

### 3. 运行单元测试

```bash
npm run test:unit
```

### 4. 运行E2E测试

```bash
# 先启动开发服务器
npm run dev

# 运行E2E测试
npm run test:e2e
```

### 5. 查看测试覆盖率

```bash
npm run test:coverage
```

## 测试环境配置

### 环境变量

```bash
# API测试地址
API_BASE_URL=http://localhost:3000

# E2E测试地址
E2E_BASE_URL=http://localhost:5173
```

### 默认测试账号

| 角色     | 用户名 | 密码     |
| -------- | ------ | -------- |
| 管理员   | admin  | admin123 |
| 普通用户 | user   | user123  |

## 测试报告

测试完成后，会生成以下报告：

- **JUnit XML**: `test-results.xml` (用于CI/CD集成)
- **HTML报告**: Playwright HTML Reporter (E2E测试)
- **控制台输出**: 测试结果汇总

## 持续集成

可在 CI/CD 流程中加入以下测试命令：

```yaml
test:
  script:
    - npm run test:unit
    - npm run test:api
    - npm run test:e2e
```
