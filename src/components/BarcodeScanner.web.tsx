// @ts-nocheck
// Web-only barcode scanner. Raw HTML, not React Native primitives.
//
// PRIMARY path = photo capture via <input capture="environment">.
// This opens the native iOS/Android camera directly and does NOT use
// getUserMedia, so it can never be "permission denied" and works in every
// browser (including in-app WebViews). Live camera is a secondary option.
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  BrowserMultiFormatReader,
  DecodeHintType,
  BarcodeFormat,
} from '@zxing/library';
import { Colors } from '../constants/colors';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  paused?: boolean;
}

const SCAN_COOLDOWN_MS = 2000;
const FINDER = 260;

// Retail barcodes + TRY_HARDER → best hit-rate on a photo
const HINTS = new Map();
HINTS.set(DecodeHintType.TRY_HARDER, true);
HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
]);

export function BarcodeScanner({ onScan, paused = false }: BarcodeScannerProps) {
  const videoRef    = useRef(null);
  const liveReader  = useRef(null);
  const fileRef     = useRef(null);
  const lastScanRef = useRef(0);
  const pausedRef   = useRef(paused);
  const onScanRef   = useRef(onScan);

  const [mode, setMode]   = useState('idle');   // idle | analyzing | live | liveDenied | liveErr
  const [msg, setMsg]     = useState('');       // status / error message under buttons
  const [errMsg, setErr]  = useState('');

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => () => { liveReader.current?.reset(); }, []);

  const fireScan = useCallback((text) => {
    if (pausedRef.current) return;
    const now = Date.now();
    if (now - lastScanRef.current < SCAN_COOLDOWN_MS) return;
    lastScanRef.current = now;
    onScanRef.current(text);
  }, []);

  // ── PRIMARY: photo capture (native camera, no permission to deny) ──────────
  const handlePhoto = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fileRef.current.value = '';
    setMode('analyzing');
    setMsg('');
    const url = URL.createObjectURL(file);
    try {
      const result = await new BrowserMultiFormatReader(HINTS).decodeFromImageUrl(url);
      fireScan(result.getText());
      setMode('idle');
    } catch {
      setMode('idle');
      setMsg('Nessun codice letto. Inquadra il barcode da vicino, ben dritto e a fuoco, poi riprova.');
    } finally {
      URL.revokeObjectURL(url);
    }
  }, [fireScan]);

  const takePhoto = useCallback(() => { setMsg(''); fileRef.current?.click(); }, []);

  // ── SECONDARY: live camera (getUserMedia, can be denied on iOS) ────────────
  const startLive = useCallback(async () => {
    setMode('live');
    setMsg('');
    setErr('');
    const reader = new BrowserMultiFormatReader(HINTS);
    liveReader.current = reader;
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
        setMode('liveDenied');
      } else {
        setErr(`${name}: ${err?.message ?? ''}`);
        setMode('liveErr');
      }
    }
  }, [fireScan]);

  const stopLive = useCallback(() => {
    liveReader.current?.reset();
    liveReader.current = null;
    setMode('idle');
  }, []);

  const showVideo = mode === 'live';

  return (
    <div style={s.root}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={handlePhoto} />

      <video ref={videoRef} playsInline muted autoPlay
        style={{ ...s.video, visibility: showVideo ? 'visible' : 'hidden' }} />

      {/* ── IDLE — photo is the main action ── */}
      {(mode === 'idle' || mode === 'analyzing') && (
        <div style={s.center}>
          <div style={s.finder} />
          <button onClick={takePhoto} style={s.primaryBtn} disabled={mode === 'analyzing'}>
            {mode === 'analyzing' ? '⏳ Analisi…' : '📷 Scansiona prodotto'}
          </button>
          {msg && <p style={s.warn}>{msg}</p>}
          <button onClick={startLive} style={s.linkBtn}>oppure usa la camera live →</button>
        </div>
      )}

      {/* ── LIVE scanning ── */}
      {mode === 'live' && (
        <div style={s.overlay}>
          <div style={{ ...s.finder, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />
          <p style={s.hint}>Inquadra il codice a barre</p>
          <button onClick={stopLive} style={s.linkBtn}>← torna allo scatto foto</button>
        </div>
      )}

      {/* ── LIVE denied → fall back to photo ── */}
      {(mode === 'liveDenied' || mode === 'liveErr') && (
        <div style={s.center}>
          <div style={s.finder} />
          {mode === 'liveErr'
            ? <p style={{ ...s.warn, fontFamily: 'monospace', fontSize: 12 }}>{errMsg}</p>
            : <p style={s.warn}>Camera live bloccata da Safari. Usa lo scatto foto qui sotto (funziona sempre).</p>}
          <button onClick={takePhoto} style={s.primaryBtn}>📷 Scansiona prodotto</button>
          {msg && <p style={s.warn}>{msg}</p>}
          <button onClick={stopLive} style={s.linkBtn}>← indietro</button>
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
    gap: 18, padding: 32, boxSizing: 'border-box',
  },
  finder: { width: FINDER, height: FINDER, border: `2px solid ${Colors.info}`, borderRadius: 16, flexShrink: 0 },
  hint: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500, margin: 0, textAlign: 'center' },
  warn: { color: 'rgba(255,200,100,0.95)', fontSize: 13, margin: 0, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 },
  primaryBtn: {
    background: Colors.info, color: '#fff', border: 'none',
    borderRadius: 14, padding: '16px 28px', fontSize: 17, fontWeight: 700, cursor: 'pointer',
    width: '100%', maxWidth: 300,
  },
  linkBtn: { background: 'transparent', color: 'rgba(255,255,255,0.55)', border: 'none', padding: '6px', fontSize: 13, cursor: 'pointer' },
};
