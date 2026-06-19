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
  const [phase, setPhase] = useState<'idle' | 'starting' | 'scanning' | 'denied' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  // Called when the <video> element mounts after user taps "Start"
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
            height: { ideal: 720 },
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
      .then(() => {
        setPhase('scanning');
      })
      .catch((err) => {
        const name = err?.name ?? '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setPhase('denied');
        } else {
          setPhase('error');
          setErrorMsg(err?.message ?? 'Errore camera');
        }
      });
  }, []);

  // ── Idle: tap-to-start (ensures user gesture for getUserMedia on iOS) ──────
  if (phase === 'idle') {
    return (
      <div style={{ ...s.centered, background: '#000' }}>
        <div style={s.finder} />
        <button
          onClick={() => setPhase('starting')}
          style={s.startBtn}
        >
          📷 Avvia scanner
        </button>
        <p style={s.hint}>Tocca per attivare la fotocamera</p>
      </div>
    );
  }

  // ── Starting (video not yet in DOM) ─────────────────────────────────────
  if (phase === 'starting') {
    return (
      <div style={s.root}>
        <video ref={videoCallbackRef} playsInline muted autoPlay style={s.video} />
        <div style={s.overlay}>
          <div style={s.finder} />
          <p style={s.hint}>Caricamento fotocamera…</p>
        </div>
      </div>
    );
  }

  // ── Camera denied ─────────────────────────────────────────────────────────
  if (phase === 'denied') {
    return (
      <div style={s.centered}>
        <p style={{ color: Colors.textSecondary, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
          Permesso fotocamera negato.{'\n'}
          Vai in <strong>Impostazioni &gt; Safari &gt; Camera</strong> e consenti l'accesso.
        </p>
        <button onClick={() => setPhase('idle')} style={s.retryBtn}>
          Riprova
        </button>
      </div>
    );
  }

  // ── Other error ───────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div style={s.centered}>
        <p style={{ color: Colors.error, textAlign: 'center', margin: 0 }}>{errorMsg}</p>
        <button onClick={() => setPhase('idle')} style={s.retryBtn}>
          Riprova
        </button>
      </div>
    );
  }

  // ── Scanning ─────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      <video ref={videoCallbackRef} playsInline muted autoPlay style={s.video} />
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
  centered: {
    flex: 1,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: Colors.bg,
    gap: 20,
    padding: 32,
    boxSizing: 'border-box',
  },
  finder: {
    width:  FINDER,
    height: FINDER,
    border: `2px solid ${Colors.info}`,
    borderRadius: 16,
  },
  hint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: 500,
    margin: 0,
    textAlign: 'center',
  },
  startBtn: {
    background: Colors.info,
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    padding: '16px 32px',
    fontSize: 17,
    fontWeight: 700,
    cursor: 'pointer',
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
