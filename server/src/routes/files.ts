import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// 获取文件列表
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '' } = req.query

    const where = keyword
      ? {
          OR: [
            { filename: { contains: keyword as string } },
            { originalName: { contains: keyword as string } }
          ]
        }
      : {}

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.file.count({ where })
    ])

    res.json({
      code: 200,
      data: {
        list: files,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    })
  } catch (error) {
    console.error('Get files error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 上传文件
router.post('/upload', authMiddleware, async (req: AuthRequest, res) => {
  try {
    // 使用 multer 处理文件上传
    const multer = await import('multer')
    const upload = multer.default({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, UPLOAD_DIR)
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname)
          cb(null, `${uuidv4()}${ext}`)
        }
      }),
      limits: { fileSize: 50 * 1024 * 1024 } // 50MB
    })

    upload.single('file')(req, res, async (err: any) => {
      if (err) {
        return res.json({ code: 400, message: '上传失败: ' + err.message })
      }

      const file = (req as any).file
      if (!file) {
        return res.json({ code: 400, message: '请选择文件' })
      }

      const fileRecord = await prisma.file.create({
        data: {
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path,
          url: `/uploads/${file.filename}`
        }
      })

      res.json({
        code: 200,
        message: '上传成功',
        data: fileRecord
      })
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 下载文件
router.get('/:id/download', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const file = await prisma.file.findUnique({ where: { id } })

    if (!file) {
      return res.status(404).json({ code: 404, message: '文件不存在' })
    }

    res.download(file.path, file.originalName)
  } catch (error) {
    console.error('Download error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 预览文件
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const file = await prisma.file.findUnique({ where: { id } })

    if (!file) {
      return res.status(404).json({ code: 404, message: '文件不存在' })
    }

    res.json({ code: 200, data: file })
  } catch (error) {
    console.error('Get file error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

// 删除文件
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const file = await prisma.file.findUnique({ where: { id } })

    if (!file) {
      return res.json({ code: 404, message: '文件不存在' })
    }

    // 删除物理文件
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path)
    }

    await prisma.file.delete({ where: { id } })

    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('Delete file error:', error)
    res.json({ code: 500, message: '服务器错误' })
  }
})

export default router