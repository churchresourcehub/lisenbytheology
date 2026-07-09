// Fingerprints a visitor's question with Voyage so the browser can match it by meaning.
// The Voyage key lives only here on the server (set VOYAGE_API_KEY in Vercel), never in the page.
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const key = process.env.VOYAGE_API_KEY;
  if (!key) { res.status(500).json({ error: 'Server is missing VOYAGE_API_KEY' }); return; }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const text = (body && body.text) || '';
  if (!text) { res.status(400).json({ error: 'no text' }); return; }
  try {
    const r = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + key },
      body: JSON.stringify({
        input: [text], model: 'voyage-3-large', input_type: 'query',
        output_dimension: 512, output_dtype: 'int8'
      })
    });
    const j = await r.json();
    if (j.error || !j.data || !j.data[0]) { res.status(500).json({ error: (j.error && j.error.message) || 'Voyage error' }); return; }
    res.status(200).json({ vector: j.data[0].embedding });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
