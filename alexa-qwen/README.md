# My Qwen: put Qwen3.5 on your Echo

This is a private Alexa skill. Your Echo still hears "Alexa", but when you say
**"Alexa, open my qwen"** your questions go to **Qwen3.5**, and Alexa reads its answer out loud.
Follow-up questions work too; it remembers the conversation until you say "stop".

It works on any Echo, old ones included, with no hacking. Amazon doesn't let anyone swap out
the Alexa software itself, so a skill is how this is done.

## What you need

- The Amazon account your Echo is signed in to.
- An **OpenRouter** account with a few dollars of credit. OpenRouter runs Qwen3.5 for you.
  A question costs a tiny fraction of a cent.

## 1. Get a Qwen API key (5 minutes)

1. Go to <https://openrouter.ai> and sign up.
2. Open **Credits** and add a small amount (like $5).
3. Open **Keys** → **Create Key**. Copy the key (it starts with `sk-or-`). Keep it secret.

## 2. Create the skill (10 minutes)

1. Go to <https://developer.amazon.com/alexa/console/ask> and sign in with the **same Amazon
   account as your Echo**. Accept the free developer agreement if asked.
2. Click **Create Skill**.
   - Name: `My Qwen`, language: **English (US)**
   - Type: **Other** → **Custom**
   - Hosting: **Alexa-hosted (Node.js)** (free, no AWS account needed)
   - Template: **Start from Scratch**, then **Create Skill**. Wait a minute while it sets up.
3. **Build** tab → left menu **Interaction Model** → **JSON Editor**. Delete everything there,
   paste the contents of [`skill-package/interactionModels/custom/en-US.json`](skill-package/interactionModels/custom/en-US.json),
   click **Save**, then **Build skill**.
4. **Code** tab, inside the `lambda` folder:
   - Replace everything in `index.js` with [`lambda/index.js`](lambda/index.js).
   - Replace everything in `package.json` with [`lambda/package.json`](lambda/package.json).
   - Click the **new file** icon, name it `lambda/qwen.js`, and paste [`lambda/qwen.js`](lambda/qwen.js).
   - Click the **new file** icon, name it `lambda/config.js`, and paste [`lambda/config.js`](lambda/config.js).
5. In `config.js` on that page, put your key in the quotes:
   `apiKey: process.env.QWEN_API_KEY || 'sk-or-...your key...',`
   Only do this in the Amazon console, never in this GitHub repository.
6. Click **Save**, then **Deploy**.

## 3. Try it

1. **Test** tab → change "Off" to **Development**.
2. Type or say `open my qwen`, then `ask why is the sky blue`.
3. Now on your Echo: **"Alexa, open my qwen"** … **"ask what should I cook tonight"**.
   Or in one go: **"Alexa, ask my qwen why is the sky blue"**.

The skill only works on devices signed in to your account. You don't need to publish it.

## Tips

- Start questions with words like *ask*, *what is*, *how do*, *why is*, *tell me*, *explain*.
  Alexa needs one of these to pass the rest of the sentence through.
- If Alexa mishears "qwen", change the **Invocation Name** (Build tab) to something easier like
  `my helper`, then Build again.
- Alexa only waits about 8 seconds for an answer, so the skill asks for short answers and uses
  the fast `qwen/qwen3.5-35b-a3b` model with thinking turned off. To try another, change
  `model` in `config.js`, e.g. `qwen/qwen3.5-9b` (cheaper) or `qwen/qwen3.5-27b`.
- Run Qwen on your own PC instead? Set `baseUrl` to your [Ollama](https://ollama.com) server's
  public HTTPS address plus `/v1` (e.g. through a Cloudflare Tunnel), `model` to e.g. `qwen3.5:9b`,
  and `apiKey` to any text. Amazon's servers must be able to reach it, so `localhost` won't work.

## If something goes wrong

| Alexa says | Fix |
| --- | --- |
| "Qwen is not set up yet" | The key is missing in `config.js`. Add it and Deploy. |
| "Qwen rejected the API key" | Copy the key again from OpenRouter. |
| "Your Qwen account is out of credit" | Add credit on OpenRouter. |
| "Qwen took too long" | Ask a shorter question, or switch to `qwen/qwen3.5-9b`. |
| "There was a problem with the requested skill's response" | Code tab → **CloudWatch Logs** shows the error. |
