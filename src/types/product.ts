// OFF = Open Food Facts v2 schema
export type NutriScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';
export type AdditiveRisk = 'high' | 'medium' | 'low';

export interface OFFIngredient {
  id?: string;           // e.g. "en:sugar"
  text?: string;         // display label
  percent_estimate?: number;
}

export interface OFFNutriments {
  energy_kcal_100g?: number;
  proteins_100g?: number;
  fat_100g?: number;
  saturated_fat_100g?: number;
  carbohydrates_100g?: number;
  sugars_100g?: number;
  fiber_100g?: number;
  salt_100g?: number;
  sodium_100g?: number;
}

export interface OFFProduct {
  code?: string;
  product_name?: string;
  nutriscore_grade?: string;    // lowercase 'a'–'e' from API
  additives_tags?: string[];    // e.g. ["en:e621", "en:e102"]
  ingredients?: OFFIngredient[];
  nutriments?: OFFNutriments;
  labels_tags?: string[];       // e.g. ["en:organic", "fr:bio"]
  allergens_tags?: string[];    // e.g. ["en:gluten", "en:milk"]
  image_front_url?: string;     // product front photo from OFF
  image_ingredients_url?: string;
  brands?: string;
  quantity?: string;            // e.g. "400 g"
}
