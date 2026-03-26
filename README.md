# Admin-Pro 通用后台管理系统

前后端分离的通用后台管理系统，基于 Vue3 + Node.js 技术栈开发。

## 技术栈

### 前端

- **Vue 3** - Composition API
- **TypeScript** - 类型安全
- **Pinia** - 状态管理
- **Element Plus** - UI 组件库
- **ECharts** - 数据可视化
- **Vite** - 构建工具
- **Vue Router** - 路由管理

### 后端

- **Express** - Node.js Web 框架
- **TypeScript** - 类型安全
- **Prisma** - ORM 数据库访问
- **SQLite** - 轻量级数据库
- **JWT** - 用户认证
- **Multer** - 文件上传

## 功能模块

| 模块         | 功能                                       |
| ------------ | ------------------------------------------ |
| **首页大屏** | 数据统计卡片、折线图、饼图、ECharts 可视化 |
| **RBAC**     | 用户管理、角色管理、权限管理、路由守卫     |
| **文件管理** | 文件上传、下载、预览、图片/文档预览        |
| **音视频**   | 视频播放、音频播放、播放控制               |
| **表格编辑** | 行内编辑、新增/删除、分页、搜索、状态切换  |

## 项目结构

```
admin-pro/
├── client/                 # 前端项目
│   ├── src/
│   │   ├── api/           # API 接口
│   │   ├── assets/        # 静态资源
│   │   ├── components/    # 公共组件
│   │   ├── layouts/       # 布局组件
│   │   ├── router/        # 路由配置
│   │   ├── stores/        # Pinia 状态管理
│   │   └── views/         # 页面组件
│   └── package.json
│
├── server/                 # 后端项目
│   ├── src/
│   │   ├── controllers/   # 控制器
│   │   ├── middleware/     # 中间件
│   │   ├── routes/        # 路由
│   │   ├── services/       # 服务层
│   │   └── lib/           # 工具库
│   ├── prisma/
│   │   └── schema.prisma  # 数据库模型
│   └── package.json
│
└── package.json           # 根目录 workspaces 配置
```

## 快速开始

### 安装依赖

```bash
# 安装根目录依赖（自动包含 client 和 server）
npm install

# 或分别安装
npm install -w client
npm install -w server
```

### 初始化数据库

```bash
cd server
npx prisma generate
npx prisma db push
npm run db:seed
```

### 启动开发

```bash
# 同时启动前端和后端
npm run dev

# 单独启动
npm run dev:server  # 后端 http://localhost:3000
npm run dev:client  # 前端 http://localhost:5173
```

### 默认账号

- 用户名：`admin`
- 密码：`admin123`

## 项目亮点

### 1. 现代化的前端架构

- **Composition API** + **Script Setup** 语法，代码简洁易懂
- **Pinia** 状态管理，告别 Vuex 的繁琐
- **TypeScript** 全类型支持，类型安全有保障
- **Vite** 极速热更新，开发体验丝滑

### 2. 完整的 RBAC 权限体系

- 用户-角色-权限三级关联
- 动态路由权限控制
- 菜单级别权限管理
- 按钮级别权限控制

### 3. 丰富的数据可视化

- ECharts 集成折线图、柱状图、饼图
- 首页仪表盘数据统计
- 实时模拟数据更新

### 4. 完整的功能模块

- 表格行内编辑，所见即所得
- 文件上传下载，支持预览
- 音视频播放，支持多种格式

### 5. 后端工程化

- TypeScript 类型安全
- Prisma ORM 数据访问，代码简洁
- JWT Token 认证
- RESTful API 设计规范

## 项目难点

### 1. 前端架构设计

- 使用 Composition API 组织代码逻辑
- Pinia 状态管理与路由守卫结合实现权限控制
- ECharts 响应式图表与数据联动

### 2. 后端权限设计

- RBAC 权限模型设计，角色与权限的多对多关系
- JWT Token 生成与验证中间件
- 统一 API 响应格式封装

### 3. 数据可视化集成

- vue-echarts 组件封装
- 图表数据动态更新
- 响应式布局适配

### 4. 文件上传与预览

- Multer 中间件处理 multipart/form-data
- 文件存储与数据库记录关联
- 图片/文档类型区分与预览

## API 接口

| 模块 | 接口                                                    |
| ---- | ------------------------------------------------------- |
| 认证 | `/api/auth/login`, `/api/auth/user`, `/api/auth/logout` |
| 用户 | `/api/users` (GET/POST/PUT/DELETE)                      |
| 角色 | `/api/roles` (GET/POST/PUT/DELETE)                      |
| 权限 | `/api/permissions` (GET/POST/PUT/DELETE)                |
| 文件 | `/api/files/upload`, `/api/files/:id/download`          |
| 媒体 | `/api/media` (GET/POST/PUT/DELETE)                      |
| 数据 | `/api/data` (GET/POST/PUT/DELETE)                       |
| 统计 | `/api/stats/dashboard`, `/api/stats/chart-data`         |

## 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

## License

MIT
