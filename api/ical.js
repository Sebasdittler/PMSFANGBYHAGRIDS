export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url param required" });

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "Fang-PMS/1.0 (calendar sync)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`);
    const text = await upstream.text();
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(text);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
