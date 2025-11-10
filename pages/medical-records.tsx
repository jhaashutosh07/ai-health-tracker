import { useState, useEffect, FormEvent } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { FileText, Upload, Trash2, Download, Filter, X } from 'lucide-react'

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
  { value: 'ALL', label: 'All Documents', icon: '📄' },
  { value: 'LAB_REPORT', label: 'Lab Reports', icon: '🧪' },
  { value: 'PRESCRIPTION', label: 'Prescriptions', icon: '💊' },
  { value: 'XRAY', label: 'X-Rays/Scans', icon: '🩻' },
  { value: 'CERTIFICATE', label: 'Certificates', icon: '📜' },
  { value: 'OTHER', label: 'Other', icon: '📎' }
]

export default function MedicalRecords() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [documents, setDocuments] = useState<MedicalDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('ALL')

  // Upload form state
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('OTHER')
  const [documentDate, setDocumentDate] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState(false)

  useEffect(() => {
    if (session) {
      fetchDocuments()
    }
  }, [session, selectedCategory])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'ALL') {
        params.append('category', selectedCategory)
      }

      const response = await fetch(`/api/medical-records?${params}`)
      const data = await response.json()

      if (response.ok) {
        setDocuments(data.documents)
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) {
      setUploadError('Please select a file')
      return
    }

    setUploading(true)
    setUploadError('')
    setUploadSuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title || file.name)
      if (description) formData.append('description', description)
      formData.append('category', category)
      if (documentDate) formData.append('documentDate', documentDate)

      const response = await fetch('/api/medical-records/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setUploadSuccess(true)
        setShowUploadForm(false)
        resetForm()
        fetchDocuments()
        setTimeout(() => setUploadSuccess(false), 3000)
      } else {
        setUploadError(data.message || 'Upload failed')
      }
    } catch (error) {
      setUploadError('Failed to upload file. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const response = await fetch(`/api/medical-records/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchDocuments()
      } else {
        alert('Failed to delete document')
      }
    } catch (error) {
      alert('Failed to delete document')
    }
  }

  const resetForm = () => {
    setFile(null)
    setTitle('')
    setDescription('')
    setCategory('OTHER')
    setDocumentDate('')
    setUploadError('')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getCategoryIcon = (cat: string) => {
    return CATEGORIES.find(c => c.value === cat)?.icon || '📄'
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medical Records</h1>
            <p className="mt-2 text-gray-600">Manage your medical documents and reports</p>
          </div>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            {showUploadForm ? <X size={20} /> : <Upload size={20} />}
            <span>{showUploadForm ? 'Cancel' : 'Upload Document'}</span>
          </button>
        </div>

        {/* Success Message */}
        {uploadSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-semibold">Document uploaded successfully!</p>
          </div>
        )}

        {/* Upload Form */}
        {showUploadForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Upload New Document</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0]
                      setFile(selectedFile || null)
                      if (selectedFile && !title) {
                        setTitle(selectedFile.name)
                      }
                    }}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max size: 10MB. Supported: PDF, JPG, PNG, DOC, DOCX</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="e.g., Blood Test Results"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {CATEGORIES.filter(c => c.value !== 'ALL').map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={documentDate}
                    onChange={(e) => setDocumentDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Additional notes or description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {uploadError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{uploadError}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadForm(false)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Category Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <Filter size={20} className="text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filter by Category</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">
              My Documents ({documents.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading documents...</div>
            ) : documents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FileText size={48} className="mx-auto mb-4 text-gray-400" />
                <p>No documents found</p>
                <p className="text-sm mt-1">Upload your first medical document to get started</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="text-3xl">{getCategoryIcon(doc.category)}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">{doc.title}</h3>
                        {doc.description && (
                          <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>{CATEGORIES.find(c => c.value === doc.category)?.label}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>•</span>
                          <span>Uploaded: {formatDate(doc.uploadedDate)}</span>
                          {doc.documentDate && (
                            <>
                              <span>•</span>
                              <span>Date: {formatDate(doc.documentDate)}</span>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{doc.fileName}</div>
                      </div>
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Download"
                      >
                        <Download size={20} />
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
