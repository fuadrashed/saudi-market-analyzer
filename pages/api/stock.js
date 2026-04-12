export default async function handler(req, res) {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "Symbol required" });

  const apiToken = process.env.EODHD_API_KEY || "";
  // Convert symbol: "2222.SR" -> "2222.SR" for EODHD (Saudi exchange code is SR)
  const eodhSymbol = symbol.replace(".SR", ".SR");

  try {
    // Fetch live (delayed) data
    const liveUrl = `https://eodhd.com/api/real-time/${eodhSymbol}?api_token=${apiToken}&fmt=json`;
    const liveRes = await fetch(liveUrl);
    if (!liveRes.ok) throw new Error(`EODHD live error: ${liveRes.status}`);
    const live = await liveRes.json();

    // Fetch EOD data for sparkline (last 20 days)
    const eodUrl = `https://eodhd.com/api/eod/${eodhSymbol}?api_token=${apiToken}&fmt=json&period=d&order=d&from=${getDateDaysAgo(30)}`;
    const eodRes = await fetch(eodUrl);
    let sparkline = [];
    let yearHigh = null, yearLow = null;
    if (eodRes.ok) {
      const eodData = await eodRes.json();
      if (Array.isArray(eodData) && eodData.length > 0) {
        sparkline = eodData.slice(0, 20).reverse().map(d => d.close);
        yearHigh = Math.max(...eodData.map(d => d.high));
        yearLow = Math.min(...eodData.map(d => d.low));
      }
    }

    const price = live.close || live.previousClose || 0;
    const prevClose = live.previousClose || price;
    const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

    res.status(200).json({
      price: price,
      open: live.open || price,
      high: live.high || price,
      low: live.low || price,
      volume: live.volume || 0,
      changePercent: live.change_p !== undefined ? live.change_p : changePercent,
      previousClose: prevClose,
      marketCap: price * (live.volume || 1) * 50,
      yearHigh,
      yearLow,
      sparkline,
      currency: "SAR",
      source: "EODHD",
      timestamp: live.timestamp || null,
    });
  } catch (error) {
    console.error("EODHD error:", error.message);
    // Fallback to Yahoo Finance
    try {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
      const yahooRes = await fetch(yahooUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (yahooRes.ok) {
        const data = await yahooRes.json();
        const result = data.chart?.result?.[0];
        if (result) {
          const meta = result.meta;
          const quote = result.indicators?.quote?.[0];
          const closes = quote?.close?.filter(v => v != null) || [];
          const price = meta.regularMarketPrice || closes[closes.length - 1] || 0;
          const prevClose = meta.chartPreviousClose || price;
          return res.status(200).json({
            price, open: quote?.open?.filter(v => v != null).pop() || price,
            high: Math.max(...(quote?.high?.filter(v => v != null) || [price])),
            low: Math.min(...(quote?.low?.filter(v => v != null) || [price])),
            volume: (quote?.volume?.filter(v => v != null) || [0]).pop() || 0,
            changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0,
            previousClose: prevClose, marketCap: price * 1e8,
            yearHigh: meta.fiftyTwoWeekHigh || null, yearLow: meta.fiftyTwoWeekLow || null,
            sparkline: closes.slice(-20), currency: "SAR", source: "Yahoo (fallback)",
          });
        }
      }
      throw new Error("Yahoo also failed");
    } catch {
      // Final fallback: mock data
      const basePrice = getBasePrice(symbol);
      const change = (Math.random() - 0.45) * 4;
      const p = basePrice * (1 + change / 100);
      res.status(200).json({
        price: p, open: p * (1 + (Math.random() - 0.5) * 0.01),
        high: p * (1 + Math.random() * 0.02), low: p * (1 - Math.random() * 0.02),
        volume: Math.floor(Math.random() * 20e6 + 1e6), changePercent: change,
        previousClose: basePrice, marketCap: p * 1e9,
        yearHigh: p * 1.15, yearLow: p * 0.85,
        sparkline: Array.from({ length: 20 }, (_, i) => p * (1 + Math.sin(i / 3) * 0.02)),
        currency: "SAR", source: "mock", isMock: true,
      });
    }
  }
}

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function getBasePrice(symbol) {
  const prices = { "2222.SR": 28.5, "1120.SR": 95.8, "1180.SR": 37.2, "2010.SR": 72.5, "7010.SR": 42.3,
    "1010.SR": 28.9, "1150.SR": 27.5, "2280.SR": 52.4, "4030.SR": 38.6, "1211.SR": 48.7,
    "4190.SR": 155, "4003.SR": 36.5, "2050.SR": 33.7, "8010.SR": 98.2, "2350.SR": 14.8 };
  return prices[symbol] || 50 + Math.random() * 100;
}
