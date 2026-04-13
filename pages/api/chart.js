export default async function handler(req, res) {
  const { symbol, scanner } = req.query;
  if (!symbol) return res.status(400).json({ error: "Symbol required" });

  const apiToken = process.env.EODHD_API_KEY || "";
  const days = scanner === "1" ? 300 : 90;
  const fromDate = getDateDaysAgo(days);

  // محاولة 1: EODHD
  try {
    const url = `https://eodhd.com/api/eod/${symbol}?api_token=${apiToken}&fmt=json&period=d&order=a&from=${fromDate}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length >= 5) {
        const chart = data.map(d => ({
          date: formatDate(d.date),
          open: +d.open, high: +d.high, low: +d.low,
          close: +(d.adjusted_close || d.close),
          volume: +d.volume,
        })).filter(d => d.close > 0);
        if (chart.length >= 5) {
          return res.status(200).json({ chart, source: "EODHD", days: chart.length });
        }
      }
    }
  } catch (e) {
    console.log("EODHD failed:", e.message);
  }

  // محاولة 2: Yahoo Finance
  try {
    const range = days > 90 ? "1y" : "3mo";
    const yahooSym = encodeURIComponent(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSym}?range=${range}&interval=1d&includePrePost=false`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(8000)
    });
    if (response.ok) {
      const data = await response.json();
      const result = data.chart?.result?.[0];
      if (result) {
        const timestamps = result.timestamp || [];
        const q = result.indicators?.quote?.[0] || {};
        const adjClose = result.indicators?.adjclose?.[0]?.adjclose || [];
        const chart = timestamps.map((t, i) => ({
          date: formatDate(new Date(t * 1000).toISOString().split("T")[0]),
          open: +(q.open?.[i] || 0).toFixed(2),
          high: +(q.high?.[i] || 0).toFixed(2),
          low: +(q.low?.[i] || 0).toFixed(2),
          close: +(adjClose[i] || q.close?.[i] || 0).toFixed(2),
          volume: q.volume?.[i] || 0,
        })).filter(d => d.close > 0);
        if (chart.length >= 5) {
          return res.status(200).json({ chart, source: "Yahoo", days: chart.length });
        }
      }
    }
  } catch (e) {
    console.log("Yahoo failed:", e.message);
  }

  // محاولة 3: Yahoo بدون .SR
  try {
    const symNoSR = symbol.replace(".SR", "") + ".SR";
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symNoSR)}?range=3mo&interval=1d`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000)
    });
    if (response.ok) {
      const data = await response.json();
      const result = data.chart?.result?.[0];
      if (result) {
        const timestamps = result.timestamp || [];
        const q = result.indicators?.quote?.[0] || {};
        const chart = timestamps.map((t, i) => ({
          date: formatDate(new Date(t * 1000).toISOString().split("T")[0]),
          open: +(q.open?.[i] || 0).toFixed(2),
          high: +(q.high?.[i] || 0).toFixed(2),
          low: +(q.low?.[i] || 0).toFixed(2),
          close: +(q.close?.[i] || 0).toFixed(2),
          volume: q.volume?.[i] || 0,
        })).filter(d => d.close > 0);
        if (chart.length >= 5) {
          return res.status(200).json({ chart, source: "Yahoo2", days: chart.length });
        }
      }
    }
  } catch (e) {
    console.log("Yahoo2 failed:", e.message);
  }

  // لا توجد بيانات
  return res.status(200).json({ chart: [], source: "unavailable", days: 0 });
}

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}
