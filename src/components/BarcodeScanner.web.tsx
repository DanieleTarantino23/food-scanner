// @ts-nocheck
// Web-only — uses HTML directly, not React Native primitives
import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Colors } from '../constants/colors';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  paused?: boolean;
}

const SCAN_COOLDOWN_MS = 2000;
const FINDER = 260;

type Phase = 'idle' | 'starting' | 'scanning' | 'denied' | 'error';

export function BarcodeScanner({ onScan, paused = false }: BarcodeScannerProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const readerRef   = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const lastScanRef = useRef(0);
  const pausedRef   = useRef(paused);
  const onScanRef   = useRef(onScan);
  const [phase, setPhase]     = useState<Phase>('idle');
  const [errorMsg, setError]  = useState('');

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  // Cleanup on unmount
  useEffect(() => () => {
    readerRef.current?.reset();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const startCamera = useCallback(async () => {
    setPhase('starting');
    try {
      // Request camera directly — this triggers the browser permission dialog
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setPhase('scanning');

      // Decode barcodes continuously from the live video element
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      reader.decodeFromVideoElementContinuously(video, (result) => {
        if (!result) return;
        if (pausedRef.current) return;
        const now = Date.now();
        if (now - lastScanRef.current < SCAN_COOLDOWN_MS) return;
        lastScanRef.current = now;
        onScanRef.current(result.getText());
      });
    } catch (err: any) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      const name = err?.name ?? '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setPhase('denied');
      } else {
        setPhase('error');
        setError(`${err?.name}: ${err?.message}`);
      }
    }
  }, []);

  const reset = useCallback(() => {
    readerRef.current?.reset();
    streamRef.current?.getTracks().forEach(t => t.stop());
    readerRef.current = null;
    streamRef.current = null;
    setPhase('idle');
  }, []);

  return (
    <div style={styles.root}>
      {/* Video is ALWAYS in the DOM — never unmounted, keeps the ref stable */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          ...styles.video,
          visibility: phase === 'scanning' || phase === 'starting' ? 'visible' : 'hidden',
        }}
      />

      {/* ── Idle ── */}
      {phase === 'idle' && (
        <div style={styles.center}>
          <div style={styles.finder} />
          <button onClick={startCamera} style={styles.primaryBtn}>
            📷 Avvia scanner
          </button>
          <p style={styles.hint}>Tocca per attivare la fotocamera</p>
        </div>
      )}

      {/* ── Starting / Scanning ── */}
      {(phase === 'starting' || phase === 'scanning') && (
        <div style={styles.overlay}>
          <div style={{ ...styles.finder, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }} />
          <p style={styles.hint}>
            {phase === 'starting' ? 'Caricamento fotocamera…' : 'Allinea il codice a barre nel riquadro'}
          </p>
        </div>
      )}

      {/* ── Denied ── */}
      {phase === 'denied' && (
        <div style={styles.center}>
          <p style={{ color: Colors.textSecondary, textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
            Permesso fotocamera negato.<br />
            Vai in <b>Impostazioni → Safari → Camera</b><br />
            e consenti per questo sito.
          </p>
          <button onClick={reset} style={styles.secondaryBtn}>Riprova</button>
        </div>
      )}

      {/* ── Error ── */}
      {phase === 'error' && (
        <div style={styles.center}>
          <p style={{ color: Colors.error, textAlign: 'center', margin: 0, fontFamily: 'monospace', fontSize: 13 }}>
            {errorMsg}
          </p>
          <button onClick={reset} style={styles.secondaryBtn}>Riprova</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: {
    position: 'relative' as const,
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#000',
  },
  video: {
    position: 'absolute' as const,
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    zIndex: 0,
  },
  overlay: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    zIndex: 1,
  },
  center: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    padding: 32,
    boxSizing: 'border-box' as const,
  },
  finder: {
    width: FINDER,
    height: FINDER,
    border: `2px solid ${Colors.info}`,
    borderRadius: 16,
    flexShrink: 0,
  },
  hint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: 500,
    margin: 0,
    textAlign: 'center' as const,
  },
  primaryBtn: {
    background: Colors.info,
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    padding: '16px 32px',
    fontSize: 17,
    fontWeight: 700,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  },
  secondaryBtn: {
    background: Colors.bgCard,
    color: Colors.info,
    border: `1px solid ${Colors.info}`,
    borderRadius: 12,
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
