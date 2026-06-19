import { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet,
  ActivityIndicator, Image,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { ScoreRing } from '../../src/components/ScoreRing';
import { getProduct } from '../../src/lib/lookup';
import { scoreProduct } from '../../src/lib/scoring';
import { scoreColor, Colors } from '../../src/constants/colors';
import type { OFFProduct } from '../../src/types/product';
import type { ScoringResult } from '../../src/types/scoring';

export default function ProductDetailScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const navigation  = useNavigation();

  const [product, setProduct] = useState<OFFProduct | null>(null);
  const [scoring, setScoring] = useState<ScoringResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!barcode) return;
    getProduct(barcode).then((result) => {
      if (result) {
        setProduct(result.product);
        setScoring(scoreProduct(result.product));
        navigation.setOptions({ title: result.product.product_name ?? barcode });
      }
      setLoading(false);
    });
  }, [barcode]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.info} size="large" />
      </View>
    );
  }

  if (!product || !scoring) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Product data unavailable.</Text>
      </View>
    );
  }

  const { healthScore, proteinScore } = scoring;
  const n = product.nutriments ?? {};

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

      {/* ── Hero image ── */}
      {product.image_front_url ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.image_front_url }}
            style={styles.productImage}
            resizeMode="contain"
          />
        </View>
      ) : null}

      {/* ── Score header ── */}
      <View style={styles.header}>
        <ScoreRing score={healthScore.total} size={140} strokeWidth={12} />
        <Text style={styles.productName}>
          {product.product_name ?? 'Unknown'}
        </Text>
        {(product.brands || product.quantity) ? (
          <Text style={styles.meta}>
            {[product.brands, product.quantity].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        {product.nutriscore_grade ? (
          <View style={[styles.nutriBadge,
            { borderColor: scoreColor(healthScore.total) }]}>
            <Text style={[styles.nutriBadgeText,
              { color: scoreColor(healthScore.total) }]}>
              Nutri-Score {product.nutriscore_grade.toUpperCase()}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Score breakdown ── */}
      <Section title="Score breakdown">
        <Row label="Nutri-Score"  value={`${healthScore.nutriScoreComponent.toFixed(0)} / 60`} />
        <Row label="Additives"    value={`${healthScore.additiveComponent.toFixed(0)} / 30`} />
        <Row label="Organic"      value={`+${healthScore.organicBonus}`} />
      </Section>

      {/* ── Protein badge ── */}
      <Section title="Proteins">
        <Row label="g / 100g" value={`${proteinScore.gramsPerHundred.toFixed(1)} g`} />
        {proteinScore.caloriePct !== null && (
          <Row label="% of calories" value={`${proteinScore.caloriePct.toFixed(0)}%`} />
        )}
        {proteinScore.isExcellent && (
          <View style={styles.excellentBadge}>
            <Text style={styles.excellentText}>⚡ Excellent protein source</Text>
          </View>
        )}
      </Section>

      {/* ── Nutrition / 100g ── */}
      <Section title="Nutrition / 100g">
        {n.energy_kcal_100g   != null && <Row label="Energy"        value={`${n.energy_kcal_100g} kcal`} />}
        {n.fat_100g           != null && <Row label="Fat"           value={`${n.fat_100g} g`} />}
        {n.saturated_fat_100g != null && <Row label="Saturated fat" value={`${n.saturated_fat_100g} g`} highlight />}
        {n.carbohydrates_100g != null && <Row label="Carbs"         value={`${n.carbohydrates_100g} g`} />}
        {n.sugars_100g        != null && <Row label="Sugars"        value={`${n.sugars_100g} g`} highlight />}
        {n.fiber_100g         != null && <Row label="Fiber"         value={`${n.fiber_100g} g`} />}
        {n.proteins_100g      != null && <Row label="Proteins"      value={`${n.proteins_100g} g`} />}
        {n.salt_100g          != null && <Row label="Salt"          value={`${n.salt_100g} g`} highlight />}
      </Section>

      {/* ── Additives ── */}
      {product.additives_tags && product.additives_tags.length > 0 && (
        <Section title={`Additives (${product.additives_tags.length})`}>
          {product.additives_tags.map((tag) => (
            <View key={tag} style={styles.additiveRow}>
              <Text style={styles.additiveTag}>
                {tag.replace('en:', '').toUpperCase()}
              </Text>
            </View>
          ))}
        </Section>
      )}

      {/* ── Allergens ── */}
      {product.allergens_tags && product.allergens_tags.length > 0 && (
        <Section title="Allergens">
          <Text style={styles.allergenText}>
            {product.allergens_tags.map((t) => t.replace('en:', '')).join(' · ')}
          </Text>
        </Section>
      )}

    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ label, value, highlight = false }: {
  label: string; value: string; highlight?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, highlight && styles.rowLabelHl]}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHl]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: Colors.bg },
  content:  { paddingBottom: 48, gap: 24 },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  empty:    { color: Colors.textTertiary, fontSize: 15 },

  imageContainer: {
    width: '100%',
    height: 260,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '80%',
    height: '90%',
  },

  header:      { alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 20 },
  productName: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  meta:        { color: Colors.textTertiary, fontSize: 13, textAlign: 'center' },
  nutriBadge:  {
    borderWidth: 1, borderRadius: 8,
    paddingVertical: 4, paddingHorizontal: 12,
  },
  nutriBadgeText: { fontWeight: '700', fontSize: 13 },

  section:      { gap: 8, paddingHorizontal: 20 },
  sectionTitle: {
    color: Colors.textTertiary, fontSize: 11, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  card:         { backgroundColor: Colors.bgCard, borderRadius: 16, overflow: 'hidden' },

  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  rowLabel:    { color: Colors.textSecondary, fontSize: 15 },
  rowLabelHl:  { color: Colors.textPrimary },
  rowValue:    { color: Colors.textPrimary, fontWeight: '500', fontSize: 15 },
  rowValueHl:  { color: Colors.warning },

  excellentBadge: {
    margin: 12, backgroundColor: Colors.bgElevated,
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  excellentText: { color: Colors.success, fontWeight: '600', fontSize: 14 },

  additiveRow: {
    paddingVertical: 10, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  additiveTag:   { color: Colors.warning, fontWeight: '600', fontSize: 14 },
  allergenText:  { color: Colors.error, fontSize: 14, padding: 16, lineHeight: 22 },
});
