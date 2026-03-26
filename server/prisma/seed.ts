import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 创建权限
  const permissions = [
    { id: '1', name: '首页', code: 'dashboard', type: 'menu', path: '/dashboard', icon: 'HomeFilled', component: 'views/Dashboard.vue', sort: 1 },
    { id: '2', name: '用户管理', code: 'userManage', type: 'menu', path: '/user', icon: 'User', component: 'views/User.vue', sort: 2 },
    { id: '3', name: '角色管理', code: 'roleManage', type: 'menu', path: '/role', icon: 'UserFilled', component: 'views/Role.vue', sort: 3 },
    { id: '4', name: '权限管理', code: 'permissionManage', type: 'menu', path: '/permission', icon: 'Lock', component: 'views/Permission.vue', sort: 4 },
    { id: '5', name: '文件管理', code: 'fileManage', type: 'menu', path: '/file', icon: 'Folder', component: 'views/File.vue', sort: 5 },
    { id: '6', name: '音视频', code: 'mediaManage', type: 'menu', path: '/media', icon: 'VideoCamera', component: 'views/Media.vue', sort: 6 },
    { id: '7', name: '表格编辑', code: 'dataManage', type: 'menu', path: '/data', icon: 'List', component: 'views/Data.vue', sort: 7 },
  ]

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { id: p.id },
      update: p,
      create: p
    })
  }

  // 创建角色
  const adminRole = await prisma.role.upsert({
    where: { code: 'admin' },
    update: {},
    create: {
      id: 'role-1',
      name: '超级管理员',
      code: 'admin',
      description: '拥有所有权限'
    }
  })

  const userRole = await prisma.role.upsert({
    where: { code: 'user' },
    update: {},
    create: {
      id: 'role-2',
      name: '普通用户',
      code: 'user',
      description: '普通用户权限'
    }
  })

  // 给角色分配权限
  await prisma.role.update({
    where: { id: adminRole.id },
    data: { permissions: { connect: permissions.map(p => ({ id: p.id })) } }
  })

  // 创建管理员用户
  const hashedPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      nickname: '管理员',
      email: 'admin@example.com',
      roleId: adminRole.id,
      status: 1
    }
  })

  // 创建测试数据
  const categories = ['产品', '订单', '库存', '财务', '客户']
  for (let i = 1; i <= 20; i++) {
    await prisma.dataRecord.create({
      data: {
        title: `数据记录 ${i}`,
        content: `这是第 ${i} 条数据记录的内容`,
        category: categories[i % 5],
        amount: Math.floor(Math.random() * 10000) / 100,
        status: 1
      }
    })
  }

  // 创建测试媒体 - SQLite 不支持 createMany，用单独创建
  const existingMedia = await prisma.media.findFirst()
  if (!existingMedia) {
    await prisma.media.create({
      data: { title: '示例视频1', type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: 600, status: 1 }
    })
    await prisma.media.create({
      data: { title: '示例音频1', type: 'audio', url: 'https://www.w3schools.com/html/horse.mp3', duration: 30, status: 1 }
    })
  }

  console.log('Seeding completed!')
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())