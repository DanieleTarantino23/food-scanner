import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import type { OFFProduct } from '../types/product';

// Returns the intersecting allergen tags, or [] if safe.
// Caller is responsible for interrupting navigation if the array is non-empty.
export async function checkAllergens(
  product: OFFProduct,
  userId: string
): Promise<string[]> {
  const productAllergens = product.allergens_tags ?? [];
  if (productAllergens.length === 0) return [];

  const { data, error } = await supabase
    .from('user_allergens')
    .select('allergen_tag')
    .eq('user_id', userId)
    .in('allergen_tag', productAllergens);

  if (error || !data || data.length === 0) return [];
  return data.map((r) => r.allergen_tag);
}

// Fires a synchronous haptic error pattern + red Alert.
// Must be called from a React component/screen context.
export async function triggerAllergenAlert(matches: string[]): Promise<void> {
  // Synchronous vibration error pattern (buzz–pause–buzz–pause–buzz)
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

  const tags = matches.join(', ');
  Alert.alert(
    '⚠️ Allergen Warning',
    `This product contains allergens matching your profile:\n\n${tags}`,
    [{ text: 'OK', style: 'destructive' }],
    { cancelable: false }
  );
}
