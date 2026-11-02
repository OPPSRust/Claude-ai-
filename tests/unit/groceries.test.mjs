import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIngredients, priceItem, brandFor } from '../../groceries.js';

test('reads a comma or line separated ingredient answer', () => {
  assert.deepEqual(parseIngredients('1. Chicken breast\n2. rice, onions\n- salt, olive oil, black pepper\n- Rice'), ['chicken breast', 'rice', 'onions']);
});

test('prices known groceries from the price book', () => {
  const c = priceItem('boneless chicken breast');
  assert.equal(c.item, 'Chicken breasts');
  assert.equal(c.aisle, 'Meat & Seafood');
  assert.ok(c.price > 3 && c.price < 12);
  assert.equal(priceItem('sweet potatoes').item, 'Sweet potatoes');
  assert.equal(priceItem('potato').item, 'Russet potatoes');
  assert.equal(priceItem('chicken broth').item, 'Chicken broth');
  assert.equal(priceItem('peanut butter').item, 'Peanut butter');
});

test('unknown groceries get a modest guess, never a wild price', () => {
  const x = priceItem('dragon fruit');
  assert.equal(x.item, 'Dragon fruit');
  assert.ok(x.price > 0 && x.price < 6);
});

test('picks the store brand that fits the item', () => {
  const aldi = "Goldhen (eggs), Happy Farms (cheese), Kirkwood (chicken), Reggano (pasta, sauce), Dakota's Pride (canned beans)";
  assert.equal(brandFor(aldi, priceItem('eggs')), 'Goldhen');
  assert.equal(brandFor(aldi, priceItem('spaghetti')), 'Reggano');
  assert.equal(brandFor(aldi, priceItem('chicken thighs')), 'Kirkwood');
  const walmart = 'Great Value (pantry, dairy, frozen, canned), Marketside (produce, salads, bakery)';
  assert.equal(brandFor(walmart, priceItem('rice')), 'Great Value');
  assert.equal(brandFor(walmart, priceItem('onion')), '');
  assert.equal(brandFor('', priceItem('rice')), '');
});
