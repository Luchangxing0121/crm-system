import { useState, useRef, useCallback, useEffect, useId } from 'react'
import { Upload, X, FileImage, FileText, FileSpreadsheet, FileIcon, Archive, Presentation, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Image } from '@/components/ui/image';

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  file?: File
  progress?: number
  url?: string
}

interface FileUploaderProps {
  files: UploadedFile[]
  onChange: (files: UploadedFile[]) => void
  maxSize?: number
  maxCount?: number
  accept?: string
  label?: string
  hint?: string
}

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
const DOC_EXT = ['doc', 'docx', 'pdf', 'txt', 'md']
const XLS_EXT = ['xls', 'xlsx', 'csv']
const PPT_EXT = ['ppt', 'pptx']
const ZIP_EXT = ['zip', 'rar', '7z', 'tar', 'gz']

function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (IMAGE_EXT.includes(ext)) return 'image'
  if (DOC_EXT.includes(ext)) return ext === 'pdf' ? 'pdf' : 'doc'
  if (XLS_EXT.includes(ext)) return 'xls'
  if (PPT_EXT.includes(ext)) return 'ppt'
  if (ZIP_EXT.includes(ext)) return 'zip'
  return 'other'
}

function getFileIcon(type: string) {
  switch (type) {
    case 'image':
      return { icon: FileImage, color: 'text-emerald-500 bg-emerald-50' }
    case 'pdf':
      return { icon: FileText, color: 'text-rose-500 bg-rose-50' }
    case 'doc':
      return { icon: FileText, color: 'text-blue-500 bg-blue-50' }
    case 'xls':
      return { icon: FileSpreadsheet, color: 'text-emerald-600 bg-emerald-50' }
    case 'ppt':
      return { icon: Presentation, color: 'text-orange-500 bg-orange-50' }
    case 'zip':
      return { icon: Archive, color: 'text-amber-600 bg-amber-50' }
    default:
      return { icon: FileIcon, color: 'text-slate-500 bg-slate-50' }
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

export default function FileUploader({
  files,
  onChange,
  maxSize = 100 * 1024 * 1024,
  maxCount = 10,
  accept,
  label = '附件上传',
  hint = '支持图片、文档、表格、演示文稿、压缩包等格式，单个文件最大 100MB',
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const [isDragging, setIsDragging] = useState(false)
  const filesRef = useRef(files)
  useEffect(() => {
    filesRef.current = files
  }, [files])

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const newFiles: UploadedFile[] = []

      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i]
        if (f.size > maxSize) {
          toast.error(`文件「${f.name}」超过大小限制（${formatFileSize(maxSize)}）`)
          continue
        }
        if (files.length + newFiles.length >= maxCount) {
          toast.warning(`最多上传 ${maxCount} 个文件`)
          break
        }
        const type = getFileType(f.name)
        newFiles.push({
          id: `tmp-${Date.now()}-${i}`,
          name: f.name,
          size: f.size,
          type,
          file: f,
          progress: 0,
        })
      }

      if (newFiles.length === 0) return

      onChange([...filesRef.current, ...newFiles])

      // 模拟上传进度 —— 用 ref 取最新列表，避免闭包陈旧状态覆盖已有文件
      newFiles.forEach((nf) => {
        let progress = 0
        const interval = setInterval(() => {
          progress += Math.random() * 25 + 10
          if (progress >= 100) {
            progress = 100
            clearInterval(interval)
            // 上传完成后生成预览 URL（图片用 objectURL，其他文件用文件名锚点）
            const fileObj = nf.file
            const previewUrl = fileObj
              ? nf.type === 'image'
                ? URL.createObjectURL(fileObj)
                : `#file-${nf.id}`
              : undefined
            onChange(
              filesRef.current.map((x) =>
                x.id === nf.id ? { ...x, progress: 100, url: previewUrl } : x,
              ),
            )
            return
          }
          onChange(
            filesRef.current.map((x) =>
              x.id === nf.id ? { ...x, progress: Math.min(100, progress) } : x,
            ),
          )
        }, 200)
      })
    },
    [files, maxSize, maxCount, onChange],
  )

  // 说明：点击上传已改为 label 原生关联（见下方 JSX），不再依赖 JS 的 input.click()，递归在结构上不可能发生
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    // 重置 value，否则选相同文件不会触发 change
    e.target.value = ''
  }

  const handleRemove = (id: string) => {
    onChange(files.filter((f) => f.id !== id))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (files.length >= maxCount) {
      toast.warning(`最多上传 ${maxCount} 个文件`)
      return
    }
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      {/* 隐藏的文件输入框：独立于上传区域之外，彻底避免 input.click() 事件冒泡回上传区域造成递归 */}
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
        onClick={(e) => e.stopPropagation()}
      />
      {/* 上传区域 — 用 label 原生关联 input，点击由浏览器直接转发打开文件选择器 */}
      <label
        htmlFor={inputId}
        onClick={(e) => {
          // 达到上限时阻止 label 原生转发，不打开选择器
          if (files.length >= maxCount) {
            e.preventDefault()
            toast.warning(`最多上传 ${maxCount} 个文件`)
            return
          }
          if (isDragging) return
        }}
        onDragOver={(e) => {
          if (files.length < maxCount) {
            handleDragOver(e)
          } else {
            e.preventDefault()
          }
        }}
        onDragLeave={(e) => {
          if (files.length < maxCount) {
            handleDragLeave(e)
          }
        }}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          if (files.length >= maxCount) {
            toast.warning(`最多上传 ${maxCount} 个文件`)
            return
          }
          handleFiles(e.dataTransfer.files)
        }}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center
          transition-colors duration-200
          ${files.length >= maxCount
            ? 'opacity-50 cursor-not-allowed border-border bg-muted/20'
            : 'cursor-pointer ' + (isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
            )
          }
        `}
      >
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center">
            <Upload className="size-5 text-muted-foreground" />
          </div>
          <div className="text-sm text-foreground">
            <span className="font-medium text-primary">点击上传</span>
            <span className="text-muted-foreground"> 或拖拽文件到此处</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {hint}
            {maxCount > 1 && `（${files.length}/${maxCount}）`}
          </p>
        </div>
      </label>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => {
            const { icon: Icon, color } = getFileIcon(f.type)
            const uploading = f.progress !== undefined && f.progress < 100
             const hasValidUrl = typeof f.url === 'string' && f.url.length > 0 && f.url.startsWith('#') === false
             const previewUrl = hasValidUrl
               ? f.url
               : (f.file && f.type === 'image' && f.file.type.startsWith('image/') ? URL.createObjectURL(f.file) : undefined)
            return (
              <div
                key={f.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card"
              >
                <div className={`size-9 rounded-md flex items-center justify-center shrink-0 overflow-hidden ${color}`}>
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt={f.name}
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <Icon className="size-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(f.size)}</span>
                    {uploading && <span>上传中...</span>}
                    {!uploading && f.progress !== undefined && (
                      <span className="text-emerald-600">已上传</span>
                    )}
                  </div>
                  {uploading && (
                    <Progress value={f.progress} className="h-1 mt-1.5" />
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(f.id)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { getFileIcon, getFileType }
