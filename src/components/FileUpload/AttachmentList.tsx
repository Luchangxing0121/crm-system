import {
  FileImage,
  FileText,
  FileSpreadsheet,
  FileIcon,
  Archive,
  Presentation,
  Download,
  Trash2,
  Eye,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { attachmentApi } from '@/services/api'
import { formatFileSize } from './FileUploader'

export interface AttachmentItem {
  id: string
  name: string
  size: number
  type: string
  category?: string
  uploader: string
  uploadedAt: string
  url?: string
}

interface AttachmentListProps {
  attachments: AttachmentItem[]
  onDelete?: (id: string) => void
  showCategory?: boolean
  showUploader?: boolean
  compact?: boolean
}

function getFileIcon(type: string) {
  switch (type) {
    case 'image':
      return { icon: FileImage, color: 'text-emerald-500 bg-emerald-50', label: '图片' }
    case 'pdf':
      return { icon: FileText, color: 'text-rose-500 bg-rose-50', label: 'PDF' }
    case 'doc':
      return { icon: FileText, color: 'text-blue-500 bg-blue-50', label: '文档' }
    case 'xls':
      return { icon: FileSpreadsheet, color: 'text-emerald-600 bg-emerald-50', label: '表格' }
    case 'ppt':
      return { icon: Presentation, color: 'text-orange-500 bg-orange-50', label: '演示' }
    case 'zip':
      return { icon: Archive, color: 'text-amber-600 bg-amber-50', label: '压缩包' }
    default:
      return { icon: FileIcon, color: 'text-slate-500 bg-slate-50', label: '文件' }
  }
}

export default function AttachmentList({
  attachments,
  onDelete,
  showCategory = false,
  showUploader = true,
  compact = false,
}: AttachmentListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (attachments.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        暂无附件
      </div>
    )
  }

  const handleDownload = async (att: AttachmentItem) => {
    if (downloadingId) return
    setDownloadingId(att.id)
    try {
      await attachmentApi.download(att.id, att.name)
      toast.success(`已下载「${att.name}」`)
    } catch (err) {
      toast.error('下载失败，请重试')
    } finally {
      setDownloadingId(null)
    }
  }

  const handlePreview = (att: AttachmentItem) => {
    // 图片、PDF 等浏览器支持的类型直接新窗口预览；其他类型走下载
    const previewTypes = ['image', 'pdf']
    if (previewTypes.includes(att.type)) {
      const previewUrl = attachmentApi.getPreviewUrl(att.id)
      if (previewUrl) {
        window.open(previewUrl, '_blank')
        return
      }
      // 没有缓存内容时回退到下载
      toast.info('暂无可预览内容，正在下载...')
      handleDownload(att)
      return
    }
    // 非预览类型直接下载
    toast.info('该文件类型不支持预览，正在下载...')
    handleDownload(att)
  }

  const handleDelete = async (id: string, name: string) => {
    if (deletingId) return
    setDeletingId(id)
    try {
      await attachmentApi.remove(id)
      if (onDelete) onDelete(id)
      toast.success(`已删除「${name}」`)
    } catch (err) {
      toast.error('删除失败，请重试')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={`space-y-${compact ? '1.5' : '2'}`}>
      {attachments.map((att) => {
        const { icon: Icon, color } = getFileIcon(att.type)
        return (
          <div
            key={att.id}
            className={`flex items-center gap-3 p-${compact ? '2' : '3'} rounded-lg border border-border/40 bg-background hover:border-border/80 transition-colors group`}
          >
            <div className={`size-${compact ? '8' : '10'} rounded-md flex items-center justify-center shrink-0 ${color}`}>
              <Icon className={compact ? 'size-4' : 'size-5'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium truncate`}>
                {att.name}
              </p>
              <div className={`flex items-center gap-${compact ? '1.5' : '2'} ${compact ? 'text-[11px]' : 'text-xs'} text-muted-foreground mt-0.5`}>
                <span>{formatFileSize(att.size)}</span>
                {showCategory && att.category && (
                  <>
                    <span>·</span>
                    <span>{att.category}</span>
                  </>
                )}
                {showUploader && (
                  <>
                    <span>·</span>
                    <span>{att.uploadedAt}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  onClick={() => handlePreview(att)}
                  title={['image', 'pdf'].includes(att.type) ? '预览' : '下载查看'}
                >
                  <Eye className="size-3.5" />
                </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={() => handleDownload(att)}
                disabled={downloadingId === att.id}
                title="下载"
              >
                <Download className="size-3.5" />
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(att.id, att.name)}
                  disabled={deletingId === att.id}
                  title="删除"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { getFileIcon as getAttachmentIcon }
