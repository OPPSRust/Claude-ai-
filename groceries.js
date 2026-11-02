// Turns ingredient names into shopping-list items with typical US store-brand package sizes
// and prices (2026). A small on-device model names ingredients well but guesses prices badly,
// so prices come from this book instead. They are estimates; the list links to real prices.

// More specific patterns come first (sweet potato before potato, broth before chicken).
const BOOK = [
  [/chicken (broth|stock)|broth|stock/, 'Chicken broth', '32 oz carton', 1.99, 'Pantry', 'broth'],
  [/peanut butter/, 'Peanut butter', '16 oz jar', 2.49, 'Pantry', 'peanut butter'],
  [/sweet potato/, 'Sweet potatoes', '2 lb', 2.58, 'Produce', 'produce'],
  [/tomato (sauce|paste)|marinara|pasta sauce|spaghetti sauce/, 'Pasta sauce', '24 oz jar', 2.49, 'Pantry', 'sauce'],
  [/(canned|diced|crushed) tomato/, 'Diced tomatoes', '2 × 14.5 oz cans', 1.98, 'Pantry', 'canned'],
  [/chicken breast|chicken tender/, 'Chicken breasts', '1.5 lb pack', 6.49, 'Meat & Seafood', 'chicken'],
  [/chicken/, 'Chicken thighs', '2 lb pack', 5.49, 'Meat & Seafood', 'chicken'],
  [/ground turkey|turkey/, 'Ground turkey', '1 lb', 4.49, 'Meat & Seafood', 'meat'],
  [/steak/, 'Sirloin steak', '1 lb', 8.99, 'Meat & Seafood', 'meat'],
  [/beef/, 'Ground beef', '1 lb', 5.49, 'Meat & Seafood', 'meat'],
  [/sausage|chorizo/, 'Smoked sausage', '14 oz', 3.99, 'Meat & Seafood', 'meat'],
  [/bacon/, 'Bacon', '12 oz', 4.99, 'Meat & Seafood', 'meat'],
  [/ham\b/, 'Sliced ham', '9 oz', 3.49, 'Meat & Seafood', 'meat'],
  [/pork/, 'Pork chops', '1.5 lb', 5.99, 'Meat & Seafood', 'meat'],
  [/salmon/, 'Salmon fillets', '1 lb', 9.99, 'Meat & Seafood', 'fish'],
  [/shrimp/, 'Frozen shrimp', '1 lb', 7.99, 'Frozen', 'frozen'],
  [/tuna/, 'Canned tuna', '2 × 5 oz cans', 2.18, 'Pantry', 'canned'],
  [/fish|tilapia|cod/, 'Tilapia fillets', '1 lb frozen', 5.49, 'Frozen', 'frozen'],
  [/egg/, 'Large eggs', 'dozen', 3.29, 'Dairy & Eggs', 'eggs'],
  [/butter/, 'Butter', '1 lb', 4.49, 'Dairy & Eggs', 'butter'],
  [/milk/, 'Milk', 'half gallon', 2.39, 'Dairy & Eggs', 'milk'],
  [/parmesan/, 'Grated parmesan', '8 oz', 3.49, 'Dairy & Eggs', 'cheese'],
  [/mozzarella/, 'Shredded mozzarella', '8 oz', 2.49, 'Dairy & Eggs', 'cheese'],
  [/feta/, 'Feta', '6 oz', 3.29, 'Dairy & Eggs', 'cheese'],
  [/cheese|cheddar/, 'Shredded cheddar', '8 oz', 2.49, 'Dairy & Eggs', 'cheese'],
  [/yogurt/, 'Plain yogurt', '32 oz', 2.99, 'Dairy & Eggs', 'yogurt'],
  [/sour cream/, 'Sour cream', '16 oz', 1.99, 'Dairy & Eggs', 'dairy'],
  [/cream/, 'Heavy cream', 'pint', 3.49, 'Dairy & Eggs', 'dairy'],
  [/onion/, 'Yellow onions', '3 lb bag', 2.99, 'Produce', 'produce'],
  [/garlic/, 'Garlic', '3 heads', 1.49, 'Produce', 'produce'],
  [/potato/, 'Russet potatoes', '5 lb bag', 3.99, 'Produce', 'produce'],
  [/tomato/, 'Tomatoes', '1 lb', 1.99, 'Produce', 'produce'],
  [/spinach|greens|kale/, 'Spinach', '10 oz', 2.49, 'Produce', 'produce'],
  [/lettuce|romaine|salad/, 'Romaine hearts', '3 count', 2.99, 'Produce', 'produce'],
  [/carrot/, 'Carrots', '2 lb bag', 1.49, 'Produce', 'produce'],
  [/bell pepper|peppers?$/, 'Bell peppers', '3 count', 3.49, 'Produce', 'produce'],
  [/broccoli/, 'Broccoli crowns', '1 lb', 1.99, 'Produce', 'produce'],
  [/green bean/, 'Green beans', '1 lb', 2.29, 'Produce', 'produce'],
  [/zucchini|squash/, 'Zucchini', '1 lb', 1.79, 'Produce', 'produce'],
  [/mushroom/, 'White mushrooms', '8 oz', 1.99, 'Produce', 'produce'],
  [/cucumber/, 'Cucumbers', '2 count', 1.38, 'Produce', 'produce'],
  [/lemon/, 'Lemons', '2 count', 1.18, 'Produce', 'produce'],
  [/lime/, 'Limes', '3 count', 1.17, 'Produce', 'produce'],
  [/cilantro|parsley|basil leaves|fresh herb/, 'Cilantro', 'bunch', 0.79, 'Produce', 'produce'],
  [/avocado/, 'Avocados', '2 count', 2.00, 'Produce', 'produce'],
  [/banana/, 'Bananas', '2 lb', 1.10, 'Produce', 'produce'],
  [/apple/, 'Apples', '3 lb bag', 4.49, 'Produce', 'produce'],
  [/berr/, 'Strawberries', '1 lb', 3.49, 'Produce', 'produce'],
  [/celery/, 'Celery', 'bunch', 1.69, 'Produce', 'produce'],
  [/corn/, 'Frozen corn', '12 oz bag', 1.29, 'Frozen', 'frozen vegetables'],
  [/peas|mixed vegetable|frozen vegetable/, 'Frozen mixed vegetables', '12 oz bag', 1.29, 'Frozen', 'frozen vegetables'],
  [/quinoa/, 'Quinoa', '12 oz', 3.99, 'Pantry', 'pantry'],
  [/rice/, 'Long-grain white rice', '2 lb bag', 1.99, 'Pantry', 'rice'],
  [/pasta|spaghetti|penne|macaroni|noodle|lasagna/, 'Pasta', '1 lb box', 1.25, 'Pantry', 'pasta'],
  [/tortilla/, 'Flour tortillas', '10 count', 2.49, 'Bakery', 'bread'],
  [/bun|roll/, 'Hamburger buns', '8 count', 1.99, 'Bakery', 'bread'],
  [/bread|toast/, 'Sandwich bread', 'loaf', 1.99, 'Bakery', 'bread'],
  [/chickpea|garbanzo/, 'Chickpeas', '2 × 15 oz cans', 1.78, 'Pantry', 'canned beans'],
  [/lentil/, 'Dry lentils', '1 lb bag', 1.79, 'Pantry', 'beans'],
  [/bean/, 'Black beans', '2 × 15 oz cans', 1.58, 'Pantry', 'canned beans'],
  [/oat/, 'Old-fashioned oats', '42 oz', 3.99, 'Pantry', 'cereal'],
  [/cereal|granola/, 'Cereal', '12 oz box', 2.99, 'Pantry', 'cereal'],
  [/pancake|waffle/, 'Pancake mix', '32 oz', 2.49, 'Pantry', 'baking'],
  [/syrup/, 'Pancake syrup', '24 oz', 2.49, 'Pantry', 'pantry'],
  [/flour/, 'All-purpose flour', '5 lb bag', 2.99, 'Pantry', 'baking'],
  [/sugar/, 'Sugar', '4 lb bag', 3.29, 'Pantry', 'baking'],
  [/soy sauce/, 'Soy sauce', '10 oz bottle', 1.79, 'Pantry', 'sauce'],
  [/salsa/, 'Salsa', '16 oz jar', 2.49, 'Pantry', 'sauce'],
  [/honey/, 'Honey', '12 oz', 3.99, 'Pantry', 'pantry'],
  [/mayo/, 'Mayonnaise', '30 oz jar', 3.79, 'Pantry', 'pantry'],
  [/mustard/, 'Yellow mustard', '14 oz', 0.98, 'Pantry', 'pantry'],
  [/ketchup/, 'Ketchup', '32 oz', 1.98, 'Pantry', 'pantry'],
  [/vinegar/, 'White vinegar', '16 oz', 1.29, 'Pantry', 'pantry'],
];

