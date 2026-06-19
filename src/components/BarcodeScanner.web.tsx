// @ts-nocheck
// Web-only file — uses HTML/CSS directly, not React Native primitives
import { useEffect, useRef, useCallback, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Colors } from '../constants/colors';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  paused?: boolean;
}

const SCAN_COOLDOWN_MS = 2000;
const FINDER = 260;

export function BarcodeScanner({ onScan, paused = false }: BarcodeScannerProps) {
  const readerRef   = useRef(null);
  const lastScanRef = useRef(0);
  const pausedRef   = useRef(paused);
  const onScanRef   = useRef(onScan);
  const [denied, setDenied] = useState(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  // videoCallbackRef fires when the <video> element enters the DOM
  const videoCallbackRef = useCallback((video) => {
    if (!video) {
      readerRef.current?.reset();
      return;
    }

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width:  { ideal: 1280 },
            height: { ideal: 720  },
          },
        },
        video,
        (result) => {
          if (!result) return;
          if (pausedRef.current) return;
          const now = Date.now();
          if (now - lastScanRef.current < SCAN_COOLDOWN_MS) return;
          lastScanRef.current = now;
          onScanRef.current(result.getText());
        }
      )
      .catch((err) => {
        if (err?.name === 'NotAllowedError') setDenied(true);
      });
  }, []);

  if (denied) {
    return (
      <div style={s.denied}>
        <p style={{ color: Colors.textSecondary, textAlign: 'center', margin: 0 }}>
          Accesso alla fotocamera negato.
        </p>
        <button onClick={() => window.location.reload()} style={s.retryBtn}>
          Riprova
        </button>
      </div>
    );
  }

  return (
    <div style={s.root}>
      <video
        ref={videoCallbackRef}
        playsInline
        muted
        style={s.video}
      />
      <div style={s.overlay}>
        <div style={s.finder} />
        <p style={s.hint}>Allinea il codice a barre nel riquadro</p>
      </div>
    </div>
  );
}

const s = {
  root: {
    position: 'relative',
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex: 0,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    zIndex: 1,
  },
  finder: {
    width:  FINDER,
    height: FINDER,
    border: `2px solid ${Colors.info}`,
    borderRadius: 16,
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
  },
  hint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: 500,
    margin: 0,
  },
  denied: {
    flex: 1,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: Colors.bg,
    gap: 16,
    padding: 32,
  },
  retryBtn: {
    background: Colors.info,
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
