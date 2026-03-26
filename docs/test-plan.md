# Sprint 1 测试计划

## 1. 测试范围

| 模块      | 测试内容                                   |
| --------- | ------------------------------------------ |
| 登录/登出 | 正常登录、错误密码、空字段、账号禁用、登出 |
| 用户管理  | 增删改查（CRUD）、列表分页、搜索           |
| 权限控制  | 未登录访问受限接口、Token过期、权限不足    |
| 接口功能  | 各API端点正常响应                          |

## 2. 测试环境

- 后端服务: `http://localhost:3000`
- 前端访问: `http://localhost:5173`
- 默认账号: `admin / admin123`
- 数据库: SQLite (`server/prisma/dev.db`)

## 3. 测试用例

### 3.1 登录/登出功能

#### TC-001: 正常登录

- **用例编号**: TC-001
- **模块**: 登录
- **标题**: 使用正确账号密码登录成功
- **前置条件**: 系统正常运行
- **测试步骤**:
  1. 发送 POST `/api/auth/login` 请求，body: `{"username":"admin","password":"admin123"}`
- **预期结果**:
  - 返回 `code: 200`
  - 返回包含 `token` 和 `user` 信息
  - `user.username` 为 `admin`
- **优先级**: P0

#### TC-002: 密码错误

- **用例编号**: TC-002
- **模块**: 登录
- **标题**: 错误密码登录失败
- **测试步骤**:
  1. 发送 POST `/api/auth/login`，body: `{"username":"admin","password":"wrongpassword"}`
- **预期结果**: 返回 `code: 401`，message: "用户名或密码错误"
- **优先级**: P0

#### TC-003: 用户名不存在

- **用例编号**: TC-003
- **模块**: 登录
- **标题**: 不存在的用户名登录失败
- **测试步骤**:
  1. 发送 POST `/api/auth/login`，body: `{"username":"nonexistent","password":"any"}`
- **预期结果**: 返回 `code: 401`，message: "用户名或密码错误"
- **优先级**: P0

#### TC-004: 空用户名

- **用例编号**: TC-004
- **模块**: 登录
- **标题**: 用户名为空时登录失败
- **测试步骤**:
  1. 发送 POST `/api/auth/login`，body: `{"username":"","password":"admin123"}`
- **预期结果**: 返回 `code: 400`，message: "用户名和密码不能为空"
- **优先级**: P1

#### TC-005: 空密码

- **用例编号**: TC-005
- **模块**: 登录
- **标题**: 密码为空时登录失败
- **测试步骤**:
  1. 发送 POST `/api/auth/login`，body: `{"username":"admin","password":""}`
- **预期结果**: 返回 `code: 400`，message: "用户名和密码不能为空"
- **优先级**: P1

#### TC-006: 登出

- **用例编号**: TC-006
- **模块**: 登出
- **标题**: 登出成功
- **前置条件**: 已登录获取token
- **测试步骤**:
  1. 发送 POST `/api/auth/logout`，header: `Authorization: Bearer {token}`
- **预期结果**: 返回 `code: 200`，message: "登出成功"
- **优先级**: P0

### 3.2 用户管理 CRUD

#### TC-010: 获取用户列表

- **用例编号**: TC-010
- **模块**: 用户管理
- **标题**: 已登录用户可获取用户列表
- **前置条件**: 已登录（admin账号）
- **测试步骤**:
  1. 发送 GET `/api/users`，header: `Authorization: Bearer {token}`
- **预期结果**: 返回 `code: 200`，包含 `list`、`total`、`page` 字段
- **优先级**: P0

#### TC-011: 用户列表分页

- **用例编号**: TC-011
- **模块**: 用户管理
- **标题**: 用户列表支持分页参数
- **测试步骤**:
  1. 发送 GET `/api/users?page=1&pageSize=5`，header: `Authorization: Bearer {token}`
- **预期结果**: 返回 `code: 200`，`page` 为 1，`pageSize` 为 5
- **优先级**: P1

#### TC-012: 用户列表搜索

- **用例编号**: TC-012
- **模块**: 用户管理
- **标题**: 用户列表支持关键词搜索
- **测试步骤**:
  1. 发送 GET `/api/users?keyword=admin`，header: `Authorization: Bearer {token}`
- **预期结果**: 返回 `code: 200`，list 中所有用户 username/nickname/email 包含 "admin"
- **优先级**: P1

#### TC-013: 创建用户

