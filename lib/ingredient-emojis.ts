// Ingredient → emoji mapping for visual shopping list
const EMOJI_MAP: Record<string, string> = {
  // Vegetables
  'onion': '🧅', 'tomato': '🍅', 'potato': '🥔', 'garlic': '🧄', 'ginger': '🫚',
  'carrot': '🥕', 'peas': '🫛', 'green peas': '🫛', 'capsicum': '🫑', 'corn': '🌽',
  'brinjal': '🍆', 'eggplant': '🍆', 'spinach': '🥬', 'palak': '🥬', 'keerai': '🥬',
  'cauliflower': '🥦', 'beans': '🫘', 'okra': '🫛', 'bhindi': '🫛', 'cucumber': '🥒',
  'mushroom': '🍄', 'lemon': '🍋', 'coconut': '🥥', 'chilli': '🌶', 'pepper': '🌶',
  'drumstick': '🥢', 'mint': '🌿', 'coriander': '🌿', 'curry leaves': '🍃',
  // Protein
  'chicken': '🍗', 'mutton': '🥩', 'lamb': '🥩', 'egg': '🥚', 'eggs': '🥚',
  'fish': '🐟', 'prawn': '🦐', 'shrimp': '🦐', 'paneer': '🧀', 'bangda': '🐟',
  // Dairy
  'milk': '🥛', 'curd': '🥛', 'yogurt': '🥛', 'butter': '🧈', 'ghee': '🧈',
  'cream': '🥛', 'cheese': '🧀',
  // Pantry
  'rice': '🍚', 'flour': '🌾', 'wheat': '🌾', 'dal': '🫘', 'lentil': '🫘',
  'chana': '🫘', 'rajma': '🫘', 'sugar': '🍬', 'jaggery': '🍯', 'salt': '🧂',
  'oil': '🫒', 'cashew': '🥜', 'peanut': '🥜', 'almond': '🥜', 'raisin': '🍇',
  'tamarind': '🟤', 'sattu': '🌾', 'besan': '🌾', 'pav': '🍞',
  // Spices
  'turmeric': '💛', 'cumin': '🟡', 'mustard': '🟡', 'cinnamon': '🟤', 'clove': '🟤',
  'cardamom': '🟢', 'saffron': '🟡', 'masala': '🟤', 'fennel': '🟡',
}

export function getIngredientEmoji(name: string): string {
  const lower = name.toLowerCase()
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(key)) return emoji
  }
  return '•'
}
