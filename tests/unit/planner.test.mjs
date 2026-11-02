import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planMeals } from '../../planner.js';

const dinners = (n) => Array.from({ length: n }, (_, i) => ({ day: i + 1, type: 'Dinner' }));
const line = (name, day = 5) => `{"day":${day},"meal":"Dinner","name":"${name}","about":"Tasty.","minutes":30,"leftovers":false}`;

test('fills every requested day in order even when the model numbers days wrong', async () => {
  const meals = await planMeals({ slots: dinners(5), ask: async (slot) => line(`Meal ${slot.day}`, 5) });
  assert.deepEqual(meals.map((m) => m.day), [1, 2, 3, 4, 5]);
  assert.deepEqual(meals.map((m) => m.name), ['Meal 1', 'Meal 2', 'Meal 3', 'Meal 4', 'Meal 5']);
  assert.ok(meals.every((m) => m.type === 'Dinner'));
});

test('retries a day that came back unreadable', async () => {
  let calls = 0;
  const meals = await planMeals({
    slots: dinners(5),
    ask: async (slot, done, attempt) => { calls++; return slot.day === 3 && attempt === 0 ? 'Sure! Here is a meal.' : line(`Meal ${slot.day}`); },
  });
  assert.equal(meals[2].name, 'Meal 3');
  assert.equal(calls, 6);
});

test('uses leftovers when a day never comes back right', async () => {
  const meals = await planMeals({ slots: dinners(5), ask: async (slot) => (slot.day === 4 ? 'no json here' : line(`Meal ${slot.day}`)) });
  assert.equal(meals.length, 5);
  assert.equal(meals[3].day, 4);
  assert.equal(meals[3].leftovers, true);
  assert.match(meals[3].name, /^Leftover Meal 3$/);
});

test('day one failing every time is an error', async () => {
  await assert.rejects(planMeals({ slots: dinners(2), ask: async () => 'nothing' }), (e) => e.code === 'parse');
});

test('stops when cancelled', async () => {
  await assert.rejects(
    planMeals({ slots: dinners(3), ask: async () => { throw Object.assign(new Error('Stopped.'), { code: 'cancelled' }); } }),
    (e) => e.code === 'cancelled',
  );
});

test('passes earlier meals to the model and reports each meal', async () => {
  const seen = [];
  const reported = [];
  await planMeals({
    slots: dinners(3),
    ask: async (slot, done) => { seen.push(done.map((m) => m.name)); return line(`Meal ${slot.day}`); },
    onMeal: (meals) => reported.push(meals.length),
  });
  assert.deepEqual(seen, [[], ['Meal 1'], ['Meal 1', 'Meal 2']]);
  assert.deepEqual(reported, [1, 2, 3]);
});
