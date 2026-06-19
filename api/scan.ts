// Vercel Serverless Function — /api/scan
// API keys are safe here; the mobile client never sees them.
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─── Prompt ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are a food product parser.
Given 3 images of a product (front label, ingredients list, nutrition facts table),
extract all data and return ONLY a valid JSON object matching the Open Food Facts v2
product schema — no markdown, no commentary, no wrapper key.

Critical rules:
1. The "ingredients" array MUST preserve the exact order from the label (descending by weight).
   Ingredient order directly affects the risk scoring engine — do not reorder.
2. Populate: product_name, nutriscore_grade (if visible), additives_tags, ingredients,
   nutriments (energy_kcal_100g, proteins_100g, fat_100g, carbohydrates_100g,
   sugars_100g, fiber_100g, salt_100g), labels_tags, allergens_tags.
3. additives_tags must use the "en:eXXX" format (e.g. "en:e621").
4. allergens_tags must use the "en:X" format (e.g. "en:gluten", "en:milk").
5. If a field is not visible in any image, omit it — do not hallucinate values.
6. Return a confidence score (0–1) as a top-level "confidence" key alongside "product".
`.trim();

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScanRequestBody {
  images: [string, string, string]; // base64: [front, ingredients, nutrition]
  barcode?: string;
}

interface OpenAIMessage {
  role: 'system' | 'user';
  content: string | OpenAIContentPart[];
}

interface OpenAIContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string; detail: 'high' | 'low' | 'auto' };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const body = req.body as ScanRequestBody;
  if (!Array.isArray(body?.images) || body.images.length !== 3) {
    res.status(400).json({
      error: 'Expected body.images: [front_b64, ingredients_b64, nutrition_b64]',
    });
    return;
  }

  const messages: OpenAIMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: body.barcode
            ? `Parse this product (barcode hint: ${body.barcode}).`
            : 'Parse this product from the 3 images below.',
        },
        ...body.images.map(
          (b64): OpenAIContentPart => ({
            type:      'image_url',
            image_url: { url: `data:image/jpeg;base64,${b64}`, detail: 'high' },
          })
        ),
      ],
    },
  ];

  const openAIRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:           'gpt-4o',
      response_format: { type: 'json_object' },
      messages,
      max_tokens:      2048,
    }),
  });

  if (!openAIRes.ok) {
    const detail = await openAIRes.text();
    console.error('[scan] OpenAI error:', detail);
    res.status(502).json({ error: 'AI service unavailable' });
    return;
  }

  const aiData = await openAIRes.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const rawContent = aiData.choices?.[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(rawContent) as {
      product?: unknown;
      confidence?: number;
      // The LLM may return a flat object instead of wrapping in "product"
      [key: string]: unknown;
    };

    // Normalise: accept both { product: {...}, confidence: 0.9 } and flat OFF object
    const product    = parsed.product ?? parsed;
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.8;

    res.status(200).json({ product, confidence });
  } catch {
    res.status(422).json({ error: 'AI returned unparseable JSON', raw: rawContent });
  }
}
