import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

// 时间范围类型
type TimeRange = 'week' | 'month' | 'quarter' | 'custom'

// 获取时间范围日期
function getTimeRangeDate(range: TimeRange, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  switch (range) {
    case 'week': {
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      start.setHours(0, 0, 0, 0)
      return { start, end }
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start, end }
    }
    case 'quarter': {
      const quarter = Math.floor(now.getMonth() / 3)
      const start = new Date(now.getFullYear(), quarter * 3, 1)
      return { start, end }
    }
    case 'custom': {
      if (customStart && customEnd) {
        return { start: new Date(customStart), end: new Date(customEnd) }
      }
      return { start: new Date(0), end: end }
    }
    default:
      return { start: new Date(0), end: end }
  }
}

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

// ==================== 任务统计 API ====================

// 聚合统计报表API - 返回前端所需的完整数据格式
router.get('/report', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { range = 'month' } = req.query as any
    const timeRange = getTimeRangeDate(range)

    const now = new Date()

    // 1. 关键指标
    const totalTasks = await prisma.task.count({
      where: { createdAt: { gte: timeRange.start, lte: timeRange.end } }
    })
    const completedTasks = await prisma.task.count({
      where: { status: 'COMPLETED', createdAt: { gte: timeRange.start, lte: timeRange.end } }
    })
    const overdueTasks = await prisma.task.count({
      where: {
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { lt: now },
        createdAt: { gte: timeRange.start, lte: timeRange.end }
      }
    })

    // 计算平均处理时长
    const completedWithDuration = await prisma.task.findMany({
      where: { status: 'COMPLETED', createdAt: { gte: timeRange.start, lte: timeRange.end } },
      select: { createdAt: true, updatedAt: true }
    })
    const avgDuration = completedWithDuration.length > 0
      ? Math.round(completedWithDuration.reduce((sum, t) =>
          sum + (t.updatedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60 * 24), 0
        ) / completedWithDuration.length * 10) / 10
      : 0

    const metrics = {
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      avgProcessingDays: avgDuration,
      overdueTasks,
      overdueRate: totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0,
    }

    // 2. 效率趋势（近30天每日完成数）
    const trendStart = new Date(now)
    trendStart.setDate(now.getDate() - 30)
    const completedByDate: Record<string, number> = {}
    const recentCompleted = await prisma.task.findMany({
      where: { status: 'COMPLETED', updatedAt: { gte: trendStart } },
      select: { updatedAt: true }
    })
    recentCompleted.forEach(t => {
      const key = t.updatedAt.toISOString().split('T')[0]
      completedByDate[key] = (completedByDate[key] || 0) + 1
    })
    const efficiencyTrend = Object.entries(completedByDate).map(([date, count]) => ({ date, count }))

    // 3. 人员负载分布
    const usersWithTasks = await prisma.user.findMany({
      include: {
        assignedTasks: {
          where: { createdAt: { gte: timeRange.start, lte: timeRange.end } },
          select: { status: true }
        }
      }
    })
    const workloadDistribution = usersWithTasks.map(u => ({
      userId: u.id,
      name: u.nickname || u.username,
      inProgress: u.assignedTasks.filter(t => ['IN_PROGRESS', 'REVIEW'].includes(t.status)).length,
      completed: u.assignedTasks.filter(t => t.status === 'COMPLETED').length,
      total: u.assignedTasks.length
    }))

    // 4. 优先级分布
    const byPriority = await prisma.task.groupBy({
      by: ['priority'],
      where: { createdAt: { gte: timeRange.start, lte: timeRange.end } },
      _count: true
    })
    const priorityDistribution = byPriority.map(p => ({
      name: p.priority,
      value: p._count
    }))

    // 5. 状态分布
    const byStatus = await prisma.task.groupBy({
      by: ['status'],
      where: { createdAt: { gte: timeRange.start, lte: timeRange.end } },
      _count: true
    })
    const statusDistribution = byStatus.map(s => ({
      name: s.status,
      value: s._count
    }))

    // 6. 类型分布（留空，未来扩展）
    const categoryDistribution: Array<{name: string, value: number}> = []

    res.json({
      code: 200,
      data: { metrics, charts: { efficiencyTrend, workloadDistribution, priorityDistribution, statusDistribution, categoryDistribution } }
    })
  } catch (error) {
    console.error('Get stats report error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 工时统计API - 返回每人任务负载分布
router.get(
  '/workload',
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { range = 'month', startDate, endDate, assigneeId } = req.query as any

      const timeRange = getTimeRangeDate(range, startDate, endDate)

      // 构建基础查询条件
      const baseWhere: any = {
        createdAt: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      }
      if (assigneeId) {
        baseWhere.assigneeId = assigneeId
      }

      // 获取所有有任务的用户
      const usersWithTasks = await prisma.user.findMany({
        where: {
          OR: [
            { assignedTasks: { some: baseWhere } },
            { createdTasks: { some: baseWhere } },
          ],
        },
        include: {
          assignedTasks: {
            where: baseWhere,
            select: { id: true, status: true, dueDate: true },
          },
        },
      })

      const now = new Date()

      // 统计每个用户的任务负载
      const workloadData = await Promise.all(
        usersWithTasks.map(async (user) => {
          const tasks = user.assignedTasks

          // 进行中任务（IN_PROGRESS, REVIEW）
          const inProgressCount = tasks.filter(t =>
            ['IN_PROGRESS', 'REVIEW'].includes(t.status)
          ).length

          // 已完成任务
          const completedCount = tasks.filter(t =>
            t.status === 'COMPLETED'
          ).length

          // 逾期任务（未完成且已过期）
          const overdueCount = tasks.filter(t =>
            !['COMPLETED', 'CANCELLED'].includes(t.status) &&
            t.dueDate &&
            new Date(t.dueDate) < now
          ).length

          return {
            userId: user.id,
            username: user.username,
            nickname: user.nickname || user.username,
            inProgressCount,
            completedCount,
            overdueCount,
            totalLoad: tasks.length,
          }
        }),
      )

      // 按总负载排序
      workloadData.sort((a, b) => b.totalLoad - a.totalLoad)

      // 汇总统计
      const summary = {
        totalInProgress: workloadData.reduce((sum, u) => sum + u.inProgressCount, 0),
        totalCompleted: workloadData.reduce((sum, u) => sum + u.completedCount, 0),
        totalOverdue: workloadData.reduce((sum, u) => sum + u.overdueCount, 0),
      }

      res.json({
        code: 200,
        data: {
          range,
          startDate: timeRange.start.toISOString(),
          endDate: timeRange.end.toISOString(),
          summary,
          users: workloadData,
        },
      })
    } catch (error) {
      console.error('Get workload stats error:', error)
      res.json({ code: 500, message: '服务器错误' })
    }
  },
)