// Things most kitchens already have; never put on the list.
const SKIP = /^(salt|pepper|black pepper|salt and pepper|water|ice|.*\boil\b.*|.*spice.*|.*seasoning.*|paprika|cumin|oregano|thyme|rosemary|chili powder|garlic powder|onion powder|cinnamon|nutmeg|bay leaf|bay leaves|red pepper flakes|baking soda|baking powder)$/;

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** The ingredient names in a model's answer, lowercased, without staples or repeats. */
export function parseIngredients(answer) {
  const out = [];
  for (const piece of String(answer).split(/[\n,;]+/)) {
    const name = piece.toLowerCase()
      .replace(/^\s*(\d+[.)]|[-*•])\s*/, '')
      .replace(/\(.*?\)/g, '')
      .replace(/[^a-z' -]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (name.length < 3 || name.length > 40 || SKIP.test(name) || out.includes(name)) continue;
    out.push(name);
  }
  return out.slice(0, 12);
}

/** A shopping-list item for one ingredient: from the book, or a modest guess. */
export function priceItem(name) {
  const n = String(name).toLowerCase();
  for (const [re, item, size, price, aisle, kind] of BOOK) {
    if (re.test(n)) return { item, size, price, aisle, kind };
  }
  return { item: cap(n), size: '1 pack', price: 2.99, aisle: 'Other', kind: '' };
}

/**
 * The store brand to buy, given a chain's brand list like
 * "Great Value (pantry, dairy, frozen), Marketside (produce)". '' for fresh food with no brand.
 */
export function brandFor(brandsText, entry) {
  if (!brandsText) return '';
  const brands = brandsText.split(/,(?![^(]*\))/).map((b) => {
    const m = /^\s*([^()]+?)\s*(?:\(([^)]*)\))?\s*$/.exec(b) || [];
    return { name: (m[1] || '').trim(), what: (m[2] || '').toLowerCase() };
  }).filter((b) => b.name && !/store's own/i.test(b.name));
  const kind = (entry.kind || '').toLowerCase();
  const aisle = (entry.aisle || '').toLowerCase();
  // Loose produce and fresh meat only get a brand made for that exact food (ALDI's Kirkwood chicken).
  const fresh = aisle === 'produce' || aisle === 'meat & seafood';
  const words = (fresh ? [kind] : [kind, ...kind.split(' '), aisle.split(' ')[0]])
    .filter((w) => w.length > 2 && !(fresh && /^(produce|meat|fish)$/.test(w)));
  for (const b of brands) if (b.what && words.some((w) => b.what.includes(w))) return b.name;
  if (fresh) return '';
  const general = brands.find((b) => !b.what);
  return general ? general.name : '';
}
