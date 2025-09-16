'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  RefreshCw,
  Trash2,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'

interface MlsUpload {
  id: string
  filename: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  recordsProcessed: number
  recordsTotal: number
  createdAt: string
  completedAt?: string
  error?: string
}

interface MlsSync {
  id: string
  source: string
  status: 'success' | 'error' | 'pending'
  recordsProcessed: number
  completedAt: string
  error?: string
}

export default function MlsManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [uploads, setUploads] = useState<MlsUpload[]>([])
  const [syncs, setSyncs] = useState<MlsSync[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session || !['ADMIN', 'EDITOR'].includes(session.user.role)) {
      router.push('/')
      return
    }

    fetchUploads()
    fetchSyncs()
  }, [session, status, router])

  const fetchUploads = async () => {
    try {
      const response = await fetch('/api/admin/mls/uploads')
      if (response.ok) {
        const data = await response.json()
        setUploads(data.uploads || [])
      }
    } catch (error) {
      console.error('Failed to fetch uploads:', error)
    }
  }

  const fetchSyncs = async () => {
    try {
      const response = await fetch('/api/admin/mls/syncs')
      if (response.ok) {
        const data = await response.json()
        setSyncs(data.syncs || [])
      }
    } catch (error) {
      console.error('Failed to fetch syncs:', error)
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    
    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json'
    ]
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV or Excel file')
      return
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB')
      return
    }

    await uploadFile(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/json': ['.json']
    },
    multiple: false,
    disabled: uploading
  })

  const uploadFile = async (file: File) => {
    try {
      setUploading(true)
      setUploadProgress(0)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/mls/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      
      if (data.success) {
        toast.success('File uploaded successfully! Processing...')
        setUploadProgress(100)
        fetchUploads()
      } else {
        toast.error(data.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleSyncMls = async () => {
    try {
      const response = await fetch('/api/mls/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit: 100,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('MLS sync completed successfully')
        fetchSyncs()
      } else {
        toast.error('MLS sync failed')
      }
    } catch (error) {
      console.error('MLS sync error:', error)
      toast.error('MLS sync failed')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'processing':
      case 'pending':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gold mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading MLS management...</p>
        </div>
      </div>
    )
  }

  if (!session || !['ADMIN', 'EDITOR'].includes(session.user.role)) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">MLS Management</h1>
              <p className="text-gray-600">Upload and manage MLS data</p>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={handleSyncMls} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync MLS
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload MLS Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              {uploading ? (
                <div>
                  <p className="text-lg font-medium mb-2">Uploading...</p>
                  <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                </div>
              ) : isDragActive ? (
                <p className="text-lg font-medium text-blue-600">Drop the file here...</p>
              ) : (
                <div>
                  <p className="text-lg font-medium mb-2">Drag & drop your MLS file here</p>
                  <p className="text-gray-600 mb-4">or click to browse</p>
                  <p className="text-sm text-gray-500">
                    Supports CSV, Excel (.xlsx, .xls), and JSON files (max 50MB)
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Uploads */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Uploads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {uploads.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No uploads yet</p>
                ) : (
                  uploads.map((upload) => (
                    <div key={upload.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(upload.status)}
                        <div>
                          <p className="font-medium">{upload.filename}</p>
                          <p className="text-sm text-gray-600">
                            {upload.recordsProcessed}/{upload.recordsTotal} records
                          </p>
                          {upload.error && (
                            <p className="text-sm text-red-600">{upload.error}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(upload.status)}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(upload.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                MLS Sync History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncs.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No syncs yet</p>
                ) : (
                  syncs.map((sync) => (
                    <div key={sync.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(sync.status)}
                        <div>
                          <p className="font-medium">{sync.source} Sync</p>
                          <p className="text-sm text-gray-600">
                            {sync.recordsProcessed} records processed
                          </p>
                          {sync.error && (
                            <p className="text-sm text-red-600">{sync.error}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(sync.status)}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(sync.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Upload Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <h4>Supported File Formats:</h4>
              <ul>
                <li><strong>CSV</strong> - Comma-separated values</li>
                <li><strong>Excel</strong> - .xlsx and .xls files</li>
                <li><strong>JSON</strong> - JavaScript Object Notation</li>
              </ul>
              
              <h4>Required Columns for CSV/Excel:</h4>
              <ul>
                <li><code>ListingKey</code> - Unique identifier</li>
                <li><code>ListPrice</code> - Property price</li>
                <li><code>UnparsedAddress</code> - Full address</li>
                <li><code>City</code> - City name</li>
                <li><code>StateOrProvince</code> - State or province</li>
                <li><code>BedroomsTotal</code> - Number of bedrooms</li>
                <li><code>BathroomsTotalInteger</code> - Number of bathrooms</li>
                <li><code>LivingArea</code> - Square footage</li>
                <li><code>PropertyType</code> - Type of property</li>
                <li><code>PublicRemarks</code> - Property description</li>
              </ul>
              
              <h4>Optional Columns:</h4>
              <ul>
                <li><code>YearBuilt</code> - Year the property was built</li>
                <li><code>LotSizeAcres</code> - Lot size in acres</li>
                <li><code>PropertySubType</code> - Property subtype</li>
                <li><code>MediaURL</code> - Image URLs (comma-separated)</li>
                <li><code>PropertyFeatures</code> - Property features (comma-separated)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
