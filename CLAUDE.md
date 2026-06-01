# CLAUDE.md — Aaj Kya Banega

Start every reply with 🟢
Why: This is a canary instruction. If you ever stop starting replies with 🟢, it means the context window has grown long enough that you're no longer reading CLAUDE.md, and I need to reset the conversation with /clear or start a new session. It's a zero-cost way to monitor whether my project instructions are actually being followed.

## What This Is
A web app for two flatmates in Mumbai to plan weekly dinners, generate AI-powered menus across 4 Indian cuisines (Tamil, North Indian, Marathi, Bihari), and share translated recipes with their house help (maid) who reads Hindi/Marathi only.

## Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL + REST API)
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514) for menu generation
- **Hosting:** Vercel
- **No auth** — household ID in localStorage, shareable links for maid

## Core User Flow
1. Open app → current week auto-selected
2. Set veg/non-veg split (slider: 0-7 veg days)
3. Pick cuisines (multi-select: Tamil, North Indian, Marathi, Bihari)
4. Hit "Generate" → Claude API picks 7 dinners from the dish database (73 seeded dishes)
5. View as 7-tile calendar (Mon–Sun with real dates)
6. Each tile shows: dish name, cuisine badge, veg/non-veg dot, accompaniment (rice/roti/bhakri), macro summary
7. Tap tile → dish detail with recipe, ingredients, nutrition card, language toggle
8. Swap any dish (⟳ button → regenerate or pick alternative)
9. "Finalize" → locks menu, generates shopping list, creates shareable maid link
10. Maid opens link → sees today's recipe in Hindi/Marathi, large text, read-only

## Key Design Decisions (Locked)
- **Dinner only** — one meal per day, 7 days
- **Accompaniments explicitly planned** — each dish paired with rice/roti/bhakri (stored as `default_accompaniment` on dish)
- **Default servings: 2** (flatmates only)
- **Recipe depth for maid: assume she knows basics** — concise steps, not hyper-explicit
- **Maid view is read-only** — no feedback buttons, no interactivity
- **AI-generated dish illustrations** — pre-generate for seed dishes, store URL in DB
- **Macros on every dish** — calories, protein, carbs, fat, fiber per serving
- **No login** — UUID in localStorage as household_id
- **Menu generation: AI-first, algorithmic fallback** — Claude picks from known dish DB, never hallucinated dishes

## Database Schema (Supabase)

### households
```sql
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  default_servings INT DEFAULT 2,
  default_cuisines TEXT[] DEFAULT '{"tamil","north"}',
  default_veg_days INT DEFAULT 4,
  preferred_maid_lang TEXT DEFAULT 'hi'
);
```

### dishes
```sql
CREATE TABLE dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_hi TEXT,
  name_mr TEXT,
  cuisine TEXT NOT NULL, -- tamil, north, marathi, bihari, custom
  is_veg BOOLEAN NOT NULL,
  prep_time_min INT,
  cook_time_min INT,
  difficulty TEXT DEFAULT 'easy', -- easy, medium, hard
  default_servings INT DEFAULT 2,
  default_accompaniment TEXT, -- steamed-rice, roti, bhakri, paratha, naan, pav, appam
  calories INT,
  protein_g DECIMAL,
  carbs_g DECIMAL,
  fat_g DECIMAL,
  fiber_g DECIMAL,
  illustration_url TEXT,
  is_custom BOOLEAN DEFAULT false,
  description_en TEXT,
  description_hi TEXT,
  description_mr TEXT,
  tags TEXT[]
);
```

### ingredients
```sql
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_hi TEXT,
  name_mr TEXT,
  category TEXT, -- vegetable, spice, dairy, protein, pantry, oil_condiment, grain
  default_unit TEXT -- kg, g, L, mL, pieces, tsp, tbsp, cup
);
```

### dish_ingredients
```sql
CREATE TABLE dish_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID REFERENCES dishes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  quantity DECIMAL NOT NULL,
  unit TEXT NOT NULL
);
```

### recipe_steps
```sql
CREATE TABLE recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID REFERENCES dishes(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  instruction_en TEXT NOT NULL,
  instruction_hi TEXT,
  instruction_mr TEXT,
  duration_min INT
);
```

### weekly_menus
```sql
CREATE TABLE weekly_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id),
  week_start_date DATE NOT NULL,
  is_finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  generation_mode TEXT -- ai, algorithmic
);
```

### menu_items
```sql
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID REFERENCES weekly_menus(id) ON DELETE CASCADE,
  dish_id UUID REFERENCES dishes(id),
  day_of_week INT NOT NULL, -- 0=Mon, 6=Sun
  date DATE NOT NULL,
  is_veg BOOLEAN,
  was_swapped BOOLEAN DEFAULT false
);
```

### inventory
```sql
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id),
  ingredient_id UUID REFERENCES ingredients(id),
  quantity DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### shopping_lists
```sql
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID REFERENCES weekly_menus(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  required_qty DECIMAL,
  in_stock_qty DECIMAL DEFAULT 0,
  to_buy_qty DECIMAL,
  is_purchased BOOLEAN DEFAULT false,
  unit TEXT
);
```

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/generate-menu` | POST | Preferences → Claude API → 7-day menu |
| `/api/menus` | GET | Fetch menus for a household |
| `/api/menus/[id]` | GET/PUT | Get or update a specific menu |
| `/api/menus/[id]/finalize` | POST | Lock menu, generate shopping list |
| `/api/menus/[id]/swap` | POST | Swap a single day's dish |
| `/api/inventory` | GET/POST/PUT/DELETE | CRUD for inventory items |
| `/api/shopping-list/[menuId]` | GET | Computed shopping list |
| `/api/dishes` | GET/POST | Full dish catalog + add new dish |

