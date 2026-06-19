// @ts-nocheck
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
  const lastScanRef = useRef(0);
  const pausedRef   = useRef(paused);
  const onScanRef   = useRef(onScan);

  const [log, setLog]   = useState([]);
  const [phase, setPhase] = useState('idle');

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => () => {
    readerRef.current?.reset();
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const addLog = (msg) => setLog(l => [...l, msg]);

  const startCamera = useCallback(async () => {
    setLog([]);
    setPhase('starting');

    addLog(`protocol: ${location.protocol}`);
    addLog(`mediaDevices: ${!!navigator.mediaDevices}`);
    addLog(`getUserMedia: ${!!(navigator.mediaDevices?.getUserMedia)}`);

    if (!navigator.mediaDevices?.getUserMedia) {
      addLog('❌ getUserMedia non disponibile');
      setPhase('error');
      return;
    }

    addLog('⏳ Chiamando getUserMedia...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      addLog(`✅ Stream ottenuto: ${stream.getVideoTracks().length} track`);
      streamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = stream;
      addLog('⏳ video.play()...');
      await video.play();
      addLog('✅ Video in play');
      setPhase('scanning');

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      addLog('⏳ ZXing avviato...');
      reader.decodeFromVideoElementContinuously(video, (result) => {
        if (!result) return;
        if (pausedRef.current) return;
        const now = Date.now();
        if (now - lastScanRef.current < SCAN_COOLDOWN_MS) return;
        lastScanRef.current = now;
        onScanRef.current(result.getText());
      });
    } catch (err) {
      addLog(`❌ ${err?.name}: ${err?.message}`);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        addLog('→ Permesso negato. Vai in Impostazioni → Safari → Camera');
        setPhase('denied');
      } else {
        setPhase('error');
      }
    }
  }, []);

  const reset = useCallback(() => {
    readerRef.current?.reset();
    streamRef.current?.getTracks().forEach(t => t.stop());
    readerRef.current = null;
    streamRef.current = null;
    setLog([]);
    setPhase('idle');
  }, []);

  return (
    <div style={{ position: 'relative', flex: 1, width: '100%', height: '100%', overflow: 'hidden', background: '#000' }}>
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          visibility: phase === 'scanning' ? 'visible' : 'hidden',
        }}
      />

      {/* Debug log — mostra sempre se ci sono messaggi */}
      {log.length > 0 && (
        <div style={{
          position: 'absolute', top: 16, left: 16, right: 16, zIndex: 99,
          background: 'rgba(0,0,0,0.85)', borderRadius: 10, padding: 12,
          fontFamily: 'monospace', fontSize: 12, color: '#0f0', lineHeight: 1.6,
        }}>
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      {phase === 'idle' && (
        <div style={s.center}>
          <div style={s.finder} />
          <button onClick={startCamera} style={s.btn}>📷 Avvia scanner</button>
          <p style={s.hint}>Tocca per attivare la fotocamera</p>
        </div>
      )}

      {(phase === 'starting' || phase === 'error' || phase === 'denied') && (
        <div style={s.center}>
          <div style={{ ...s.finder, opacity: 0.3 }} />
          {phase === 'starting' && <p style={s.hint}>Caricamento…</p>}
          {(phase === 'error' || phase === 'denied') && (
            <button onClick={reset} style={{ ...s.btn, background: '#444' }}>Riprova</button>
          )}
        </div>
      )}

      {phase === 'scanning' && (
        <div style={s.overlay}>
          <div style={{ ...s.finder, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }} />
          <p style={s.hint}>Allinea il codice a barre nel riquadro</p>
        </div>
      )}
    </div>
  );
}

const s = {
  center: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 24, padding: 32, boxSizing: 'border-box',
  },
  overlay: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 20, zIndex: 1,
  },
  finder: {
    width: FINDER, height: FINDER,
    border: `2px solid ${Colors.info}`, borderRadius: 16, flexShrink: 0,
  },
  hint: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: 500, margin: 0, textAlign: 'center' },
  btn: {
    background: Colors.info, color: '#fff', border: 'none',
    borderRadius: 14, padding: '16px 32px', fontSize: 17, fontWeight: 700, cursor: 'pointer',
  },
};
