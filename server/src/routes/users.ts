import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

// 获取用户列表
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { page = 1, pageSize = 10, keyword = '' } = req.query

    const where = keyword
      ? {
          OR: [
            { username: { contains: keyword as string } },
            { nickname: { contains: keyword as string } },
            { email: { contains: keyword as string } }
          ]
        }
      : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        include: { role: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ])

    res.json({
      code: 200,
      data: {
        list: users.map(u => ({
          id: u.id,
          username: u.username,
          nickname: u.nickname,
          email: u.email,
          phone: u.phone,
          avatar: u.avatar,
          status: u.status,
          role: u.role,
          createdAt: u.createdAt
        })),
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    })
  } catch (error) {
    console.error('Get users error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 创建用户
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { username, password, nickname, email, phone, roleId, status = 1 } = req.body

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return res.json({ code: 400, message: '用户名已存在' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        nickname,
        email,
        phone,
        roleId,
        status
      }
    })

    res.json({ code: 200, message: '创建成功', data: { id: user.id } })
  } catch (error) {
    console.error('Create user error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 更新用户
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { nickname, email, phone, roleId, status, password } = req.body

    const data: any = { nickname, email, phone, roleId, status }
    if (password) {
      data.password = await bcrypt.hash(password, 10)
    }

    await prisma.user.update({
      where: { id },
      data
    })

    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('Update user error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 删除用户
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    await prisma.user.delete({ where: { id } })
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('Delete user error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

export default router