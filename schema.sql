-- ─────────────────────────────────────────────────────────────────────────────
-- Food Scanner — Supabase (PostgreSQL) Schema
-- Run in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Products ────────────────────────────────────────────────────────────────
-- Global community product catalogue.
-- Populated by: Open Food Facts sync + AI Vision corrections.

CREATE TABLE IF NOT EXISTS products (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode          TEXT        NOT NULL UNIQUE,
  name             TEXT        NOT NULL,
  nutri_score      TEXT        CHECK (nutri_score IN ('A','B','C','D','E')),
  health_score     SMALLINT    CHECK (health_score BETWEEN 0 AND 100),
  ingredients_json JSONB,        -- OFFIngredient[]
  nutriments_json  JSONB,        -- OFFNutriments
  is_bio           BOOLEAN     NOT NULL DEFAULT FALSE,
  source           TEXT        NOT NULL DEFAULT 'off'
                               CHECK (source IN ('off','ai_vision','manual')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_barcode  ON products (barcode);
CREATE INDEX idx_products_nutri    ON products (nutri_score);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── User Profiles ────────────────────────────────────────────────────────────
-- 1-to-1 extension of auth.users.

CREATE TABLE IF NOT EXISTS user_profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  name       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-provision a profile row after Supabase Auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── User Allergens ───────────────────────────────────────────────────────────
-- Stores allergen tags in the same "en:X" format as OFFProduct.allergens_tags.

CREATE TABLE IF NOT EXISTS user_allergens (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID  NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
  allergen_tag TEXT  NOT NULL,   -- e.g. "en:gluten", "en:milk"
  UNIQUE (user_id, allergen_tag)
);

CREATE INDEX idx_user_allergens_user ON user_allergens (user_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_allergens ENABLE ROW LEVEL SECURITY;

-- Products: anyone can read; only authenticated users can insert/update
CREATE POLICY "products_select_public"
  ON products FOR SELECT USING (TRUE);

CREATE POLICY "products_insert_auth"
  ON products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "products_update_auth"
  ON products FOR UPDATE
  USING (auth.role() = 'authenticated');

-- User profiles: own row only
CREATE POLICY "profiles_select_own"
  ON user_profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- User allergens: own rows only (full CRUD)
CREATE POLICY "allergens_own"
  ON user_allergens FOR ALL USING (auth.uid() = user_id);
