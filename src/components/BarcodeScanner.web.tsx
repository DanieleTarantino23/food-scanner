import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Colors } from '../constants/colors';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  paused?: boolean;
}

const SCAN_COOLDOWN_MS = 2000;
const FINDER_SIZE = 260;

export function BarcodeScanner({ onScan, paused = false }: BarcodeScannerProps) {
  const containerRef = useRef<View>(null);
  const lastScanRef  = useRef(0);
  // Keep latest values in refs so the ZXing callback never goes stale
  const pausedRef = useRef(paused);
  const onScanRef = useRef(onScan);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    const domNode = containerRef.current as unknown as HTMLDivElement;
    if (!domNode) return;

    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;';
    domNode.appendChild(video);

    const reader = new BrowserMultiFormatReader();

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
      .catch(() => {});

    return () => {
      reader.reset();
      video.remove();
    };
  }, []);

  return (
    <View ref={containerRef} style={styles.container}>
      {/* viewfinder overlay sits above the imperatively-mounted video */}
      <View style={styles.overlay}>
        <View style={styles.viewfinder} />
        <Text style={styles.hint}>Allinea il codice a barre nel riquadro</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems:     'center',
    justifyContent: 'center',
    gap: 20,
    zIndex: 1,
  },
  viewfinder: {
    width:        FINDER_SIZE,
    height:       FINDER_SIZE,
    borderRadius: 16,
    borderWidth:  2,
    borderColor:  Colors.info,
    backgroundColor: 'transparent',
  },
  hint: {
    color:      'rgba(255,255,255,0.7)',
    fontSize:   13,
    fontWeight: '500',
  },
});
