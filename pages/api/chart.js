export default async function handler(req, res) {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "Symbol required" });

  const apiToken = process.env.EODHD_API_KEY || "";

  try {
    // 90 يوم كافي للبطاقات، السكانر يطلب 300
    const days = req.query.scanner === "1" ? 300 : 90;
    const fromDate = getDateDaysAgo(days);
    const url = `https://eodhd.com/api/eod/${symbol}?api_token=${apiToken}&fmt=json&period=d&order=a&from=${fromDate}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`EODHD error: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("No data");

    const chart = data.map(d => ({
      date: formatDate(d.date),
      open: d.open, high: d.high, low: d.low,
      close: d.adjusted_close || d.close,
      volume: d.volume,
    })).filter(d => d.close > 0);

    res.status(200).json({ chart, source: "EODHD", days: chart.length });
  } catch (error) {
    console.error("Chart error:", error.message);
    res.status(200).json({ chart: [], source: "error", error: error.message });
  }
}

function getDateDaysAgo(days) {
  const d = new Date(); d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}
