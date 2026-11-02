import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planList, extractObjects } from '../../planner.js';

const meals = [{ name: 'Chili' }, { name: 'Tacos' }];
const toItems = (text) => extractObjects(text).map((o) => (o.item ? { item: String(o.item), price: Number(o.price) || 0 } : null)).filter(Boolean);

test('asks for each meal and records which meals use each item', async () => {
  const asked = [];
  const items = await planList({
    meals,
    ask: async (meal, n) => { asked.push(`${n}:${meal.name}`); return n === 1 ? '{"item":"Ground beef","price":5}\n{"item":"Onions","price":2}' : '{"item":"onions","price":2}\n{"item":"Tortillas","price":3}'; },
    toItems,
  });
  assert.deepEqual(asked, ['1:Chili', '2:Tacos']);
  assert.deepEqual(items.map((i) => [i.item, i.uses]), [['Ground beef', [1]], ['Onions', [1, 2]], ['Tortillas', [2]]]);
});

test('reports items as they arrive and skips unreadable answers', async () => {
  const counts = [];
  const items = await planList({ meals, ask: async (meal, n) => (n === 1 ? 'no list' : '{"item":"Rice","price":2}'), toItems, onItems: (list) => counts.push(list.length) });
  assert.deepEqual(items.map((i) => i.item), ['Rice']);
  assert.deepEqual(counts, [0, 1]);
});

test('leftover nights add nothing to the list', async () => {
  const asked = [];
  const items = await planList({
    meals: [{ name: 'Chili' }, { name: 'Leftover Chili', leftovers: true }],
    ask: async (meal) => { asked.push(meal.name); return '{"item":"Beans","price":1}'; },
    toItems,
  });
  assert.deepEqual(asked, ['Chili']);
  assert.deepEqual(items.map((i) => i.uses), [[1]]);
});
