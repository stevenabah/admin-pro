import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

// 获取仪表盘数据
router.get('/dashboard', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [userCount, roleCount, fileCount, mediaCount, dataCount] = await Promise.all([
      prisma.user.count(),
      prisma.role.count(),
      prisma.file.count(),
      prisma.media.count(),
      prisma.dataRecord.count()
    ])

    res.json({
      code: 200,
      data: {
        userCount,
        roleCount,
        fileCount,
        mediaCount,
        dataCount,
        recentUsers: await prisma.user.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, username: true, nickname: true, createdAt: true }
        }),
        recentFiles: await prisma.file.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' }
        })
      }
    })
  } catch (error) {
    console.error('Get dashboard error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 获取图表数据
router.get('/chart-data', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // 模拟近7天的数据
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      days.push(date.toISOString().split('T')[0])
    }

    // 模拟访问量数据
    const visitData = days.map(() => Math.floor(Math.random() * 500) + 100)

    // 分类统计数据
    const categoryData = await prisma.dataRecord.groupBy({
      by: ['category'],
      _count: true
    })

    res.json({
      code: 200,
      data: {
        visitChart: {
          xAxis: days,
          series: visitData
        },
        categoryChart: categoryData.map(c => ({
          name: c.category || '未分类',
          value: c._count
        }))
      }
    })
  } catch (error) {
    console.error('Get chart data error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

export default router