export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY' }); return; }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const prompt = (body && body.prompt) || '';
  const sources = (body && body.sources) || [];
  // Prior turns from the client, oldest first, so follow-ups
  // ("give me a plain version") can see what they refer to.
  const history = (Array.isArray(body && body.history) ? body.history : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content)
    .slice(-8)
    .map(m => ({ role: m.role, content: m.content.slice(0, 8000) }));
  const srcText = sources.map((s, i) => {
    const head = '[SOURCE ' + (i + 1) + ': ' + (s.type || '') + (s.name ? ' — ' + s.name : '') + (s.scriptures ? ' (' + s.scriptures + ')' : '') + ']';
    return head + '\n' + (s.text || s.plain || s.quote || s.excerpt || '');
  }).join('\n\n');
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2500,
        messages: history.concat([{ role: 'user', content: prompt + '\n\nSOURCES:\n' + srcText }])
      })
    });
    const j = await r.json();
    if (j.error) { res.status(500).json({ error: j.error.message || 'Anthropic API error' }); return; }
    const text = (j.content && j.content[0] && j.content[0].text) || '';
    const logUrl = process.env.LOG_URL || 'https://script.google.com/macros/s/AKfycbyldHHESDhjG72XNXB7KfjVY5A6TC0cKcwZuufrB0jxttgoVZmdVzQIKZuxHb7bpyorWQ/exec';
    if (logUrl) {
      try {
        await fetch(logUrl, { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ts: new Date().toISOString(), question: (body && body.question) || '', answer: text,
            sources: (sources || []).map(s => s.name).filter(Boolean).join(' | ') }) });
      } catch (le) { /* logging is best-effort, never block the answer */ }
    }
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