// 团队效能API - 返回团队完成任务趋势
router.get(
  '/team-efficiency',
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { days = '30' } = req.query
      const dayCount = Math.min(Math.max(parseInt(days as string) || 30, 7), 90)

      const now = new Date()
      const startDate = new Date(now)
      startDate.setDate(now.getDate() - dayCount + 1)
      startDate.setHours(0, 0, 0, 0)

      // 生成日期数组
      const dateArray: string[] = []
      for (let i = 0; i < dayCount; i++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + i)
        dateArray.push(date.toISOString().split('T')[0])
      }

      // 查询这段时间内完成的任务（按完成日期分组）
      const completedTasks = await prisma.task.findMany({
        where: {
          status: 'COMPLETED',
          updatedAt: {
            gte: startDate,
            lte: now,
          },
        },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          assigneeId: true,
        },
      })

      // 按日期统计完成数
      const completedByDate: Record<string, number> = {}
      completedTasks.forEach(task => {
        const dateKey = task.updatedAt.toISOString().split('T')[0]
        completedByDate[dateKey] = (completedByDate[dateKey] || 0) + 1
      })

      // 构建每日完成趋势数据
      const dailyCompleted = dateArray.map(date => ({
        date,
        count: completedByDate[date] || 0,
      }))

      // 计算近7天和近30天的完成数
      const last7Days = dailyCompleted.slice(-7)
      const last30Days = dailyCompleted

      const avgCompletedPerDay7 = last7Days.length > 0
        ? Math.round(last7Days.reduce((sum, d) => sum + d.count, 0) / 7 * 10) / 10
        : 0

      const avgCompletedPerDay30 = dayCount > 0
        ? Math.round(dailyCompleted.reduce((sum, d) => sum + d.count, 0) / dayCount * 10) / 10
        : 0

      // 计算平均任务完成时长（从创建到完成的平均天数）
      const completedWithDuration = completedTasks.filter(t =>
        t.updatedAt.getTime() - t.createdAt.getTime() > 0
      )

      const avgCompletionTimeMs = completedWithDuration.length > 0
        ? completedWithDuration.reduce((sum, t) =>
            sum + (t.updatedAt.getTime() - t.createdAt.getTime()), 0
          ) / completedWithDuration.length
        : 0

      const avgCompletionDays = Math.round(avgCompletionTimeMs / (1000 * 60 * 60 * 24) * 10) / 10

      // 计算任务完成率
      const totalTasks = await prisma.task.count({
        where: {
          createdAt: { gte: startDate },
        },
      })

      const completedTasksCount = completedTasks.length
      const completionRate = totalTasks > 0
        ? Math.round((completedTasksCount / totalTasks) * 100)
        : 0

      // 按人员统计完成数
      const completedByUser: Record<string, number> = {}
      completedTasks.forEach(task => {
        if (task.assigneeId) {
          completedByUser[task.assigneeId] = (completedByUser[task.assigneeId] || 0) + 1
        }
      })

      const topPerformers = await Promise.all(
        Object.entries(completedByUser)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(async ([userId, count]) => {
            const user = await prisma.user.findUnique({
              where: { id: userId },
              select: { id: true, username: true, nickname: true },
            })
            return {
              userId,
              nickname: user?.nickname || user?.username || '未知',
              completedCount: count,
            }
          }),
      )

      res.json({
        code: 200,
        data: {
          period: dayCount,
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          trend: dailyCompleted,
          summary: {
            totalCompleted: completedTasksCount,
            totalTasks,
            completionRate,
            avgCompletionDays,
            avgCompletedPerDay7,
            avgCompletedPerDay30,
          },
          topPerformers,
        },
      })
    } catch (error) {
      console.error('Get team efficiency error:', error)
      res.json({ code: 500, message: '服务器错误' })
    }
  },
)

