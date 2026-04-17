const US_STOCKS = [
  // Penny Stocks $1-$5
  {symbol:"VERB",name:"Verb Technology"},{symbol:"BNGO",name:"Bionano Genomics"},
  {symbol:"AREB",name:"American Rebel"},{symbol:"SGBX",name:"SG Blocks"},
  {symbol:"CJET",name:"China Jet"},{symbol:"CLPS",name:"CLPS Technology"},
  {symbol:"MBOT",name:"Microbot Medical"},{symbol:"RCAT",name:"Red Cat Holdings"},
  {symbol:"KAVL",name:"Kaival Brands"},{symbol:"ONDS",name:"Ondas Holdings"},
  {symbol:"SHOT",name:"Safety Shot"},{symbol:"ABAT",name:"American Battery"},
  {symbol:"INPX",name:"Inpixon"},{symbol:"AULT",name:"Ault Alliance"},
  {symbol:"DPRO",name:"Draganfly"},{symbol:"WISA",name:"WiSA Technologies"},
  {symbol:"PBTS",name:"Powerbridge Tech"},{symbol:"SINT",name:"Sintx Technologies"},
  {symbol:"EFTR",name:"eFFECTOR Therap"},{symbol:"AGRI",name:"AgriFORCE"},
  // $5-$15
  {symbol:"MARA",name:"Marathon Digital"},{symbol:"RIOT",name:"Riot Platforms"},
  {symbol:"CIFR",name:"Cipher Mining"},{symbol:"BITF",name:"Bitfarms"},
  {symbol:"HUT",name:"Hut 8 Mining"},{symbol:"CLSK",name:"CleanSpark"},
  {symbol:"IREN",name:"Iris Energy"},{symbol:"WULF",name:"TeraWulf"},
  {symbol:"MVIS",name:"MicroVision"},{symbol:"PLUG",name:"Plug Power"},
  {symbol:"FCEL",name:"FuelCell Energy"},{symbol:"BLNK",name:"Blink Charging"},
  {symbol:"NKLA",name:"Nikola"},{symbol:"GOEV",name:"Canoo"},
  {symbol:"GEVO",name:"Gevo"},{symbol:"TELL",name:"Tellurian"},
  {symbol:"SAVA",name:"Cassava Sciences"},{symbol:"AGEN",name:"Agenus"},
  {symbol:"NVAX",name:"Novavax"},{symbol:"OCGN",name:"Ocugen"},
  {symbol:"OPEN",name:"Opendoor"},{symbol:"CLOV",name:"Clover Health"},
  {symbol:"LMND",name:"Lemonade"},{symbol:"SPCE",name:"Virgin Galactic"},
  {symbol:"LUMN",name:"Lumen Tech"},{symbol:"AMC",name:"AMC Entertainment"},
  {symbol:"NIO",name:"Nio Inc"},{symbol:"XPEV",name:"XPeng"},
  {symbol:"BILI",name:"Bilibili"},{symbol:"DOYU",name:"DouYu"},
  {symbol:"HUYA",name:"Huya"},{symbol:"TIGR",name:"Tiger Brokers"},
  {symbol:"REI",name:"Ring Energy"},{symbol:"NOG",name:"Northern Oil"},
  {symbol:"ADMA",name:"ADMA Biologics"},{symbol:"IMVT",name:"Immunovant"},
  {symbol:"UWMC",name:"UWM Holdings"},{symbol:"GPMT",name:"Granite Point"},
  {symbol:"SIRI",name:"Sirius XM"},{symbol:"PARA",name:"Paramount"},
];

export default async function handler(req, res) {
  const apiToken = process.env.EODHD_API_KEY || "";
  const results = [];
  const fromDate = getDateDaysAgo(60);

  const minPrice = parseFloat(req.query.minPrice || "1");
  const maxPrice = parseFloat(req.query.maxPrice || "5");

  await Promise.allSettled(US_STOCKS.map(async stock => {
    try {
      const url = `https://eodhd.com/api/eod/${stock.symbol}.US?api_token=${apiToken}&fmt=json&period=d&order=a&from=${fromDate}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data) || data.length < 10) return;

      const closes = data.map(d => +(d.adjusted_close || d.close));
      const vols = data.map(d => +d.volume);
      const highs = data.map(d => +d.high);
      const lows = data.map(d => +d.low);
      const price = closes[closes.length - 1];

      if (price <= 0 || price < minPrice || price > maxPrice) return;

      const lastVol = vols[vols.length - 1];
      const avgVol20 = vols.slice(-21, -1).reduce((a, v) => a + v, 0) / 20;
      const volChange = avgVol20 > 0 ? ((lastVol - avgVol20) / avgVol20) * 100 : 0;
      const relVol = avgVol20 > 0 ? lastVol / avgVol20 : 0;
      const prevClose = closes[closes.length - 2];
      const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
      const high10 = Math.max(...highs.slice(-11, -1));
      const rsi = calcRSI(closes);

      const c1 = lastVol >= 500000;
      const c2 = volChange >= 100;
      const c3 = relVol >= 2;
      const c4 = changePercent > 0;
      const c5 = changePercent >= 1.0;
      const c6 = price >= high10 * 0.98;
      const c7 = rsi < 75;

      const score = [c1, c2, c3, c4, c5, c6, c7].filter(Boolean).length;

      if (c1 && c2 && c3 && c4 && score >= 5) {
        const atr = calcATR(highs, lows, closes);
        const targetPct = atr > 0 ? Math.min((atr / price) * 2.5, 0.07) : 0.03;
        const stopPct = atr > 0 ? Math.max((atr / price) * 0.8, 0.01) : 0.015;
        const target = (price * (1 + targetPct)).toFixed(2);
        const stop = (price * (1 - stopPct)).toFixed(2);
        const profitPct = ((target - price) / price * 100).toFixed(1);
        const strength = score === 7 ? "🔥 ممتاز" : score === 6 ? "⭐ قوي" : "✅ جيد";

        results.push({
          symbol: stock.symbol,
          name: stock.name,
          price, rsi,
          volExplosion: relVol.toFixed(1),
          volChange: volChange.toFixed(0),
          candleChange: changePercent.toFixed(1),
          vol: lastVol,
          avgVol: Math.round(avgVol20),
          score,
          conditions: { c1, c2, c3, c4, c5, c6, c7 },
          target, stop, profitPct, strength,
          currency: "USD"
        });
      }
    } catch (e) {}
  }));

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return parseFloat(b.volExplosion) - parseFloat(a.volExplosion);
  });

  res.status(200).json({ results: results.slice(0, 15), total: results.length });
}

function calcRSI(c, p = 14) {
  if (c.length < p + 1) return 50;
  let ag = 0, al = 0;
  for (let i = 1; i <= p; i++) { const d = c[i] - c[i-1]; if (d > 0) ag += d; else al -= d; }
  ag /= p; al /= p;
  for (let i = p + 1; i < c.length; i++) {
    const d = c[i] - c[i-1];
    ag = (ag * (p-1) + (d > 0 ? d : 0)) / p;
    al = (al * (p-1) + (d < 0 ? -d : 0)) / p;
  }
  return al === 0 ? 100 : 100 - 100 / (1 + ag / al);
}

function calcATR(h, l, c, p = 14) {
  if (c.length < p + 1) return 0;
  let s = 0;
  for (let i = c.length - p; i < c.length; i++)
    s += Math.max(h[i]-l[i], Math.abs(h[i]-c[i-1]), Math.abs(l[i]-c[i-1]));
  return s / p;
}

function getDateDaysAgo(days) {
  const d = new Date(); d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}
