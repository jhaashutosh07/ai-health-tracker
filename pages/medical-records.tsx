import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import AppShell from '@/components/AppShell'
import {
  FileText,
  Upload,
  Trash2,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  ScanLine,
  CheckCircle2,
} from 'lucide-react'

interface MedicalDocument {
  id: string
  title: string
  description: string | null
  category: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedDate: string
  documentDate: string | null
}

const CATEGORIES = [
  { value: 'ALL',         label: 'All',          icon: '📄' },
  { value: 'LAB_REPORT',  label: 'Lab Report',   icon: '🧪' },
  { value: 'PRESCRIPTION',label: 'Prescription', icon: '💊' },
  { value: 'XRAY',        label: 'X-Ray / Scan', icon: '🩻' },
  { value: 'CERTIFICATE', label: 'Certificate',  icon: '📜' },
  { value: 'OTHER',       label: 'Other',        icon: '📎' },
]

function categoryIcon(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.icon || '📄'
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatBytes(b: number) {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function MedicalRecords() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [documents, setDocuments] = useState<MedicalDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Upload / OCR state
  const [showUpload, setShowUpload] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('OTHER')
  const [docDate, setDocDate] = useState('')
  const [scanning, setScanning] = useState(false)
  const [ocrResult, setOcrResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (session) fetchDocuments()
  }, [session, filter])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const params = filter !== 'ALL' ? `?category=${filter}` : ''
      const res = await fetch(`/api/medical-records${params}`)
      const data = await res.json()
      if (res.ok) setDocuments(data.documents || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (file: File) => {
    setImageFile(file)
    setOcrResult(null)
    setError(null)
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))

    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Strip "data:image/...;base64," prefix
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleScanAndSave = async () => {
    if (!imageFile) return
    setScanning(true)
    setError(null)
    setOcrResult(null)

    try {
      const base64 = await toBase64(imageFile)
      const res = await fetch('/api/medical-records/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: imageFile.type,
          title: title || imageFile.name,
          category,
          documentDate: docDate || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'OCR failed')

      setOcrResult(data.ocrText)
      setSuccess(true)
      fetchDocuments()
      setTimeout(() => {
        setSuccess(false)
        setShowUpload(false)
        resetForm()
      }, 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setScanning(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return
    const res = await fetch(`/api/medical-records/${id}`, { method: 'DELETE' })
    if (res.ok) fetchDocuments()
    else alert('Failed to delete')
  }

  const resetForm = () => {
    setImageFile(null)
    setImagePreview(null)
    setTitle('')
    setCategory('OTHER')
    setDocDate('')
    setOcrResult(null)
    setError(null)
  }

  if (status === 'loading') {
    return (
      <AppShell title="Medical Records">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-sky-500" size={32} />
        </div>
      </AppShell>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  const filtered = filter === 'ALL' ? documents : documents.filter(d => d.category === filter)

  return (
    <AppShell
      title="Medical Records"
      breadcrumb={[{ label: 'Medical Records' }]}
    >
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Medical Records</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              AI-powered OCR — upload any medical document image and Claude will extract & summarize it
            </p>
          </div>
          <button
            onClick={() => { setShowUpload(!showUpload); resetForm() }}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-sky-600/20"
          >
            {showUpload ? <X size={16} /> : <Upload size={16} />}
            {showUpload ? 'Cancel' : 'Upload & Scan'}
          </button>
        </div>

        {/* Upload / OCR panel */}
        {showUpload && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-sky-100 rounded-xl flex items-center justify-center">
                <ScanLine size={16} className="text-sky-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800">AI Document Scanner</h2>
                <p className="text-xs text-slate-500">Upload an image — Claude Vision will read and summarize it</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const f = e.dataTransfer.files[0]
                  if (f) handleFileSelect(f)
                }}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-sky-400 hover:bg-sky-50/50 transition-all group"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-52 mx-auto rounded-xl object-contain shadow"
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="w-14 h-14 bg-slate-100 group-hover:bg-sky-100 rounded-2xl flex items-center justify-center mx-auto transition-colors">
                      <Upload size={24} className="text-slate-400 group-hover:text-sky-500" />
                    </div>
                    <p className="font-medium text-slate-700">Click or drag to upload image</p>
                    <p className="text-xs text-slate-400">JPG, PNG, GIF, WEBP — max 10 MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileSelect(f)
                  }}
                />
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g., Blood Test Results"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {CATEGORIES.filter(c => c.value !== 'ALL').map(c => (
                      <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Document Date</label>
                  <input
                    type="date"
                    value={docDate}
                    onChange={e => setDocDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-700">
                  <CheckCircle2 size={18} />
                  <span className="font-medium text-sm">Document scanned and saved successfully!</span>
                </div>
              )}

              {ocrResult && !success && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 max-h-64 overflow-y-auto">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">OCR Preview</p>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">{ocrResult}</pre>
                </div>
              )}

              <button
                onClick={handleScanAndSave}
                disabled={!imageFile || scanning || success}
                className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold px-6 py-3 rounded-xl transition-all text-sm"
              >
                {scanning ? (
                  <><Loader2 size={16} className="animate-spin" /> Scanning with Claude AI…</>
                ) : (
                  <><Sparkles size={16} /> Scan & Save Document</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* How it works info box */}
        {!showUpload && documents.length === 0 && !loading && (
          <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5">
            <h3 className="font-semibold text-sky-800 mb-2 flex items-center gap-2">
              <Sparkles size={16} /> How AI OCR Works
            </h3>
            <ul className="text-sm text-sky-700 space-y-1.5">
              <li>• Take a photo of any lab report, prescription, or scan result</li>
              <li>• Claude Vision reads all text from the image (even handwritten notes)</li>
              <li>• Extracts patient details, key values, and provides a plain-English summary</li>
              <li>• All extracted text is saved — searchable and readable anytime</li>
            </ul>
          </div>
        )}

        {/* Filter tabs */}
        <div className="bg-white rounded-2xl border border-slate-100 p-3 flex gap-1.5 flex-wrap shadow-sm">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                filter === c.value
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Documents list */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400">
              <Loader2 className="animate-spin mx-auto mb-3" size={28} />
              <p className="text-sm">Loading documents…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
              <FileText size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-600">No documents yet</p>
              <p className="text-sm text-slate-400 mt-1">Upload a medical image to get started</p>
            </div>
          ) : (
            filtered.map(doc => {
              const isExpanded = expandedId === doc.id
              return (
                <div key={doc.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-4 flex items-start gap-4">
                    <div className="text-3xl flex-shrink-0 mt-0.5">{categoryIcon(doc.category)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800">{doc.title}</h3>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                        <span>{CATEGORIES.find(c => c.value === doc.category)?.label}</span>
                        <span>•</span>
                        <span>Uploaded {formatDate(doc.uploadedDate)}</span>
                        {doc.documentDate && (
                          <><span>•</span><span>Document date: {formatDate(doc.documentDate)}</span></>
                        )}
                        {doc.fileSize > 0 && (
                          <><span>•</span><span>{formatBytes(doc.fileSize)}</span></>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{doc.description.slice(0, 120)}…</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doc.description && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                          className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 font-medium px-3 py-1.5 rounded-lg hover:bg-sky-50 transition-all"
                        >
                          {isExpanded ? <><ChevronUp size={14} /> Hide OCR</> : <><ChevronDown size={14} /> View OCR</>}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && doc.description && (
                    <div className="px-5 pb-5 border-t border-slate-50 mt-0">
                      <div className="bg-slate-50 rounded-xl p-4 max-h-96 overflow-y-auto mt-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <ScanLine size={12} /> AI-Extracted Text
                        </p>
                        <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                          {doc.description}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </AppShell>
  )
}
