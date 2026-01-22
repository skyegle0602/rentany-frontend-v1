'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileText, Upload, AlertCircle, Trash2, Eye, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { uploadFile, api, type UserData } from '@/lib/api-client';

interface Document {
  id: string;
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
}

interface DocumentManagerProps {
  user: UserData | null;
  onUpdate?: () => void | Promise<void>;
}

export default function DocumentManager({ user, onUpdate }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>(user?.documents || []);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      setUploadError('Only PDF and image files (JPG, PNG) are allowed');
      return;
    }

    if (file.size > maxSize) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await uploadFile(file);
      
      const newDocument: Document = {
        id: Date.now().toString(),
        name: file.name,
        url: response.file_url,
        type: file.type,
        uploadedAt: new Date().toISOString()
      };

      const updatedDocuments = [...documents, newDocument];
      setDocuments(updatedDocuments);

      const updateResponse = await api.updateUser({ documents: updatedDocuments });
      if (!updateResponse.success) {
        throw new Error(updateResponse.error || 'Failed to update documents');
      }
      
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadError('Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const updatedDocuments = documents.filter(doc => doc.id !== docId);
      setDocuments(updatedDocuments);
      const updateResponse = await api.updateUser({ documents: updatedDocuments });
      if (!updateResponse.success) {
        throw new Error(updateResponse.error || 'Failed to delete document');
      }
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const getDocumentIcon = (type: string) => {
    if (type === 'application/pdf') return '📄';
    if (type.startsWith('image/')) return '🖼️';
    return '📎';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Info Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Document Verification</AlertTitle>
        <AlertDescription className="text-blue-800">
          Upload documents such as your driver's license or ID for verification purposes. 
          All documents are stored securely and encrypted.
        </AlertDescription>
      </Alert>

      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* Upload Section */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              className="hidden"
              id="document-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="document-upload"
              className="cursor-pointer inline-flex flex-col items-center"
            >
              <Upload className="w-12 h-12 text-slate-400 mb-3" />
              <p className="text-sm font-medium text-slate-700 mb-1">
                {isUploading ? 'Uploading...' : 'Click to upload'}
              </p>
              <p className="text-xs text-slate-500">
                PDF, JPG, PNG (max 5MB)
              </p>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>My Documents</span>
            <Badge variant="secondary">{documents.length} files</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{getDocumentIcon(doc.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">
                        {doc.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4 text-slate-600" />
                    </a>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No documents uploaded</h3>
              <p className="text-sm text-slate-600">
                Upload your documents to complete verification
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Note */}
      <Alert className="bg-slate-50 border-slate-200">
        <Shield className="h-4 w-4 text-slate-600" />
        <AlertDescription className="text-slate-700 text-xs">
          <strong>Your privacy matters:</strong> All documents are encrypted and stored securely. 
          Only verified admins can access them for verification purposes.
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}