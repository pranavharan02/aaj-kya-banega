# आज क्या बनेगा? (Aaj Kya Banega?)

A weekly dinner menu planner built for two flatmates in Mumbai who needed to solve a simple but recurring problem: deciding what the house help should cook each week, communicating recipes clearly, and tracking groceries.

**Live:** [aaj-kya-banega.vercel.app](https://aaj-kya-banega.vercel.app)

## What it does

- Generates a 7-day dinner menu across 4 Indian regional cuisines (Tamil, North Indian, Marathi, Bihari) using AI or algorithmic selection from a database of 73 seeded dishes
- Each dish comes with a full recipe, ingredient list with quantities, nutritional macros, and a food photo
- Produces a shareable Hindi/Marathi recipe link for the house help — large Devanagari text, day-by-day navigation, offline-capable, with YouTube video links for each recipe
- Auto-calculates a day-wise shopping list that deducts what's already in the pantry
- Common household staples (oil, salt, turmeric, cumin, etc.) are pre-populated in the pantry so they don't clutter the shopping list

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| AI | Claude API (Sonnet) for menu generation, with algorithmic fallback |
| Hosting | Vercel |
| Auth | None — household ID in localStorage, shareable links for recipes |

## Seed data

73 dishes across 4 cuisines (48 veg, 25 non-veg), each with:
- English, Hindi, and Marathi names
- 10-step recipes translated into Hindi and Marathi (1,942 total translations)
- Full ingredient lists with quantities
- Per-serving macros (calories, protein, carbs, fat, fiber)
- Accompaniment pairing (rice/roti/bhakri)
- Food photo and YouTube recipe link

## Setup

```bash
git clone https://github.com/pranavharan02/aaj-kya-banega.git
cd aaj-kya-banega
npm install
```

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_key  # optional — algorithmic fallback works without it
```

```bash
npm run dev
```

## License

MIT
