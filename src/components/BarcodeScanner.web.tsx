// @ts-nocheck
// Web-only — uses HTML directly
import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Colors } from '../constants/colors';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  paused?: boolean;
}

const SCAN_COOLDOWN_MS = 2000;
const FINDER = 260;

export function BarcodeScanner({ onScan, paused = false }: BarcodeScannerProps) {
  const videoRef    = useRef(null);
  const readerRef   = useRef(null);
  const streamRef   = useRef(null);
  const fileRef     = useRef(null);
  const lastScanRef = useRef(0);
  const pausedRef   = useRef(paused);
  const onScanRef   = useRef(onScan);

  const [phase, setPhase]     = useState('idle');
  const [errMsg, setErrMsg]   = useState('');
  const [photoErr, setPhotoErr] = useState('');

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => () => {
    readerRef.current?.reset();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  // ── Live camera ────────────────────────────────────────────────────────────
  const startLive = useCallback(async () => {
    setPhase('starting');
    setErrMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = stream;
      // ⚠️ Do NOT call video.play() here.
      // ZXing's decodeFromVideoElementContinuously waits for the 'playing' event
      // via its own canplay → tryPlayVideo → play() chain.
      // If the video is already playing when ZXing attaches the listener,
      // 'playing' never fires again → decoder never starts.

      setPhase('scanning');

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      reader.decodeFromVideoElementContinuously(video, (result) => {
        if (!result) return;
        if (pausedRef.current) return;
        const now = Date.now();
        if (now - lastScanRef.current < SCAN_COOLDOWN_MS) return;
        lastScanRef.current = now;
        onScanRef.current(result.getText());
      }).catch(() => {});
    } catch (err) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      const name = err?.name ?? '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setPhase('denied');
      } else {
        setErrMsg(`${err?.name}: ${err?.message}`);
        setPhase('error');
      }
    }
  }, []);

  // ── Photo fallback (bypasses getUserMedia — always works on iOS) ───────────
  const handlePhoto = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fileRef.current.value = '';
    setPhotoErr('');
    try {
      const url = URL.createObjectURL(file);
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(url);
      URL.revokeObjectURL(url);
      if (pausedRef.current) return;
      const now = Date.now();
      if (now - lastScanRef.current < SCAN_COOLDOWN_MS) return;
      lastScanRef.current = now;
      onScanRef.current(result.getText());
    } catch {
      setPhotoErr('Nessun codice trovato. Avvicina la camera al barcode e riprova.');
    }
  }, []);

  const triggerPhoto = useCallback(() => fileRef.current?.click(), []);

  const reset = useCallback(() => {
    readerRef.current?.reset();
    streamRef.current?.getTracks().forEach(t => t.stop());
    readerRef.current = null;
    streamRef.current = null;
    setPhase('idle');
    setErrMsg('');
    setPhotoErr('');
  }, []);

  return (
    <div style={s.root}>
      {/* Hidden file input — native iOS camera, no getUserMedia needed */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={handlePhoto} />

      {/* Live video — always in DOM, visibility toggled */}
      <video ref={videoRef} playsInline muted style={{
        ...s.video,
        visibility: phase === 'scanning' || phase === 'starting' ? 'visible' : 'hidden',
      }} />

      {/* ── Idle ── */}
      {phase === 'idle' && (
        <div style={s.center}>
          <div style={s.finder} />
          <button onClick={startLive} style={s.primaryBtn}>📷 Scansiona live</button>
          <button onClick={triggerPhoto} style={s.secondaryBtn}>🖼 Scatta foto al barcode</button>
          {photoErr && <p style={s.photoErr}>{photoErr}</p>}
          <p style={s.hint}>Se la camera non parte, usa "Scatta foto"</p>
        </div>
      )}

      {/* ── Starting ── */}
      {phase === 'starting' && (
        <div style={s.center}>
          <div style={{ ...s.finder, opacity: 0.3 }} />
          <p style={s.hint}>Avvio fotocamera…</p>
        </div>
      )}

      {/* ── Scanning (live) ── */}
      {phase === 'scanning' && (
        <div style={s.overlay}>
          <div style={{ ...s.finder, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }} />
          <p style={s.hint}>Allinea il codice a barre nel riquadro</p>
          <button onClick={triggerPhoto} style={s.ghostBtn}>🖼 Usa foto invece</button>
        </div>
      )}

      {/* ── Denied ── */}
      {phase === 'denied' && (
        <div style={s.center}>
          <div style={s.finder} />
          <p style={{ ...s.hint, color: 'rgba(255,200,100,0.9)' }}>
            Permesso fotocamera negato
          </p>
          <button onClick={triggerPhoto} style={s.primaryBtn}>🖼 Scatta foto al barcode</button>
          {photoErr && <p style={s.photoErr}>{photoErr}</p>}
          <button onClick={reset} style={s.ghostBtn}>← Riprova live</button>
          <p style={{ ...s.hint, fontSize: 11, opacity: 0.45 }}>
            Per live: Safari → AA → Impostazioni sito → Camera → Consenti
          </p>
        </div>
      )}

      {/* ── Error ── */}
      {phase === 'error' && (
        <div style={s.center}>
          <p style={{ ...s.hint, color: '#ff6b6b', fontFamily: 'monospace', fontSize: 12 }}>{errMsg}</p>
          <button onClick={triggerPhoto} style={s.primaryBtn}>🖼 Scatta foto al barcode</button>
          {photoErr && <p style={s.photoErr}>{photoErr}</p>}
          <button onClick={reset} style={s.ghostBtn}>← Riprova</button>
        </div>
      )}
    </div>
  );
}

const s = {
  root: { position: 'relative', flex: 1, width: '100%', height: '100%', overflow: 'hidden', background: '#000' },
  video: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 },
  overlay: {
    position: 'absolute', inset: 0, zIndex: 1,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
  },
  center: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 16, padding: 32, boxSizing: 'border-box',
  },
  finder: { width: FINDER, height: FINDER, border: `2px solid ${Colors.info}`, borderRadius: 16, flexShrink: 0 },
  hint: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 500, margin: 0, textAlign: 'center' },
  photoErr: { color: '#ff6b6b', fontSize: 13, margin: 0, textAlign: 'center', maxWidth: 280 },
  primaryBtn: {
    background: Colors.info, color: '#fff', border: 'none',
    borderRadius: 14, padding: '15px 28px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
    width: '100%', maxWidth: 280,
  },
  secondaryBtn: {
    background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 14, padding: '13px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
    width: '100%', maxWidth: 280,
  },
  ghostBtn: { background: 'transparent', color: 'rgba(255,255,255,0.45)', border: 'none', padding: '8px 16px', fontSize: 13, cursor: 'pointer' },
};