- **用例编号**: TC-013
- **模块**: 用户管理
- **标题**: 创建新用户成功
- **测试步骤**:
  1. 发送 POST `/api/users`，header: `Authorization: Bearer {token}`
     body: `{"username":"testuser","password":"Test123456","nickname":"测试用户"}`
- **预期结果**: 返回 `code: 200`，message: "创建成功"，包含新建用户 `id`
- **优先级**: P0

#### TC-014: 创建重复用户名

- **用例编号**: TC-014
- **模块**: 用户管理
- **标题**: 创建已存在的用户名失败
- **测试步骤**:
  1. 发送 POST `/api/users`，header: `Authorization: Bearer {token}`
     body: `{"username":"admin","password":"Test123456"}`
- **预期结果**: 返回 `code: 400`，message: "用户名已存在"
- **优先级**: P0

#### TC-015: 更新用户

- **用例编号**: TC-015
- **模块**: 用户管理
- **标题**: 更新用户信息成功
- **测试步骤**:
  1. 先创建用户获取ID（TC-013）
  2. 发送 PUT `/api/users/{id}`，header: `Authorization: Bearer {token}`
     body: `{"nickname":"新昵称","email":"new@test.com"}`
- **预期结果**: 返回 `code: 200`，message: "更新成功"
- **优先级**: P0

#### TC-016: 更新用户密码

- **用例编号**: TC-016
- **模块**: 用户管理
- **标题**: 管理员可重置用户密码
- **测试步骤**:
  1. 发送 PUT `/api/users/{id}`，header: `Authorization: Bearer {token}`
     body: `{"password":"NewPass123"}`
- **预期结果**: 返回 `code: 200`，message: "更新成功"
- **优先级**: P1

#### TC-017: 删除用户

- **用例编号**: TC-017
- **模块**: 用户管理
- **标题**: 删除用户成功
- **测试步骤**:
  1. 先创建用户获取ID（TC-013）
  2. 发送 DELETE `/api/users/{id}`，header: `Authorization: Bearer {token}`
- **预期结果**: 返回 `code: 200`，message: "删除成功"
- **优先级**: P0

#### TC-018: 删除不存在用户

- **用例编号**: TC-018
- **模块**: 用户管理
- **标题**: 删除不存在的用户返回错误
- **测试步骤**:
  1. 发送 DELETE `/api/users/nonexistent-id`，header: `Authorization: Bearer {token}`
- **预期结果**: 返回 `code: 500` 或 Prisma 错误
- **优先级**: P1

### 3.3 权限控制

#### TC-020: 未登录访问受限接口

- **用例编号**: TC-020
- **模块**: 权限控制
- **标题**: 未携带Token访问用户列表被拒绝
- **测试步骤**:
  1. 发送 GET `/api/users`（不带 Authorization header）
- **预期结果**: 返回 `code: 401`，message: "未授权，请先登录"
- **优先级**: P0

#### TC-021: 无效Token

- **用例编号**: TC-021
- **模块**: 权限控制
- **标题**: 使用无效Token访问被拒绝
- **测试步骤**:
  1. 发送 GET `/api/users`，header: `Authorization: Bearer invalid_token_123`
- **预期结果**: 返回 `code: 401`，message: "token 已过期，请重新登录"
- **优先级**: P0

#### TC-022: 获取当前用户信息

- **用例编号**: TC-022
- **模块**: 权限控制
- **标题**: 已登录用户可获取自身信息
- **测试步骤**:
  1. 发送 GET `/api/auth/user`，header: `Authorization: Bearer {token}`
- **预期结果**: 返回 `code: 200`，包含用户完整信息
- **优先级**: P0

#### TC-023: 获取用户菜单权限

- **用例编号**: TC-023
- **模块**: 权限控制
- **标题**: 已登录用户可获取菜单权限树
- **测试步骤**:
  1. 发送 GET `/api/auth/userinfo`，header: `Authorization: Bearer {token}`
- **预期结果**: 返回 `code: 200`，包含 `permissions` 数组和 `menus` 树
- **优先级**: P0

### 3.4 接口功能测试

#### TC-030: 健康检查

- **用例编号**: TC-030
- **模块**: 接口测试
- **标题**: 健康检查接口正常
- **测试步骤**:
  1. 发送 GET `/api/health`
- **预期结果**: 返回 `status: 'ok'`，包含 `timestamp`
- **优先级**: P0

#### TC-031: 获取角色列表

