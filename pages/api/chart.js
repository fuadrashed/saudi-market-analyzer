export default async function handler(req, res) {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "Symbol required" });

  const apiToken = process.env.EODHD_API_KEY || "";
  const eodhSymbol = symbol.replace(".SR", ".SR");

  try {
    const fromDate = getDateDaysAgo(60);
    const url = `https://eodhd.com/api/eod/${eodhSymbol}?api_token=${apiToken}&fmt=json&period=d&order=a&from=${fromDate}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`EODHD error: ${response.status}`);
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) throw new Error("No data");

    const chart = data.map(d => ({
      date: formatDate(d.date),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close || d.adjusted_close,
      volume: d.volume,
    })).filter(d => d.close > 0);

    res.status(200).json({ chart, source: "EODHD" });
  } catch (error) {
    console.error("EODHD chart error:", error.message);
    // Fallback to Yahoo
    try {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`;
      const yahooRes = await fetch(yahooUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (yahooRes.ok) {
        const data = await yahooRes.json();
        const result = data.chart?.result?.[0];
        if (result) {
          const ts = result.timestamp || [];
          const q = result.indicators?.quote?.[0];
          const chart = ts.map((t, i) => ({
            date: new Date(t * 1000).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
            open: q.open?.[i] || 0, high: q.high?.[i] || 0,
            low: q.low?.[i] || 0, close: q.close?.[i] || 0, volume: q.volume?.[i] || 0,
          })).filter(d => d.close > 0);
          return res.status(200).json({ chart, source: "Yahoo (fallback)" });
        }
      }
      throw new Error("Yahoo also failed");
    } catch {
      // Mock data fallback
      const basePrice = 50 + Math.random() * 100;
      const chart = [];
      let price = basePrice;
      for (let i = 30; i >= 0; i--) {
        const date = new Date(); date.setDate(date.getDate() - i);
        if (date.getDay() === 5 || date.getDay() === 6) continue;
        const change = (Math.random() - 0.48) * 3;
        const open = price; price *= (1 + change / 100);
        chart.push({
          date: date.toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
          open: +open.toFixed(2), high: +(Math.max(open, price) * 1.005).toFixed(2),
          low: +(Math.min(open, price) * 0.995).toFixed(2), close: +price.toFixed(2),
          volume: Math.floor(Math.random() * 15e6 + 500000),
        });
      }
      res.status(200).json({ chart, source: "mock" });
    }
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
