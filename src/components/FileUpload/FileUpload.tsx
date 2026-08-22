import React, { useState, useRef } from 'react';
import { apiService } from '../../services/apiService';

interface FileUploadProps {
  to: string;
  recipientPublicKey?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ to, recipientPublicKey }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
        }
      };

      reader.onload = async () => {
        const base64File = reader.result?.toString().split(',')[1];
        
        const fileData = {
          name: file.name,
          size: file.size,
          type: file.type,
          data: base64File
        };

        apiService.sendMessage(
          to,
          JSON.stringify(fileData),
          recipientPublicKey || ''
        );

        setProgress(100);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-upload">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={uploading}
      />
      {file && (
        <div>
          <span>{file.name} ({file.type})</span>
          <button onClick={uploadFile} disabled={uploading}>
            {uploading ? `Uploading... ${progress}%` : 'Upload'}
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;