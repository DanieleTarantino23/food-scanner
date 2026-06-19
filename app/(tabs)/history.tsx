import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useFocusEffect } from 'expo-router';
import { getHistory, clearHistory, type HistoryEntry } from '../../src/lib/scanHistory';
import { scoreColor, Colors } from '../../src/constants/colors';

export default function HistoryScreen() {
  const router  = useRouter();
  const [items, setItems]   = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Reload every time the tab is focused (new scans show up immediately)
  useFocusEffect(
    useCallback(() => {
      getHistory().then((h) => { setItems(h); setLoading(false); });
    }, [])
  );

  function confirmClear() {
    Alert.alert('Clear history?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: async () => { await clearHistory(); setItems([]); },
      },
    ]);
  }

  if (!loading && items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>⬛</Text>
        <Text style={styles.emptyTitle}>No scans yet</Text>
        <Text style={styles.emptyHint}>Scan a barcode to get started.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>History</Text>
        {items.length > 0 && (
          <Pressable onPress={confirmClear}>
            <Text style={styles.clearBtn}>Clear</Text>
          </Pressable>
        )}
      </View>

      <FlashList
        data={items}
        keyExtractor={(item) => item.barcode + item.scannedAt}
        estimatedItemSize={72}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/product/${item.barcode}`)}
          >
            <View style={[styles.scoreDot, { backgroundColor: scoreColor(item.healthScore) }]} />
            <View style={styles.rowInfo}>
              <Text style={styles.rowName} numberOfLines={1}>{item.productName}</Text>
              <Text style={styles.rowMeta}>
                {item.nutriScore ? `Nutri-Score ${item.nutriScore} · ` : ''}
                {new Date(item.scannedAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={[styles.rowScore, { color: scoreColor(item.healthScore) }]}>
              {item.healthScore}
            </Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: 20,
    paddingTop:     56,
    paddingBottom:  16,
  },
  heading:  { color: Colors.textPrimary, fontSize: 28, fontWeight: '700' },
  clearBtn: { color: Colors.error, fontSize: 15 },

  row: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 14,
    gap:            14,
  },
  scoreDot: { width: 10, height: 10, borderRadius: 5 },
  rowInfo:  { flex: 1, gap: 3 },
  rowName:  { color: Colors.textPrimary, fontSize: 15, fontWeight: '500' },
  rowMeta:  { color: Colors.textTertiary, fontSize: 12 },
  rowScore: { fontSize: 17, fontWeight: '700' },
  separator:{ height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },

  empty: {
    flex: 1, backgroundColor: Colors.bg,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  emptyIcon:  { fontSize: 40, marginBottom: 8 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '600' },
  emptyHint:  { color: Colors.textTertiary, fontSize: 14 },
});