- **用例编号**: TC-031
- **模块**: 接口测试
- **标题**: 已登录用户可获取角色列表
- **测试步骤**:
  1. 发送 GET `/api/roles`，header: `Authorization: Bearer {token}`
- **预期结果**: 返回 `code: 200`，包含 `list` 和 `total`
- **优先级**: P0

#### TC-032: 获取权限列表

- **用例编号**: TC-032
- **模块**: 接口测试
- **标题**: 已登录用户可获取权限列表
- **测试步骤**:
  1. 发送 GET `/api/permissions`，header: `Authorization: Bearer {token}`
- **预期结果**: 返回 `code: 200`，包含权限树形结构
- **优先级**: P0

#### TC-033: 文件列表接口

- **用例编号**: TC-033
- **模块**: 接口测试
- **标题**: 已登录用户可获取文件列表
- **测试步骤**:
  1. 发送 GET `/api/files`，header: `Authorization: Bearer {token}`
- **预期结果**: 返回 `code: 200`
- **优先级**: P0

#### TC-034: 媒体列表接口

- **用例编号**: TC-034
- **模块**: 接口测试
- **标题**: 已登录用户可获取媒体列表
- **测试步骤**:
  1. 发送 GET `/api/media`，header: `Authorization: Bearer {token}`
- **预期结果**: 返回 `code: 200`
- **优先级**: P0

#### TC-035: 仪表盘统计接口

- **用例编号**: TC-035
- **模块**: 接口测试
- **标题**: 已登录用户可获取仪表盘数据
- **测试步骤**:
  1. 发送 GET `/api/stats/dashboard`，header: `Authorization: Bearer {token}`
- **预期结果**: 返回 `code: 200`
- **优先级**: P0

## 4. 测试执行命令

### 4.1 curl 测试脚本

```bash
# 1. 登录获取token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 2. 使用token访问用户列表
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 3. 未登录访问（应返回401）
curl http://localhost:3000/api/users

# 4. 健康检查
curl http://localhost:3000/api/health

# 5. 获取用户信息
curl http://localhost:3000/api/auth/user \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 6. 创建用户
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"username":"testuser","password":"Test123456","nickname":"测试"}'

# 7. 登出
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 5. 测试进度跟踪

| 用例编号 | 用例名称           | 状态 | 测试结果 | 备注 |
| -------- | ------------------ | ---- | -------- | ---- |
| TC-001   | 正常登录           | 待测 |          |      |
| TC-002   | 密码错误           | 待测 |          |      |
| TC-003   | 用户名不存在       | 待测 |          |      |
| TC-004   | 空用户名           | 待测 |          |      |
| TC-005   | 空密码             | 待测 |          |      |
| TC-006   | 登出               | 待测 |          |      |
| TC-010   | 获取用户列表       | 待测 |          |      |
| TC-011   | 用户列表分页       | 待测 |          |      |
| TC-012   | 用户列表搜索       | 待测 |          |      |
| TC-013   | 创建用户           | 待测 |          |      |
| TC-014   | 创建重复用户名     | 待测 |          |      |
| TC-015   | 更新用户           | 待测 |          |      |
| TC-016   | 更新用户密码       | 待测 |          |      |
| TC-017   | 删除用户           | 待测 |          |      |
| TC-018   | 删除不存在用户     | 待测 |          |      |
| TC-020   | 未登录访问受限接口 | 待测 |          |      |
| TC-021   | 无效Token          | 待测 |          |      |
| TC-022   | 获取当前用户信息   | 待测 |          |      |
| TC-023   | 获取用户菜单权限   | 待测 |          |      |
| TC-030   | 健康检查           | 待测 |          |      |
| TC-031   | 获取角色列表       | 待测 |          |      |
| TC-032   | 获取权限列表       | 待测 |          |      |
| TC-033   | 文件列表接口       | 待测 |          |      |
| TC-034   | 媒体列表接口       | 待测 |          |      |
| TC-035   | 仪表盘统计接口     | 待测 |          |      |

## 6. 测试风险

| 风险项           | 影响                   | 应对措施                            |
| ---------------- | ---------------------- | ----------------------------------- |
| 数据库未初始化   | 无法登录测试           | 先执行 `npm run db:seed` 初始化数据 |
| 端口被占用       | 服务无法启动           | 检查 3000 端口，释放或改配置        |
| JWT secret硬编码 | 安全风险（上线前需改） | 记录，后续建议改为环境变量          |
