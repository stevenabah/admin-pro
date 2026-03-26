import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

// 获取角色列表
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: { permissions: true, _count: { select: { users: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ code: 200, data: roles })
  } catch (error) {
    console.error('Get roles error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 创建角色
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, code, description, permissionIds = [], status = 1 } = req.body

    const existing = await prisma.role.findUnique({ where: { code } })
    if (existing) {
      return res.json({ code: 400, message: '角色编码已存在' })
    }

    const role = await prisma.role.create({
      data: {
        name,
        code,
        description,
        status,
        permissions: {
          connect: permissionIds.map((id: string) => ({ id }))
        }
      }
    })

    res.json({ code: 200, message: '创建成功', data: { id: role.id } })
  } catch (error) {
    console.error('Create role error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 更新角色
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { name, description, permissionIds, status } = req.body

    const data: any = { name, description, status }
    if (permissionIds) {
      data.permissions = {
        set: permissionIds.map((id: string) => ({ id }))
      }
    }

    await prisma.role.update({
      where: { id },
      data
    })

    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('Update role error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 删除角色
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    await prisma.role.delete({ where: { id } })
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('Delete role error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

export default router