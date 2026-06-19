import { useCallback, useRef, useState } from 'react';
import {
  StyleSheet, View, Text, Pressable,
  TextInput, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { BarcodeScanner } from '../../src/components/BarcodeScanner';
import { ScoreRing } from '../../src/components/ScoreRing';
import { useProductScan } from '../../src/hooks/useProductScan';
import { scoreColor, Colors } from '../../src/constants/colors';

const MOCK_USER_ID = undefined;

// Real barcodes from Open Food Facts — used for demo / web preview
const DEMO_PRODUCTS = [
  { label: 'Nutella 400g',       barcode: '3017620422003' },
  { label: 'Coca-Cola 33cl',     barcode: '5449000000996' },
  { label: 'Kinder Bueno',       barcode: '8000500131480' },
  { label: 'Red Bull 250ml',     barcode: '9002490100070' },
  { label: 'Activia Yogurt',     barcode: '3033490004906' },
  { label: 'Haribo Gold-Bears',  barcode: '4001686323403' },
  { label: 'Evian 1.5L',         barcode: '3068320113530' },
  { label: 'Lay\'s Original',    barcode: '5053990102570' },
];

const isWeb = Platform.OS === 'web';

export default function ScannerScreen() {
  const router  = useRouter();
  const sheet   = useRef<BottomSheet>(null);
  const { state, scan, reset } = useProductScan({ userId: MOCK_USER_ID });

  const [manualBarcode, setManualBarcode] = useState('');

  const handleScan = useCallback(async (barcode: string) => {
    sheet.current?.snapToIndex(0);
    await scan(barcode);
  }, [scan]);

  const handleManualSubmit = useCallback(() => {
    const code = manualBarcode.trim();
    if (code.length < 4) return;
    setManualBarcode('');
    handleScan(code);
  }, [manualBarcode, handleScan]);

  const isLoading  = state.status === 'loading';
  const isFound    = state.status === 'found';
  const isNotFound = state.status === 'not_found';

  return (
    <View style={styles.container}>

      {/* ── Camera scanner (native only) ── */}
      {!isWeb && (
        <BarcodeScanner onScan={handleScan} paused={isLoading || isFound} />
      )}

      {/* ── Web / manual mode ── */}
      {isWeb && (
        <View style={styles.webPanel}>
          <Text style={styles.webTitle}>Product Lookup</Text>
          <Text style={styles.webSubtitle}>Enter a barcode or tap a demo product</Text>

          {/* Manual barcode input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.barcodeInput}
              placeholder="e.g. 3017620422003"
              placeholderTextColor={Colors.textTertiary}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              keyboardType="number-pad"
              returnKeyType="search"
              onSubmitEditing={handleManualSubmit}
            />
            <Pressable
              style={[styles.searchBtn, !manualBarcode.trim() && styles.searchBtnDisabled]}
              onPress={handleManualSubmit}
              disabled={!manualBarcode.trim() || isLoading}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.searchBtnText}>Search</Text>
              }
            </Pressable>
          </View>

          {/* Demo shortcuts */}
          <Text style={styles.demoLabel}>Demo products</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.demoRow}
          >
            {DEMO_PRODUCTS.map((p) => (
              <Pressable
                key={p.barcode}
                style={styles.demoChip}
                onPress={() => handleScan(p.barcode)}
                disabled={isLoading}
              >
                <Text style={styles.demoChipText}>{p.label}</Text>
                <Text style={styles.demoChipCode}>{p.barcode}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Loading overlay ── */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.info} size="large" />
          <Text style={styles.loadingText}>Looking up product…</Text>
        </View>
      )}

      {/* ── Not found ── */}
      {isNotFound && (
        <View style={styles.notFoundBanner}>
          <Text style={styles.notFoundText}>Product not found in any database.</Text>
          <Pressable
            style={styles.aiButton}
            onPress={() => router.push(`/scan/capture?barcode=${(state as { barcode: string }).barcode}`)}
          >
            <Text style={styles.aiButtonText}>Scan with AI Vision →</Text>
          </Pressable>
          <Pressable onPress={reset} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {/* ── Result bottom sheet ── */}
      <BottomSheet
        ref={sheet}
        index={-1}
        snapPoints={isWeb ? ['55%', '90%'] : ['45%', '85%']}
        enablePanDownToClose
        onClose={reset}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetView style={styles.sheetContent}>
          {isFound && (
            <>
              <View style={styles.scoreRow}>
                <ScoreRing score={state.scoring.healthScore.total} size={110} />
                <View style={styles.scoreLabels}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {state.product.product_name ?? 'Unknown product'}
                  </Text>
                  {state.product.nutriscore_grade && (
                    <View style={[styles.nutriBadge,
                      { borderColor: scoreColor(state.scoring.healthScore.total) }]}>
                      <Text style={[styles.nutriBadgeText,
                        { color: scoreColor(state.scoring.healthScore.total) }]}>
                        Nutri-Score {state.product.nutriscore_grade.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {state.scoring.proteinScore.isExcellent && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>⚡ High Protein</Text>
                    </View>
                  )}
                  <Text style={styles.sourceLabel}>
                    via {state.source === 'off' ? 'Open Food Facts' : state.source}
                  </Text>
                </View>
              </View>

              {/* Score breakdown pills */}
              <View style={styles.breakdownRow}>
                <BreakdownPill
                  label="Nutri-Score"
                  value={`${state.scoring.healthScore.nutriScoreComponent.toFixed(0)}/60`}
                />
                <BreakdownPill
                  label="Additives"
                  value={`${state.scoring.healthScore.additiveComponent.toFixed(0)}/30`}
                />
                <BreakdownPill
                  label="Organic"
                  value={`+${state.scoring.healthScore.organicBonus}`}
                />
              </View>

              <Pressable
                style={styles.detailButton}
                onPress={() => router.push(`/product/${state.product.code ?? ''}`)}
              >
                <Text style={styles.detailButtonText}>View full analysis →</Text>
              </Pressable>
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

function BreakdownPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={pillStyles.pill}>
      <Text style={pillStyles.value}>{value}</Text>
      <Text style={pillStyles.label}>{label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    flex: 1, backgroundColor: Colors.bgElevated,
    borderRadius: 12, paddingVertical: 10, alignItems: 'center', gap: 2,
  },
  value: { color: Colors.textPrimary, fontWeight: '700', fontSize: 15 },
  label: { color: Colors.textTertiary, fontSize: 11 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  // ── Web panel ──────────────────────────────────────────────────────────────
  webPanel: {
    flex: 1, padding: 24, paddingTop: 64, gap: 16,
  },
  webTitle:    { color: Colors.textPrimary, fontSize: 28, fontWeight: '700' },
  webSubtitle: { color: Colors.textSecondary, fontSize: 15, marginBottom: 4 },

  inputRow:    { flexDirection: 'row', gap: 10 },
  barcodeInput: {
    flex: 1,
    backgroundColor:   Colors.bgInput,
    borderRadius:      14,
    paddingVertical:   14,
    paddingHorizontal: 16,
    color:             Colors.textPrimary,
    fontSize:          16,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  searchBtn: {
    backgroundColor: Colors.info,
    borderRadius:    14,
    paddingHorizontal: 20,
    justifyContent:  'center',
  },
  searchBtnDisabled: { opacity: 0.4 },
  searchBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },

  demoLabel: {
    color: Colors.textTertiary, fontSize: 12,
    fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 8,
  },
  demoRow: { gap: 10, paddingBottom: 4 },
  demoChip: {
    backgroundColor: Colors.bgCard,
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     Colors.border,
    paddingVertical:   12,
    paddingHorizontal: 16,
    minWidth:          140,
    gap:               4,
  },
  demoChipText: { color: Colors.textPrimary, fontWeight: '600', fontSize: 14 },
  demoChipCode: { color: Colors.textTertiary, fontSize: 11 },

  // ── Overlays ───────────────────────────────────────────────────────────────
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,14,16,0.75)',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { color: Colors.textSecondary, fontSize: 15 },

  notFoundBanner: {
    position: 'absolute', bottom: 120, left: 24, right: 24,
    backgroundColor: Colors.bgCard, borderRadius: 20,
    padding: 24, gap: 12, borderWidth: 1, borderColor: Colors.border,
  },
  notFoundText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
  aiButton: {
    backgroundColor: Colors.info, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  aiButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  dismissBtn:   { alignItems: 'center' },
  dismissText:  { color: Colors.textTertiary, fontSize: 13 },

  // ── Bottom sheet ───────────────────────────────────────────────────────────
  sheetBg:     { backgroundColor: Colors.bgCard },
  sheetHandle: { backgroundColor: Colors.border },
  sheetContent: { padding: 20, gap: 16 },

  scoreRow:    { flexDirection: 'row', gap: 16, alignItems: 'center' },
  scoreLabels: { flex: 1, gap: 8 },
  productName: { color: Colors.textPrimary, fontSize: 17, fontWeight: '700', lineHeight: 22 },

  nutriBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: 8,
    paddingVertical: 3, paddingHorizontal: 10,
  },
  nutriBadgeText: { fontWeight: '700', fontSize: 12 },

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.bgElevated, borderRadius: 8,
    paddingVertical: 3, paddingHorizontal: 10,
  },
  badgeText:   { color: Colors.success, fontSize: 12, fontWeight: '600' },
  sourceLabel: { color: Colors.textTertiary, fontSize: 11 },

  breakdownRow: { flexDirection: 'row', gap: 8 },

  detailButton: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  detailButtonText: { color: Colors.info, fontWeight: '600', fontSize: 15 },
});
