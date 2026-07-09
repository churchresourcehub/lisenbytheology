# Woods Lisenby: Theology and Practice — web app

A shareable site with the theology systematic, the practice library, and a chat that
answers from the full text of everything (sermons, notes, Bible studies, papers,
and the Resource Hub library).

## Files
- `index.html` — the whole interface (loads `data/corpus.json` in the browser).
- `data/corpus.json` — the full-text corpus (large; served gzipped by the host).
- `data/vectors.bin` + `data/vec_meta.json` — semantic-search fingerprints (built by `embed_corpus.py`).
- `api/chat.js` — serverless function holding the Anthropic key; calls Claude for the answer.
- `api/embed.js` — serverless function holding the Voyage key; fingerprints each question.
- `embed_corpus.py` — the one-time script that builds the semantic fingerprints.
- `vercel.json` — config.

## Deploy on Vercel (recommended)
1. Go to vercel.com, "Add New… Project," and drag this whole folder in (or push it to a
   GitHub repo and import it).
2. In the project's Settings -> Environment Variables, add BOTH keys:
   - `ANTHROPIC_API_KEY` — your key from console.anthropic.com (powers the chat answer)
   - `VOYAGE_API_KEY` — your key from dash.voyageai.com (powers semantic search)
3. Deploy. Browsing works immediately; the chat works once the keys are set.

## Semantic search (search by meaning, not just keywords)
This is what makes a question like "little brothers" find the Jacob and Esau sermons.
It needs a one-time build:
1. Sign up at https://dash.voyageai.com and create an API key.
2. In Terminal, from inside this folder:
       export VOYAGE_API_KEY=your-voyage-key
       python3 embed_corpus.py
   It writes `data/vectors.bin` and `data/vec_meta.json` (a few minutes, about $1 of credit).
3. Upload those two files with the rest, and make sure `VOYAGE_API_KEY` is set in Vercel.
Until this is done the site quietly uses keyword search, so it always works.

## Cost
The chat uses Claude Haiku 4.5, about 1 to 2 cents per question. Semantic search adds a
Voyage query embedding, a fraction of a cent per question, plus the one-time ~$1 build.
Set spend limits in both consoles to cap it. Browsing costs nothing.

## Updating the corpus
If you regenerate `data/corpus.json`, re-run `python3 embed_corpus.py` afterward so the
fingerprints match the new text (the site auto-detects a mismatch and falls back to
keyword search until you do).

Source repo: https://github.com/churchresourcehub/lisenbytheology (Vercel auto-deploys on push).
