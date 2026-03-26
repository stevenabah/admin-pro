# 通用后台管理系统 - 项目规范文档

## 1. 项目概述

- **项目名称**: Admin-Pro 后台管理系统
- **项目类型**: 全栈 Web 应用
- **项目描述**: 一个功能完善的通用后台管理系统，包含 RBAC 权限管理、文件管理、音视频播放、数据表格编辑和首页可视化大屏
- **目标用户**: 企业内部管理系统管理员和普通用户

## 2. 技术栈

### 前端
- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **状态管理**: Pinia
- **UI 组件库**: Element Plus
- **图表库**: ECharts
- **构建工具**: Vite
- **路由**: Vue Router 4

### 后端
- **运行环境**: Node.js
- **框架**: Express + TypeScript
- **数据库**: SQLite (轻量级，无需额外安装)
- **ORM**: Prisma
- **文件存储**: 本地存储
- **认证**: JWT

## 3. 功能模块

### 3.1 认证与权限 (RBAC)
- 用户登录/登出
- 角色管理 (超级管理员、普通用户)
- 权限管理 (菜单权限、按钮权限)
- 路由守卫

### 3.2 文件管理
- 文件上传 (图片、文档等)
- 文件下载
- 文件列表展示
- 文件预览

### 3.3 音视频播放
- 视频播放 (支持 MP4、WebM)
- 音频播放 (支持 MP3、WAV)
- 播放列表管理
- 播放控制 (播放/暂停、进度条、音量)

### 3.4 表格编辑
- 数据展示
- 行内编辑
- 新增/删除行
- 分页功能
- 搜索筛选

### 3.5 首页大屏可视化
- 数据统计卡片
- 折线图/柱状图
- 饼图
- 实时数据模拟

## 4. 项目结构

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
│   │   ├── views/         # 页面组件
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── server/                 # 后端项目
│   ├── src/
│   │   ├── controllers/   # 控制器
│   │   ├── middleware/     # 中间件
│   │   ├── routes/        # 路由
│   │   ├── services/       # 服务层
│   │   ├── utils/         # 工具函数
│   │   └── index.ts       # 入口文件
│   ├── prisma/
│   │   └── schema.prisma  # 数据库模型
│   └── package.json
│
└── package.json           # 根目录配置
```

## 5. 数据库设计

### 用户表 (User)
- id, username, password, roleId, status, createdAt, updatedAt

### 角色表 (Role)
- id, name, code, description, createdAt

### 权限表 (Permission)
- id, name, code, type, parentId, path, createdAt

### 文件表 (File)
- id, filename, originalName, mimeType, size, path, createdAt

### 媒体表 (Media)
- id, title, type, url, duration, createdAt

## 6. API 接口设计

### 认证
- POST /api/auth/login - 登录
- POST /api/auth/logout - 登出
- GET /api/auth/user - 获取当前用户信息

### 用户管理
- GET /api/users - 用户列表
- POST /api/users - 创建用户
- PUT /api/users/:id - 更新用户
- DELETE /api/users/:id - 删除用户

### 角色权限
- GET /api/roles - 角色列表
- POST /api/roles - 创建角色
- PUT /api/roles/:id - 更新角色
- DELETE /api/roles/:id - 删除角色
- GET /api/permissions - 权限列表

### 文件管理
- GET /api/files - 文件列表
- POST /api/files/upload - 上传文件
- GET /api/files/:id/download - 下载文件
- DELETE /api/files/:id - 删除文件

### 媒体管理
- GET /api/media - 媒体列表
- POST /api/media - 添加媒体
- DELETE /api/media/:id - 删除媒体

### 数据统计
- GET /api/stats/dashboard - 首页统计数据
- GET /api/stats/chart-data - 图表数据

## 7. 验收标准

- [ ] 项目可以正常启动，前端访问 http://localhost:5173
- [ ] 后端服务运行在 http://localhost:3000
- [ ] 用户可以登录系统 (默认账号: admin/admin123)
- [ ] RBAC 权限功能正常工作
- [ ] 文件上传下载功能正常
- [ ] 音视频播放功能正常
- [ ] 表格编辑功能正常
- [ ] 首页大屏可视化正常展示