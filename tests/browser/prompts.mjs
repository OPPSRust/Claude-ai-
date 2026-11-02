// A small model copies whatever example it is shown, so prompts must not contain example
// dishes or grocery items, and each day must get a different main ingredient.
import { createRequire } from 'node:module';
import { startServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const server = await startServer(8795);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(server.url + '#plan');
  await page.waitForFunction(() => window.__cartcook && window.__cartcook.mealPrompt, null, { timeout: 5000 });
  const r = await page.evaluate(() => {
    const cc = window.__cartcook;
    const inp = { people: 2, days: 5, meals: ['Dinner'], budget: 50, currency: 'USD', zip: '30306', prefs: [], notes: '' };
    const veg = { ...inp, prefs: ['Vegetarian'] };
    const store = { name: 'Kroger', level: 2 };
    const meal = { day: 1, type: 'Dinner', name: 'Chili', about: 'A pot of beans and beef.', minutes: 40, leftovers: false };
    return {
      dinners: [1, 2, 3, 4, 5].map((d) => cc.mealPrompt(inp, store, { day: d, type: 'Dinner' }, [], 0)),
      vegDinners: [1, 2, 3, 4, 5].map((d) => cc.mealPrompt(veg, store, { day: d, type: 'Dinner' }, [], 0)),
      list: cc.ingredientsPrompt(inp, meal, false),
      recipe: cc.recipePrompt({ inputs: inp, store, meals: [meal], list: [{ item: 'Ground beef', uses: [1] }] }, 0),
    };
  });
  const banned = /Sheet-pan|Crispy thighs|Yellow onions|Large eggs|ground turkey|First step/i;
  for (const [name, text] of Object.entries({ dinner: r.dinners[0], list: r.list, recipe: r.recipe })) {
    if (banned.test(text)) throw new Error(`${name} prompt still contains an example to copy: ${text.match(banned)[0]}`);
  }
  const ideas = r.dinners.map((t) => (t.match(/Build it around ([^.]+)\./) || [])[1]);
  if (ideas.some((x) => !x) || new Set(ideas).size !== 5) throw new Error('each day needs its own main ingredient: ' + JSON.stringify(ideas));
  const vegIdeas = r.vegDinners.map((t) => (t.match(/Build it around ([^.]+)\./) || [])[1]).join(' ');
  if (/chicken|beef|pork|turkey|fish|sausage/i.test(vegIdeas)) throw new Error('vegetarian plan got a meat idea: ' + vegIdeas);
  if (!/Chili/.test(r.list) || !/comma-separated/.test(r.list)) throw new Error('ingredients prompt must name the meal and ask for a comma-separated list');
  console.log('PASS');
} catch (e) {
  console.log('FAIL ' + String(e.message).split('\n')[0]);
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
