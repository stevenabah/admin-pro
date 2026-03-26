import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

// 获取数据列表
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', category = '' } = req.query

    const where: any = {}
    if (keyword) {
      where.OR = [
        { title: { contains: keyword as string } },
        { content: { contains: keyword as string } }
      ]
    }
    if (category) {
      where.category = category as string
    }

    const [data, total] = await Promise.all([
      prisma.dataRecord.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.dataRecord.count({ where })
    ])

    res.json({
      code: 200,
      data: {
        list: data,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    })
  } catch (error) {
    console.error('Get data error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 创建数据
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, content, category, amount, status = 1 } = req.body

    const record = await prisma.dataRecord.create({
      data: { title, content, category, amount, status }
    })

    res.json({ code: 200, message: '创建成功', data: { id: record.id } })
  } catch (error) {
    console.error('Create data error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 更新数据
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { title, content, category, amount, status } = req.body

    await prisma.dataRecord.update({
      where: { id },
      data: { title, content, category, amount, status }
    })

    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('Update data error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 删除数据
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    await prisma.dataRecord.delete({ where: { id } })
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('Delete data error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 批量删除
router.post('/batch-delete', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { ids } = req.body
    await prisma.dataRecord.deleteMany({
      where: { id: { in: ids } }
    })
    res.json({ code: 200, message: '批量删除成功' })
  } catch (error) {
    console.error('Batch delete error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

export default router