// 甘特图数据API - 返回任务时间线数据
router.get(
  '/gantt',
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { projectId, startDate, endDate, assigneeId } = req.query

      // 构建查询条件
      const where: any = {}

      if (startDate) {
        where.createdAt = { gte: new Date(startDate as string) }
      }
      if (endDate) {
        where.updatedAt = { ...where.updatedAt, lte: new Date(endDate as string) }
      }
      if (assigneeId) {
        where.assigneeId = assigneeId
      }

      const tasks = await prisma.task.findMany({
        where,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,
          assigneeId: true,
          assignee: {
            select: { id: true, username: true, nickname: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      })

      // 计算进度（基于状态）
      const calculateProgress = (status: string): number => {
        switch (status) {
          case 'PENDING': return 0
          case 'IN_PROGRESS': return 50
          case 'REVIEW': return 80
          case 'COMPLETED': return 100
          case 'CANCELLED': return 0
          default: return 0
        }
      }

      // 映射为甘特图数据格式
      const ganttData = tasks.map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        startDate: task.createdAt.toISOString().split('T')[0],
        endDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : task.updatedAt.toISOString().split('T')[0],
        progress: calculateProgress(task.status),
        assignee: task.assignee ? {
          id: task.assignee.id,
          name: task.assignee.nickname || task.assignee.username,
        } : null,
      }))

      // 按人员分组
      const tasksByAssignee: Record<string, typeof ganttData> = {}
      ganttData.forEach(task => {
        const key = task.assignee?.id || 'unassigned'
        if (!tasksByAssignee[key]) {
          tasksByAssignee[key] = []
        }
        tasksByAssignee[key].push(task)
      })

      res.json({
        code: 200,
        data: {
          tasks: ganttData,
          tasksByAssignee,
          total: ganttData.length,
        },
      })
    } catch (error) {
      console.error('Get gantt data error:', error)
      res.json({ code: 500, message: '服务器错误' })
    }
  },
)

