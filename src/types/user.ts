export interface UserProfile {
  id: string;
  name: string | null;
  created_at: string;
}

export interface UserAllergen {
  id: string;
  user_id: string;
  allergen_tag: string; // matches OFFProduct.allergens_tags format: "en:gluten"
}
