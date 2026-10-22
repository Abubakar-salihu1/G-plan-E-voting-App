import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { requireAdminAuth, requireRole } from '../middleware/requireAdminAuth.js'
import { rateLimit } from '../lib/rateLimit.js'

export const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../uploads')

// Files are held in memory, their TRUE type is sniffed from magic bytes, and
// the stored name/extension is generated here — the client's filename and
// claimed mimetype are never trusted. SVG (scriptable) is not accepted.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } })

function sniff(buf) {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp'
  if (buf.length > 5 && buf.subarray(0, 5).toString() === '%PDF-') return 'pdf'
  return null
}

const router = Router()
const limiter = rateLimit({ windowMs: 15 * 60_000, max: 60, key: (r) => r.admin?.id ?? r.ip })

router.post('/', requireAdminAuth, requireRole('super-admin', 'chairman', 'commissioner'), limiter, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'File must be 5 MB or smaller (images 2 MB).' : 'Upload failed.'
      return res.status(400).json({ message })
    }
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' })
    const ext = sniff(req.file.buffer)
    if (!ext) return res.status(400).json({ message: 'Only PNG, JPEG, WebP images or PDF documents are allowed.' })
    if (ext !== 'pdf' && req.file.size > 2 * 1024 * 1024) return res.status(400).json({ message: 'Image must be 2 MB or smaller.' })
    try {
      const filename = `${crypto.randomUUID()}.${ext}`
      await fs.mkdir(UPLOAD_DIR, { recursive: true })
      await fs.writeFile(path.join(UPLOAD_DIR, filename), req.file.buffer, { flag: 'wx' })
      res.status(201).json({ url: `/uploads/${filename}` })
    } catch (e) {
      console.error(e)
      res.status(500).json({ message: 'Could not save the file.' })
    }
  })
})

export default router