// 人员绩效API - 统计每个人创建/完成任务及绩效指标
router.get(
  '/performance',
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate } = req.query

      // 构建时间范围
      const where: any = {}
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) {
          where.createdAt.gte = new Date(startDate as string)
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate as string)
        }
      }

      const now = new Date()

      // 获取所有用户
      const users = await prisma.user.findMany({
        include: {
          createdTasks: {
            where,
            select: {
              id: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              dueDate: true,
            },
          },
          assignedTasks: {
            where,
            select: {
              id: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              dueDate: true,
            },
          },
        },
      })

      // 统计每个人员的绩效
      const performanceData = users.map(user => {
        const createdTasks = user.createdTasks
        const assignedTasks = user.assignedTasks

        // 创建的任务数
        const createdCount = createdTasks.length

        // 完成任务数（作为创建者）
        const completedAsCreator = createdTasks.filter(t => t.status === 'COMPLETED').length

        // 完成任务数（作为负责人）
        const completedAsAssignee = assignedTasks.filter(t => t.status === 'COMPLETED').length

        // 总完成数
        const totalCompleted = completedAsCreator + completedAsAssignee

        // 任务完成率
        const completionRate = createdCount > 0
          ? Math.round((completedAsCreator / createdCount) * 100)
          : 0

        // 逾期任务数（作为负责人）
        const overdueCount = assignedTasks.filter(t =>
          !['COMPLETED', 'CANCELLED'].includes(t.status) &&
          t.dueDate &&
          new Date(t.dueDate) < now
        ).length

        // 计算平均处理时长（天）
        const completedTasks = createdTasks.filter(t =>
          t.status === 'COMPLETED' &&
          t.updatedAt.getTime() - t.createdAt.getTime() > 0
        )

        const avgProcessingDays = completedTasks.length > 0
          ? Math.round(
              completedTasks.reduce((sum, t) =>
                sum + (t.updatedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60 * 24)
              , 0) / completedTasks.length * 10
            ) / 10
          : 0

        return {
          userId: user.id,
          username: user.username,
          nickname: user.nickname || user.username,
          avatar: user.avatar,
          createdCount,
          completedAsCreator,
          completedAsAssignee,
          totalCompleted,
          completionRate,
          overdueCount,
          avgProcessingDays,
        }
      })

      // 按完成任务数排序
      performanceData.sort((a, b) => b.totalCompleted - a.totalCompleted)

      // 团队汇总
      const summary = {
        totalUsers: users.length,
        totalCreated: performanceData.reduce((sum, u) => sum + u.createdCount, 0),
        totalCompleted: performanceData.reduce((sum, u) => sum + u.totalCompleted, 0),
        totalOverdue: performanceData.reduce((sum, u) => sum + u.overdueCount, 0),
        avgCompletionRate: performanceData.length > 0
          ? Math.round(performanceData.reduce((sum, u) => sum + u.completionRate, 0) / performanceData.length)
          : 0,
      }

      res.json({
        code: 200,
        data: {
          summary,
          users: performanceData,
        },
      })
    } catch (error) {
      console.error('Get performance stats error:', error)
      res.json({ code: 500, message: '服务器错误' })
    }
  },
)

export default router