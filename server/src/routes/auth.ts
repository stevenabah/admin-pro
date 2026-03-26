import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.json({ code: 400, message: '用户名和密码不能为空' })
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: true }
    })

    if (!user) {
      return res.json({ code: 401, message: '用户名或密码错误' })
    }

    if (user.status === 0) {
      return res.json({ code: 403, message: '账号已被禁用' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.json({ code: 401, message: '用户名或密码错误' })
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      roleId: user.roleId || ''
    })

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role
        }
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 获取当前用户信息
router.get('/user', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { role: { include: { permissions: true } } }
    })

    if (!user) {
      return res.json({ code: 404, message: '用户不存在' })
    }

    res.json({
      code: 200,
      data: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role
      }
    })
  } catch (error) {
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 登出
router.post('/logout', (req, res) => {
  res.json({ code: 200, message: '登出成功' })
})

export default router