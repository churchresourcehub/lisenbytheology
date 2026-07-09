#!/usr/bin/env python3
"""
One-time step: turn every sermon/note/study passage into a Voyage embedding so the
site can search by MEANING instead of keywords.

You run this once (and again only if data/corpus.json changes). It reads
data/corpus.json, sends the text to Voyage in batches, and writes two files:
  data/vectors.bin    - the embeddings (compact int8)
  data/vec_meta.json  - which passage belongs to which sermon

HOW TO RUN (in Terminal, from inside this "Theology App" folder):
    export VOYAGE_API_KEY=your-voyage-key-here
    python3 embed_corpus.py

Get a key at https://dash.voyageai.com (free signup). The run costs about $1 of
Voyage credit for the whole corpus and takes a few minutes. Uses only the Python
standard library, so there is nothing to install.
"""
import os, sys, json, time, array, urllib.request, urllib.error

KEY = os.environ.get("VOYAGE_API_KEY")
if not KEY:
    sys.exit("Set your key first:  export VOYAGE_API_KEY=your-voyage-key   then rerun.")

HERE   = os.path.dirname(os.path.abspath(__file__))
CORPUS = os.path.join(HERE, "data", "corpus.json")
MODEL  = "voyage-3-large"
DIM    = 512            # 512-dim int8 keeps vectors.bin small; drop to 256 for a lighter file
BATCH  = 48             # smaller batches stay under per-minute token limits on lower tiers

corpus = json.load(open(CORPUS, encoding="utf-8"))

def chunks_of(t, size=1600, overlap=300):
    t = (t or "").strip()
    if len(t) < 40: return []
    if len(t) <= size: return [t]
    out, i = [], 0
    while i < len(t):
        out.append(t[i:i+size]); i += size - overlap
    return out

texts, chunk_doc = [], []
for di, d in enumerate(corpus):
    title = d.get("t", "")
    for ch in chunks_of(d.get("x", "")):
        texts.append((title + " — " + ch)[:8000]); chunk_doc.append(di)
print(f"{len(corpus)} documents -> {len(texts)} passages to embed")

def embed_batch(batch):
    body = json.dumps({"input": batch, "model": MODEL, "input_type": "document",
                       "output_dimension": DIM, "output_dtype": "int8"}).encode()
    req = urllib.request.Request("https://api.voyageai.com/v1/embeddings", data=body,
          headers={"content-type": "application/json", "authorization": "Bearer " + KEY})
    for attempt in range(10):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                j = json.load(r)
            return [row["embedding"] for row in sorted(j["data"], key=lambda x: x["index"])]
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503):
                ra = e.headers.get("Retry-After")
                wait = int(ra) if (ra and ra.isdigit()) else min(60, 2 ** attempt)
                print(f"  Voyage returned {e.code}; waiting {wait}s and retrying"); time.sleep(wait); continue
            sys.exit(f"Voyage error {e.code}: {e.read().decode()[:300]}")
        except Exception as e:
            wait = min(60, 2 ** attempt); print(f"  network hiccup ({e}); retry in {wait}s"); time.sleep(wait)
    sys.exit("Still hitting the limit after many tries. This almost always means no payment "
             "method is on file at Voyage (Billing page). Add one to lift the rate limit "
             "(the free 200M tokens still cover this run), then rerun.")

vecs = array.array("b")
for s in range(0, len(texts), BATCH):
    for e in embed_batch(texts[s:s+BATCH]):
        vecs.extend(max(-128, min(127, int(round(x)))) for x in e)
    print(f"  {min(s+BATCH, len(texts))}/{len(texts)} passages done")
    time.sleep(0.2)

open(os.path.join(HERE, "data", "vectors.bin"), "wb").write(vecs.tobytes())
json.dump({"model": MODEL, "dim": DIM, "dtype": "int8", "n": len(chunk_doc),
           "docs": len(corpus), "chunkDoc": chunk_doc},
          open(os.path.join(HERE, "data", "vec_meta.json"), "w"))
print(f"\nDONE. Wrote data/vectors.bin ({len(vecs)/1048576:.1f} MB) and data/vec_meta.json")
print("Now upload data/vectors.bin and data/vec_meta.json to GitHub with the other files,")
print("add VOYAGE_API_KEY in your Vercel project settings, and redeploy.")
