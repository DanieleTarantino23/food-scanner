// @ts-nocheck
// Web-only barcode scanner. Uses raw HTML, not React Native primitives.
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
  const fileRef     = useRef(null);
  const lastScanRef = useRef(0);
  const pausedRef   = useRef(paused);
  const onScanRef   = useRef(onScan);

  const [phase, setPhase]       = useState('idle');   // idle | scanning | denied | error
  const [errMsg, setErrMsg]     = useState('');
  const [photoErr, setPhotoErr] = useState('');

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  // Stop camera when this component unmounts
  useEffect(() => () => { readerRef.current?.reset(); }, []);

  const fireScan = useCallback((text) => {
    if (pausedRef.current) return;
    const now = Date.now();
    if (now - lastScanRef.current < SCAN_COOLDOWN_MS) return;
    lastScanRef.current = now;
    onScanRef.current(text);
  }, []);

  // ── Live camera ────────────────────────────────────────────────────────────
  // MUST be called from a user gesture (onClick). decodeFromConstraints invokes
  // getUserMedia synchronously as its first op, so the gesture is preserved.
  // The library handles getUserMedia → attach stream → play → decode loop in
  // the correct order — we must NOT touch srcObject or play() ourselves.
  const startLive = useCallback(async () => {
    setErrMsg('');
    setPhotoErr('');
    setPhase('scanning'); // reveal the <video> immediately so the ref is live

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    try {
      await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        videoRef.current,
        (result) => { if (result) fireScan(result.getText()); }
      );
    } catch (err) {
      reader.reset();
      const name = err?.name ?? 'Error';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
        setPhase('denied');
      } else {
        setErrMsg(`${name}: ${err?.message ?? ''}`);
        setPhase('error');
      }
    }
  }, [fireScan]);

  // ── Photo fallback — native iOS camera via file input, no getUserMedia ─────
  const handlePhoto = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fileRef.current.value = '';
    setPhotoErr('');
    const url = URL.createObjectURL(file);
    try {
      const result = await new BrowserMultiFormatReader().decodeFromImageUrl(url);
      fireScan(result.getText());
    } catch {
      setPhotoErr('Nessun codice trovato nella foto. Inquadra bene il barcode e riprova.');
    } finally {
      URL.revokeObjectURL(url);
    }
  }, [fireScan]);

  const triggerPhoto = useCallback(() => fileRef.current?.click(), []);

  const reset = useCallback(() => {
    readerRef.current?.reset();
    readerRef.current = null;
    setErrMsg('');
    setPhotoErr('');
    setPhase('idle');
  }, []);

  return (
    <div style={s.root}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={handlePhoto} />

      {/* Always-mounted video — visibility toggled, so the ref is never lost */}
      <video ref={videoRef} playsInline muted autoPlay
        style={{ ...s.video, visibility: phase === 'scanning' ? 'visible' : 'hidden' }} />

      {/* ── Idle ── */}
      {phase === 'idle' && (
        <div style={s.center}>
          <div style={s.finder} />
          <button onClick={startLive} style={s.primaryBtn}>📷 Avvia scanner</button>
          <button onClick={triggerPhoto} style={s.secondaryBtn}>🖼 Scatta foto al barcode</button>
          {photoErr && <p style={s.photoErr}>{photoErr}</p>}
        </div>
      )}

      {/* ── Scanning ── */}
      {phase === 'scanning' && (
        <div style={s.overlay}>
          <div style={{ ...s.finder, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />
          <p style={s.hint}>Inquadra il codice a barre</p>
          <button onClick={triggerPhoto} style={s.ghostBtn}>🖼 Usa una foto</button>
        </div>
      )}

      {/* ── Denied ── */}
      {phase === 'denied' && (
        <div style={s.center}>
          <div style={s.finder} />
          <p style={{ ...s.hint, color: 'rgba(255,200,100,0.95)', maxWidth: 300 }}>
            Permesso fotocamera negato. Usa "Scatta foto" oppure abilita la camera
            (Safari → <b>AA</b> → Impostazioni sito web → Fotocamera → Consenti).
          </p>
          <button onClick={triggerPhoto} style={s.primaryBtn}>🖼 Scatta foto al barcode</button>
          {photoErr && <p style={s.photoErr}>{photoErr}</p>}
          <button onClick={reset} style={s.ghostBtn}>↻ Riprova live</button>
        </div>
      )}

      {/* ── Error (shows the real reason so we stop guessing) ── */}
      {phase === 'error' && (
        <div style={s.center}>
          <p style={{ ...s.hint, color: '#ff7b7b', fontFamily: 'monospace', fontSize: 12, maxWidth: 320 }}>
            {errMsg}
          </p>
          <button onClick={triggerPhoto} style={s.primaryBtn}>🖼 Scatta foto al barcode</button>
          {photoErr && <p style={s.photoErr}>{photoErr}</p>}
          <button onClick={reset} style={s.ghostBtn}>↻ Riprova</button>
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
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
  },
  center: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 16, padding: 32, boxSizing: 'border-box',
  },
  finder: { width: FINDER, height: FINDER, border: `2px solid ${Colors.info}`, borderRadius: 16, flexShrink: 0 },
  hint: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500, margin: 0, textAlign: 'center' },
  photoErr: { color: '#ff7b7b', fontSize: 13, margin: 0, textAlign: 'center', maxWidth: 300 },
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
  ghostBtn: { background: 'transparent', color: 'rgba(255,255,255,0.5)', border: 'none', padding: '8px 16px', fontSize: 13, cursor: 'pointer' },
};
