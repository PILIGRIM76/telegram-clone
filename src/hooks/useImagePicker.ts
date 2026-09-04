// v3.0 Phase 5: useImagePicker - canvas compression для localStorage.
// Aurora spec: max 1280px, JPEG quality 0.8.
// localStorage ~5MB лимит -> обязательное сжатие!

import { useCallback, useRef, useState } from 'react';

export interface PickedImage {
  id: string;
  dataUrl: string;
  name: string;
  size: number;
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1280;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const ratio = Math.min(MAX / width, MAX / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas unavailable'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Image decode failed'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

export function useImagePicker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingImages, setPendingImages] = useState<PickedImage[]>([]);
  const [error, setError] = useState('');

  const openPicker = useCallback((source: 'camera' | 'gallery') => {
    if (!inputRef.current) return;
    if (source === 'camera') {
      inputRef.current.setAttribute('capture', 'environment');
    } else {
      inputRef.current.removeAttribute('capture');
    }
    inputRef.current.click();
  }, []);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError('');
    try {
      for (const file of Array.from(files).slice(0, 4)) {
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await compressImage(file);
        setPendingImages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 8),
            dataUrl,
            name: file.name,
            size: Math.round((dataUrl.length * 3) / 4),
          },
        ]);
      }
    } catch (e) {
      setError('Failed to process image');
      console.error('[PILIGRIM] Image pick error:', e);
    }
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const removeImage = useCallback((id: string) => {
    setPendingImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const clearImages = useCallback(() => setPendingImages([]), []);

  return { inputRef, pendingImages, error, openPicker, handleFiles, removeImage, clearImages };
}