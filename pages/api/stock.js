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
  const prices = {
    // البنوك
    "1010.SR": 27.7,  "1020.SR": 11.4,  "1030.SR": 12.7,  "1050.SR": 18.9,  "1060.SR": 34.5,
    "1080.SR": 20.6,  "1111.SR": 139.6, "1120.SR": 101.0, "1140.SR": 26.0,  "1150.SR": 28.3,
    "1180.SR": 40.9,  "1182.SR": 10.1,  "1183.SR": 14.2,
    // البتروكيماويات
    "2001.SR": 6.6,   "2010.SR": 55.3,  "2020.SR": 132.9, "2040.SR": 27.3,  "2060.SR": 8.6,
    "2090.SR": 18.5,  "2110.SR": 22.4,  "2160.SR": 17.8,  "2210.SR": 14.2,  "2230.SR": 31.5,
    "2250.SR": 28.4,  "2290.SR": 52.1,  "2310.SR": 22.4,  "2330.SR": 64.3,  "2350.SR": 14.8,
    "2380.SR": 9.8,   "4361.SR": 18.2,
    // الطاقة
    "2080.SR": 78.8,  "2081.SR": 56.3,  "2082.SR": 14.6,  "2120.SR": 47.1,  "2200.SR": 38.5,
    "2222.SR": 28.5,  "2381.SR": 9.8,   "4071.SR": 24.5,  "4200.SR": 68.4,
    // الأسمنت
    "3007.SR": 22.5,  "3009.SR": 14.8,  "3010.SR": 48.5,  "3020.SR": 28.6,  "3030.SR": 75.2,
    "3040.SR": 64.1,  "3050.SR": 70.3,  "3060.SR": 38.4,  "3080.SR": 35.6,  "3090.SR": 22.4,
    "3091.SR": 18.3,  "3093.SR": 19.2,  "3002.SR": 16.5,  "3003.SR": 15.8,  "3004.SR": 14.2,
    "3005.SR": 17.6,
    // التجزئة
    "4001.SR": 42.5,  "4003.SR": 36.5,  "4007.SR": 28.3,  "4011.SR": 52.4,  "4014.SR": 18.9,
    "4050.SR": 26.8,  "4051.SR": 34.2,  "4140.SR": 45.6,  "4160.SR": 12.4,  "4165.SR": 16.8,
    "4180.SR": 14.6,  "4190.SR": 155.0, "4240.SR": 18.4,  "4350.SR": 22.6,
    // الاتصالات وتقنية المعلومات
    "7010.SR": 42.3,  "7020.SR": 14.8,  "7030.SR": 10.5,  "7040.SR": 3.5,
    "7201.SR": 182.0, "7202.SR": 145.0, "7203.SR": 536.0, "7204.SR": 24.5,
    // الأغذية
    "2050.SR": 21.9,  "2100.SR": 28.6,  "2270.SR": 213.3, "2280.SR": 52.4,  "2281.SR": 88.4,
    "2282.SR": 34.5,  "6001.SR": 52.3,  "6002.SR": 38.4,  "6004.SR": 78.5,
    "6012.SR": 22.4,  "6013.SR": 18.6,  "6014.SR": 32.4,  "6015.SR": 28.6,  "6016.SR": 26.8,
    "6090.SR": 38.5,  "4222.SR": 38.4,  "4220.SR": 48.6,  "4221.SR": 22.4,  "2283.SR": 18.6,
    // الزراعة
    "6010.SR": 28.4,  "6020.SR": 14.6,  "6040.SR": 22.5,  "6050.SR": 18.4,  "6060.SR": 12.6,
    "6070.SR": 16.8,  "4338.SR": 24.5,  "4339.SR": 18.6,
    // التأمين
    "4015.SR": 145.0, "8010.SR": 98.2,  "8020.SR": 16.4,  "8030.SR": 28.6,  "8040.SR": 42.5,
    "8050.SR": 14.8,  "8060.SR": 22.4,  "8070.SR": 38.6,  "8100.SR": 32.4,  "8110.SR": 18.6,
    "8120.SR": 14.8,  "8130.SR": 22.4,  "8150.SR": 38.5,  "8160.SR": 16.8,  "8170.SR": 12.6,
    "8180.SR": 28.4,  "8190.SR": 22.5,  "8200.SR": 42.6,  "8210.SR": 18.4,  "8230.SR": 24.5,
    "8240.SR": 38.5,  "8250.SR": 14.6,  "8260.SR": 16.8,  "8270.SR": 22.4,  "8280.SR": 18.6,
    "8300.SR": 28.5,  "8310.SR": 14.8,  "8311.SR": 145.0, "8312.SR": 16.4,
    // الصحة
    "2070.SR": 27.0,  "4002.SR": 88.5,  "4004.SR": 78.4,  "4005.SR": 42.6,  "4013.SR": 250.0,
    "4150.SR": 48.5,  "4230.SR": 68.4,
    // المرافق
    "2083.SR": 22.4,  "5110.SR": 14.6,
    // الصناعة
    "1201.SR": 5.4,   "1202.SR": 17.2,  "1210.SR": 24.0,  "1211.SR": 71.4,  "1212.SR": 135.9,
    "1213.SR": 22.5,  "1214.SR": 15.8,  "1301.SR": 16.5,  "1302.SR": 42.5,  "1303.SR": 15.9,
    "1304.SR": 36.5,  "1320.SR": 37.2,  "1321.SR": 136.0, "1322.SR": 91.0,  "1323.SR": 24.2,
    "1820.SR": 1.7,   "1832.SR": 2.5,
  };
  return prices[symbol] || 20;
}
