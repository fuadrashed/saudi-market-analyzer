export default async function handler(req, res) {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "Symbol required" });

  const apiToken = process.env.EODHD_API_KEY || "";

  // محاولة 1: EODHD real-time
  try {
    const liveUrl = `https://eodhd.com/api/real-time/${symbol}?api_token=${apiToken}&fmt=json`;
    const liveRes = await fetch(liveUrl, { signal: AbortSignal.timeout(8000) });
    if (!liveRes.ok) throw new Error(`EODHD error: ${liveRes.status}`);
    const live = await liveRes.json();

    // جلب بيانات تاريخية للسبارك لاين
    const eodUrl = `https://eodhd.com/api/eod/${symbol}?api_token=${apiToken}&fmt=json&period=d&order=d&from=${getDateDaysAgo(30)}`;
    const eodRes = await fetch(eodUrl, { signal: AbortSignal.timeout(8000) });
    let sparkline = [];
    if (eodRes.ok) {
      const eodData = await eodRes.json();
      if (Array.isArray(eodData) && eodData.length > 0) {
        sparkline = eodData.slice(0, 20).reverse().map(d => d.close);
      }
    }

    const price = +(live.close || live.previousClose || 0);
    const prevClose = +(live.previousClose || price);
    const high = +(live.high || price);
    const low = +(live.low || price);
    const open = +(live.open || price);

    // تحقق إن high وlow منطقيين
    const validHigh = high >= price ? high : price * 1.005;
    const validLow = low <= price && low > 0 ? low : price * 0.995;

    return res.status(200).json({
      price,
      open,
      high: validHigh,
      low: validLow,
      volume: live.volume || 0,
      changePercent: live.change_p !== undefined ? +live.change_p : prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
      previousClose: prevClose,
      marketCap: price * (live.volume || 1e6),
      sparkline,
      currency: "SAR",
      source: "EODHD",
    });
  } catch (e) {
    console.log("EODHD stock error:", e.message);
  }

  // محاولة 2: Yahoo Finance
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
    const res2 = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000)
    });
    if (!res2.ok) throw new Error("Yahoo error");
    const data = await res2.json();
    const result = data.chart?.result?.[0];
    if (result) {
      const meta = result.meta;
      const quote = result.indicators?.quote?.[0];
      const closes = (quote?.close || []).filter(v => v != null);
      const price = +(meta.regularMarketPrice || closes[closes.length - 1] || 0);
      const prevClose = +(meta.chartPreviousClose || meta.previousClose || price);
      const high = +(meta.regularMarketDayHigh || Math.max(...(quote?.high || [price]).filter(Boolean)));
      const low = +(meta.regularMarketDayLow || Math.min(...(quote?.low || [price]).filter(v => v > 0)));
      const volume = meta.regularMarketVolume || 0;

      return res.status(200).json({
        price,
        open: +(meta.regularMarketOpen || price),
        high: high > 0 ? high : price * 1.005,
        low: low > 0 && low <= price ? low : price * 0.995,
        volume,
        changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
        previousClose: prevClose,
        marketCap: +(meta.marketCap || price * 1e8),
        sparkline: closes.slice(-20),
        currency: "SAR",
        source: "Yahoo",
      });
    }
  } catch (e) {
    console.log("Yahoo stock error:", e.message);
  }

  return res.status(200).json({ price: 0, error: "No data available" });
}

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}
