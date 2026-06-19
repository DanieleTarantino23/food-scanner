import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Alert } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { Colors } from '../../src/constants/colors';
import type { UserAllergen } from '../../src/types/user';

// Common allergen suggestions (OFF tag format)
const COMMON_ALLERGENS = [
  'en:gluten', 'en:milk', 'en:eggs', 'en:nuts',
  'en:peanuts', 'en:soy', 'en:fish', 'en:shellfish',
  'en:sesame', 'en:celery', 'en:mustard', 'en:sulphites',
];

export default function ProfileScreen() {
  const [userId,    setUserId]    = useState<string | null>(null);
  const [allergens, setAllergens] = useState<UserAllergen[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      if (uid) fetchAllergens(uid);
      else setLoading(false);
    });
  }, []);

  async function fetchAllergens(uid: string) {
    const { data } = await supabase
      .from('user_allergens')
      .select('*')
      .eq('user_id', uid);
    setAllergens(data ?? []);
    setLoading(false);
  }

  async function addAllergen(tag: string) {
    if (!userId) return;
    if (allergens.some((a) => a.allergen_tag === tag)) return;

    const { data, error } = await supabase
      .from('user_allergens')
      .insert({ user_id: userId, allergen_tag: tag })
      .select()
      .single();

    if (!error && data) {
      setAllergens((prev) => [...prev, data]);
    }
  }

  async function removeAllergen(id: string) {
    const { error } = await supabase
      .from('user_allergens')
      .delete()
      .eq('id', id);

    if (!error) {
      setAllergens((prev) => prev.filter((a) => a.id !== id));
    }
  }

  const activeTagSet = new Set(allergens.map((a) => a.allergen_tag));

  if (!userId) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Sign in to manage your allergen profile.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>MY ALLERGENS</Text>

      {/* Active allergens */}
      {allergens.length > 0 && (
        <View style={styles.activeList}>
          {allergens.map((item) => (
            <Pressable
              key={item.id}
              style={styles.activeChip}
              onPress={() => {
                Alert.alert(
                  'Remove allergen?',
                  item.allergen_tag.replace('en:', ''),
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeAllergen(item.id) },
                  ]
                );
              }}
            >
              <Text style={styles.activeChipText}>
                {item.allergen_tag.replace('en:', '')} ✕
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>ADD ALLERGEN</Text>

      {/* Quick-add suggestions */}
      <View style={styles.suggestions}>
        {COMMON_ALLERGENS.map((tag) => {
          const active = activeTagSet.has(tag);
          return (
            <Pressable
              key={tag}
              style={[styles.suggestionChip, active && styles.suggestionChipActive]}
              onPress={() => !active && addAllergen(tag)}
              disabled={active}
            >
              <Text
                style={[styles.suggestionText, active && styles.suggestionTextActive]}
              >
                {tag.replace('en:', '')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg, padding: 20, gap: 12 },
  center:     { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  empty:      { color: Colors.textTertiary, fontSize: 15 },
  sectionTitle: {
    color:          Colors.textTertiary,
    fontSize:       11,
    fontWeight:     '600',
    textTransform:  'uppercase',
    letterSpacing:  0.8,
    marginTop:      8,
  },
  activeList:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activeChip: {
    backgroundColor: Colors.error + '22',
    borderColor:     Colors.error,
    borderWidth:     1,
    borderRadius:    20,
    paddingVertical:   8,
    paddingHorizontal: 14,
  },
  activeChipText: { color: Colors.error, fontWeight: '600', fontSize: 13 },
  suggestions:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: {
    backgroundColor: Colors.bgCard,
    borderColor:     Colors.border,
    borderWidth:     1,
    borderRadius:    20,
    paddingVertical:   8,
    paddingHorizontal: 14,
  },
  suggestionChipActive: {
    backgroundColor: Colors.bgElevated,
    borderColor:     Colors.textTertiary,
  },
  suggestionText:       { color: Colors.textSecondary, fontSize: 13 },
  suggestionTextActive: { color: Colors.textTertiary },
});