## AI Menu Generation Prompt (for /api/generate-menu)

System prompt instructs Claude to:
- Pick 7 dinner dishes from the provided dish database ONLY (no hallucination)
- Match the veg/non-veg split
- Distribute across selected cuisines roughly evenly
- Ensure variety (no same protein/carb base on consecutive days)
- Avoid dishes from the last 2 weeks
- Include appropriate accompaniment per dish
- Return structured JSON

Response shape:
```json
{
  "menu": [
    {
      "day": "monday",
      "dish_slug": "dal-tadka",
      "accompaniment": "steamed-rice",
      "is_veg": true,
      "reason": "Light start to the week"
    }
  ],
  "weekly_summary": "A balanced mix of Tamil and North Indian comfort food"
}
```

Model: `claude-sonnet-4-20250514`, max_tokens: 1000, temperature: 0.7
Fallback: algorithmic (shuffle + constraints) if API fails.

## Maid View (/maid/[menuId])
- Route: `/maid/{menu_id}?lang=hi` or `?lang=mr`
- SSR for fast load on budget Android
- Auto-opens to TODAY's recipe (date-matched)
- Large Devanagari text (18px+), numbered steps, high contrast
- No English on this route
- Toggle between Hindi ↔ Marathi only
- Minimal JS, under 100KB total, service worker for offline
- Read-only — zero interactive elements

## Seed Data
- 73 dishes (48 veg, 25 non-veg) across 4 cuisines
- Full ingredient lists with quantities, 10-step recipes
- Hindi + Marathi translations for all dish names
- Per-serving macros (calories, protein, carbs, fat, fiber)
- Seed data Excel: `aaj-kya-banega-seed-db.xlsx`
- Convert to SQL seed during setup

## App Pages
1. **Home** — Current week view, "Plan This Week" CTA
2. **Plan wizard** — Veg/NV split → cuisine select → generate
3. **Menu calendar** — 7 tiles (draft/finalized states)
4. **Dish detail** — Recipe, ingredients, nutrition, language toggle
5. **Maid view** — SSR, Hindi/Marathi, today's recipe hero
6. **Inventory** — CRUD list of pantry items
7. **Shopping list** — Aggregated ingredients, grouped by category, to-buy column
8. **Add dish** — Form to add custom dishes to the database
9. **Settings** — Default cuisines, servings, maid language

## Visual Design System

### Core Principles
- **Radically simple** — white background, black text, grey containers. No color-heavy UI.
- **Readability-first** — large text sizes everywhere. If in doubt, go bigger.
- **Rounded and soft** — generous border-radius on all containers and tiles.

### Color Palette
```css
--bg:           #FFFFFF;      /* Page background — pure white */
--bg-tile:      #F5F5F5;      /* Tile/card background — very light grey */
--bg-hover:     #EBEBEB;      /* Hover state for tiles */
--text-primary: #1A1A1A;      /* Primary text — near-black */
--text-secondary: #6B6B6B;    /* Secondary/muted text */
--border:       #E0E0E0;      /* Borders and dividers */
--accent:       #1A1A1A;      /* Buttons, active states — black */
--accent-text:  #FFFFFF;      /* Text on accent background */
--veg:          #2E7D32;      /* Veg indicator — green */
--nonveg:       #C62828;      /* Non-veg indicator — red */

/* Cuisine badges — subtle, muted tones (only place color appears) */
--tamil:        #E8D5C4;      /* Warm sand */
--north:        #F5E6CC;      /* Light saffron */
--marathi:      #D4E8D4;      /* Soft sage */
--bihari:       #E8DCC8;      /* Warm wheat */
```

### Typography
- **Font:** System font stack or a clean sans-serif (e.g., DM Sans, Geist)
- **Dish names:** 20-24px, font-weight 600
- **Body/recipe text:** 16-18px, line-height 1.6
- **Maid view text:** 20px minimum, line-height 1.8, Devanagari-optimized
- **Labels/captions:** 13-14px, text-secondary color
- No ALL CAPS anywhere. Sentence case throughout.

### Tiles & Cards
- Background: var(--bg-tile)
- Border-radius: 16px (large, friendly)
- Padding: 20-24px
- No hard borders — use subtle shadow or 1px border in var(--border)
- Hover: shift to var(--bg-hover)
- Menu calendar tiles: equal height, generous spacing between them

### Buttons
- Primary: black background, white text, border-radius 12px, 16px font, generous padding
- Secondary: white background, 1px black border, black text
- No gradients, no shadows on buttons
- Large tap targets (min 48px height) for mobile

### Layout
- Max-width 720px for main content (phone-first, readable on desktop)
- Generous whitespace — don't pack things tight
- Single column for most views
- Menu calendar: 7 tiles as a responsive grid (1 col on mobile, 7 col on wide desktop)

### Illustrations
- **Style:** Minimal flat illustrations, soft warm tones on white/transparent background
- **Generation:** Pre-generate 73 images via DALL-E 3 or Flux (one-time batch script)
- **Prompt template:** "Minimal flat illustration of [dish_name], Indian food, white background, soft warm tones, simple clean lines, no text, centered, icon style"
- **Storage:** Supabase Storage bucket, public URLs in dishes.illustration_url
- **Cost:** ~$3 total (73 × $0.04)
- **Fallback (no illustration):** Cuisine-colored rounded rectangle with dish initial letter
- **Size:** 256×256px or 512×512px, compressed WebP

### Maid View (Special Constraints)
- 20px+ Devanagari text everywhere
- Extra line-height (1.8-2.0) for readability
- High contrast: pure black on white
- Recipe step numbers large and bold (24px)
- Tap target for day navigation: full-width buttons, 56px+ height
- No decorative elements — pure utility
- Works on 360px-wide budget Android screens

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=           # Server-side only
```
