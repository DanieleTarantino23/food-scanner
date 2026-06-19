import React, { useRef, useState, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  paused?: boolean;
}

const SCAN_COOLDOWN_MS = 2000;

export function BarcodeScanner({ onScan, paused = false }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const lastScanRef = useRef<number>(0);

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (paused) return;

      const now = Date.now();
      if (now - lastScanRef.current < SCAN_COOLDOWN_MS) return;
      lastScanRef.current = now;

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onScan(data);
    },
    [paused, onScan]
  );

  if (!permission) return <View style={styles.fill} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access required to scan barcodes.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow Camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <CameraView
      style={styles.fill}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
      onBarcodeScanned={handleBarcodeScanned}
    >
      {/* Viewfinder overlay */}
      <View style={styles.overlay}>
        <View style={styles.viewfinder} />
      </View>
    </CameraView>
  );
}

const FINDER_SIZE = 260;

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  overlay: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width:        FINDER_SIZE,
    height:       FINDER_SIZE,
    borderRadius: 16,
    borderWidth:  2,
    borderColor:  Colors.info,
    backgroundColor: 'transparent',
  },
  permissionContainer: {
    flex:            1,
    backgroundColor: Colors.bg,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             16,
    padding:         32,
  },
  permissionText: {
    color:     Colors.textSecondary,
    fontSize:  15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.info,
    paddingVertical:   12,
    paddingHorizontal: 24,
    borderRadius:      12,
  },
  buttonText: {
    color:      Colors.textPrimary,
    fontWeight: '600',
    fontSize:   15,
  },
});
