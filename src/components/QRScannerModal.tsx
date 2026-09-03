// v3.0 Phase 4: QRScannerModal — сканирование QR-кода через getUserMedia + jsQR.
// Закрывает QR-петлю: Drawer показывает QR -> AddContact сканирует -> контакт с publicKey.
// Безопасность: camera tracks останавливаются на unmount (battery + privacy).

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import jsQR from 'jsqr';

export interface ScannedIdentity {
  uid: string;
  publicKey?: unknown;
}

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: ScannedIdentity) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const scanLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(scanLoop);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          handleDecode(code.data);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(scanLoop);
    };

    const handleDecode = (raw: string) => {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.v && parsed.v.startsWith('piligrim-') && parsed.uid) {
          console.log('[PILIGRIM] QR decoded:', parsed.uid);
          onScan({ uid: parsed.uid, publicKey: parsed.publicKey });
        } else {
          setError('Not a PILIGRIM QR code');
          rafRef.current = requestAnimationFrame(scanLoop);
        }
      } catch {
        setError('Could not parse QR data');
        rafRef.current = requestAnimationFrame(scanLoop);
      }
    };

    const startCamera = async () => {
      try {
        setError('');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          scanLoop();
        }
      } catch (err) {
        console.error('[PILIGRIM] Camera error:', err);
        setError('Camera unavailable. Use manual UID entry.');
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="qr-scanner-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        data-testid="qr-scanner-modal"
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 } as React.CSSProperties}
      >
        <div data-testid="qr-scanner-viewport" style={{ position: 'relative', width: '100%', maxWidth: 400, aspectRatio: '1', borderRadius: 24, overflow: 'hidden', border: '2px solid var(--color-accent)', boxShadow: '0 0 40px var(--color-accent-glow, rgba(232, 106, 88, 0.5))' } as React.CSSProperties} onClick={(e) => e.stopPropagation()}>
          <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' } as React.CSSProperties} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ position: 'absolute', inset: '15%', border: '2px dashed rgba(255,255,255,0.6)', borderRadius: 16, pointerEvents: 'none' } as React.CSSProperties} />
        </div>

        <div data-testid="qr-scanner-status" style={{ marginTop: 20, color: 'white', fontSize: 15, textAlign: 'center', maxWidth: 320 } as React.CSSProperties}>
          {error || 'Point camera at peer QR code'}
        </div>

        <button onClick={onClose} data-testid="qr-scanner-close" style={{ marginTop: 24, padding: '12px 32px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' } as React.CSSProperties}>
          Close
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
