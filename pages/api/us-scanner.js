// قائمة أسهم أمريكية $5-$10 نشطة ومعروفة
const US_STOCKS = [
  // تقنية وإنترنت
  {symbol:"HEAR",name:"Turtle Beach"},{symbol:"MARA",name:"Marathon Digital"},{symbol:"RIOT",name:"Riot Platforms"},
  {symbol:"CIFR",name:"Cipher Mining"},{symbol:"BITF",name:"Bitfarms"},{symbol:"HUT",name:"Hut 8 Mining"},
  {symbol:"CLSK",name:"CleanSpark"},{symbol:"IREN",name:"Iris Energy"},{symbol:"BTBT",name:"Bit Digital"},
  {symbol:"WULF",name:"TeraWulf"},{symbol:"ARBK",name:"Argo Blockchain"},{symbol:"CORZ",name:"Core Scientific"},
  // طاقة
  {symbol:"TELL",name:"Tellurian"},{symbol:"GEVO",name:"Gevo"},{symbol:"PLUG",name:"Plug Power"},
  {symbol:"FCEL",name:"FuelCell Energy"},{symbol:"BLNK",name:"Blink Charging"},{symbol:"SRM",name:"SRM Entertainment"},
  {symbol:"NKLA",name:"Nikola"},{symbol:"GOEV",name:"Canoo"},{symbol:"WKHS",name:"Workhorse"},
  // بايوتك وصحة
  {symbol:"SAVA",name:"Cassava Sciences"},{symbol:"MDJH",name:"MDJM Ltd"},{symbol:"CRIS",name:"Curis"},
  {symbol:"AGEN",name:"Agenus"},{symbol:"NVAX",name:"Novavax"},{symbol:"ADMA",name:"ADMA Biologics"},
  {symbol:"PRAX",name:"Praxis Precision"},{symbol:"APTO",name:"Aptose Biosciences"},
  // تجزئة وخدمات
  {symbol:"BBBY",name:"Beyond Inc"},{symbol:"EXPR",name:"Express Inc"},{symbol:"CLOV",name:"Clover Health"},
  {symbol:"LMND",name:"Lemonade"},{symbol:"OPEN",name:"Opendoor"},{symbol:"BARK",name:"BarkBox"},
  {symbol:"WISH",name:"ContextLogic"},{symbol:"SPCE",name:"Virgin Galactic"},
  // مالية وتأمين  
  {symbol:"UWMC",name:"UWM Holdings"},{symbol:"CURO",name:"CURO Group"},{symbol:"HSAQ",name:"Health Assurance"},
  {symbol:"OPES",name:"Opes Acquisition"},{symbol:"MILE",name:"Metromile"},
  // صناعة وتصنيع
  {symbol:"MVIS",name:"MicroVision"},{symbol:"IDEX",name:"Ideanomics"},{symbol:"SOLO",name:"Electrameccanica"},
  {symbol:"XPEV",name:"XPeng"},{symbol:"LI",name:"Li Auto"},{symbol:"NIO",name:"Nio"},
  {symbol:"FFIE",name:"Faraday Future"},{symbol:"MULN",name:"Mullen Auto"},
  // اتصالات وميديا
  {symbol:"TMUS",name:"T-Mobile"},{symbol:"LUMN",name:"Lumen Tech"},{symbol:"SIRI",name:"Sirius XM"},
  {symbol:"PARA",name:"Paramount"},{symbol:"AMC",name:"AMC Networks"},
  // عقارات وصناديق
  {symbol:"BRSP",name:"BrightSpire Capital"},{symbol:"GPMT",name:"Granite Point Mortgage"},
  {symbol:"ACRE",name:"Ares Commercial Real Estate"},{symbol:"HONE",name:"HarborOne Bancorp"},
];

export default async function handler(req, res) {
  const apiToken = process.env.EODHD_API_KEY || "";
  const results = [];
  const fromDate = getDateDaysAgo(90);

  await Promise.allSettled(US_STOCKS.map(async stock => {
    try {
      // جلب بيانات تاريخية من EODHD
      const url = `https://eodhd.com/api/eod/${stock.symbol}.US?api_token=${apiToken}&fmt=json&period=d&order=a&from=${fromDate}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data) || data.length < 15) return;

      const closes = data.map(d => +(d.adjusted_close || d.close));
      const vols = data.map(d => +d.volume);
      const highs = data.map(d => +d.high);
      const lows = data.map(d => +d.low);
      const price = closes[closes.length - 1];

      // فلتر السعر $5-$10
      if (price < 5 || price > 10) return;

      const lastVol = vols[vols.length - 1];
      const avgVol20 = vols.slice(-21, -1).reduce((a, v) => a + v, 0) / 20;
      const volExplosion = avgVol20 > 0 ? lastVol / avgVol20 : 0;

      // شرط انفجار الحجم
      const c1 = volExplosion >= 2.0;

      // كسر المقاومة
      const high10 = Math.max(...highs.slice(-11, -1));
      const c2 = price >= high10 * 0.99;

      // هدوء قبلها
      const avgVol10 = vols.slice(-11, -1).reduce((a, v) => a + v, 0) / 10;
      const c3 = avgVol10 < avgVol20 * 1.2;

      // شمعة خضراء قوية
      const prevClose = closes[closes.length - 2];
      const candleChange = ((price - prevClose) / prevClose) * 100;
      const c4 = candleChange >= 1.0;

      // RSI مناسب
      const rsi = calcRSI(closes);
      const c5 = rsi < 70;

      const score = [c1, c2, c3, c4, c5].filter(Boolean).length;

      if (c1 && score >= 3) {
        const atr = calcATR(highs, lows, closes);
        const targetPct = atr > 0 ? Math.min((atr / price) * 2.5, 0.06) : 0.03;
        const stopPct = atr > 0 ? Math.max((atr / price) * 0.8, 0.01) : 0.015;
        const target = (price * (1 + targetPct)).toFixed(2);
        const stop = (price * (1 - stopPct)).toFixed(2);
        const profitPct = ((target - price) / price * 100).toFixed(1);
        const strength = score === 5 ? "🔥 ممتاز" : score === 4 ? "⭐ قوي" : "✅ جيد";

        results.push({
          symbol: stock.symbol,
          name: stock.name,
          price, rsi,
          volExplosion: volExplosion.toFixed(1),
          candleChange: candleChange.toFixed(1),
          vol: lastVol, avgVol: avgVol20,
          score, conditions: { c1, c2, c3, c4, c5 },
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
