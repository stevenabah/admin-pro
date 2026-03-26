import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

// 获取媒体列表
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { page = 1, pageSize = 20, type = '' } = req.query

    const where = type ? { type: type as string } : {}

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.media.count({ where })
    ])

    res.json({
      code: 200,
      data: {
        list: media,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    })
  } catch (error) {
    console.error('Get media error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 添加媒体
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, type, url, duration, cover, status = 1 } = req.body

    const media = await prisma.media.create({
      data: { title, type, url, duration, cover, status }
    })

    res.json({ code: 200, message: '添加成功', data: { id: media.id } })
  } catch (error) {
    console.error('Create media error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 更新媒体
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { title, type, url, duration, cover, status } = req.body

    await prisma.media.update({
      where: { id },
      data: { title, type, url, duration, cover, status }
    })

    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('Update media error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 删除媒体
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    await prisma.media.delete({ where: { id } })
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('Delete media error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

export default router