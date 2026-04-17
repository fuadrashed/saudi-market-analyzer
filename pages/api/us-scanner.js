// قائمة أسهم أمريكية نشطة - تشمل Penny Stocks $1-$5 والأسهم الرخيصة حتى $25
const US_STOCKS = [
  // Penny Stocks $1-$5 المتقلبة
  {symbol:\"VERB\",name:\"Verb Technology\"},{symbol:\"MDJH\",name:\"MDJM Ltd\"},
  {symbol:\"AREB\",name:\"American Rebel\"},{symbol:\"SGBX\",name:\"SG Blocks\"},
  {symbol:\"CJET\",name:\"China Jet\"},{symbol:\"CLPS\",name:\"CLPS Technology\"},
  {symbol:\"MBOT\",name:\"Microbot Medical\"},{symbol:\"BSFC\",name:\"Blue Star Foods\"},
  {symbol:\"LIQT\",name:\"LiqTech Intl\"},{symbol:\"RCAT\",name:\"Red Cat Holdings\"},
  {symbol:\"KAVL\",name:\"Kaival Brands\"},{symbol:\"HPNN\",name:\"Hop-On Inc\"},
  {symbol:\"ATNF\",name:\"180 Life Sciences\"},{symbol:\"LGVN\",name:\"Longeviti Neuro\"},
  {symbol:\"BNGO\",name:\"Bionano Genomics\"},{symbol:\"SINT\",name:\"Sintx Technologies\"},
  {symbol:\"ONDS\",name:\"Ondas Holdings\"},{symbol:\"SHOT\",name:\"Safety Shot\"},
  {symbol:\"ABAT\",name:\"American Battery\"},{symbol:\"AEYE\",name:\"AudioEye\"},
  {symbol:\"INPX\",name:\"Inpixon\"},{symbol:\"CXAI\",name:\"CXApp\"},
  {symbol:\"AULT\",name:\"Ault Alliance\"},{symbol:\"DPRO\",name:\"Draganfly\"},
  {symbol:\"AGRI\",name:\"AgriFORCE\"},{symbol:\"EFTR\",name:\"eFFECTOR Therap\"},
  {symbol:\"TPVG\",name:\"TriplePoint Venture\"},{symbol:\"SPGX\",name:\"Sustainable Green\"},
  {symbol:\"WISA\",name:\"WiSA Technologies\"},{symbol:\"PBTS\",name:\"Powerbridge Tech\"},

  // تقنية
  {symbol:"MARA",name:"Marathon Digital"},{symbol:"RIOT",name:"Riot Platforms"},
  {symbol:"CIFR",name:"Cipher Mining"},{symbol:"BITF",name:"Bitfarms"},
  {symbol:"HUT",name:"Hut 8 Mining"},{symbol:"CLSK",name:"CleanSpark"},
  {symbol:"IREN",name:"Iris Energy"},{symbol:"BTBT",name:"Bit Digital"},
  {symbol:"WULF",name:"TeraWulf"},{symbol:"CORZ",name:"Core Scientific"},
  {symbol:"MVIS",name:"MicroVision"},{symbol:"IDEX",name:"Ideanomics"},
  {symbol:"HEAR",name:"Turtle Beach"},{symbol:"CODA",name:"Coda Octopus"},
  {symbol:"PXLW",name:"Pixelworks"},{symbol:"KOPN",name:"Kopin Corp"},
  // طاقة وسيارات
  {symbol:"PLUG",name:"Plug Power"},{symbol:"FCEL",name:"FuelCell Energy"},
  {symbol:"BLNK",name:"Blink Charging"},{symbol:"NKLA",name:"Nikola"},
  {symbol:"GOEV",name:"Canoo"},{symbol:"WKHS",name:"Workhorse"},
  {symbol:"RIDE",name:"Lordstown Motors"},{symbol:"SOLO",name:"Electrameccanica"},
  {symbol:"FFIE",name:"Faraday Future"},{symbol:"MULN",name:"Mullen Auto"},
  {symbol:"GEVO",name:"Gevo"},{symbol:"TELL",name:"Tellurian"},
  {symbol:"REI",name:"Ring Energy"},{symbol:"NOG",name:"Northern Oil"},
  // بايوتك
  {symbol:"SAVA",name:"Cassava Sciences"},{symbol:"AGEN",name:"Agenus"},
  {symbol:"NVAX",name:"Novavax"},{symbol:"ADMA",name:"ADMA Biologics"},
  {symbol:"CRIS",name:"Curis"},{symbol:"APTO",name:"Aptose Biosciences"},
  {symbol:"NKTR",name:"Nektar Therapeutics"},{symbol:"SRNE",name:"Sorrento"},
  {symbol:"OCGN",name:"Ocugen"},{symbol:"ATOS",name:"Athenex"},
  {symbol:"IMVT",name:"Immunovant"},{symbol:"ADTX",name:"Aditxt"},
  {symbol:"PRTK",name:"Paratek Pharma"},{symbol:"ACST",name:"Acasti Pharma"},
  // تجزئة وخدمات
  {symbol:"OPEN",name:"Opendoor"},{symbol:"CLOV",name:"Clover Health"},
  {symbol:"LMND",name:"Lemonade"},{symbol:"BARK",name:"BarkBox"},
  {symbol:"WISH",name:"ContextLogic"},{symbol:"SPCE",name:"Virgin Galactic"},
  {symbol:"UWMC",name:"UWM Holdings"},{symbol:"PRPL",name:"Purple Innovation"},
  {symbol:"BBIG",name:"Vinco Ventures"},{symbol:"EXPR",name:"Express Inc"},
  {symbol:"NAKD",name:"Naked Brand"},{symbol:"KOSS",name:"Koss Corp"},
  // مالية
  {symbol:"CURO",name:"CURO Group"},{symbol:"GPMT",name:"Granite Point"},
  {symbol:"BRSP",name:"BrightSpire"},{symbol:"ACRE",name:"Ares Commercial"},
  {symbol:"HONE",name:"HarborOne"},{symbol:"ATLC",name:"Atlanticus Holdings"},
  // اتصالات وميديا
  {symbol:"LUMN",name:"Lumen Tech"},{symbol:"SIRI",name:"Sirius XM"},
  {symbol:"PARA",name:"Paramount"},{symbol:"AMC",name:"AMC Entertainment"},
  {symbol:"CINE",name:"Cinemark"},{symbol:"IMAX",name:"IMAX Corp"},
  // صناعة
  {symbol:"SOLO",name:"Electrameccanica"},{symbol:"ZKIN",name:"ZK International"},
  {symbol:"SHIP",name:"Seanergy Maritime"},{symbol:"EDSA",name:"Edesa Biotech"},
  {symbol:"TRKA",name:"Troika Media"},{symbol:"EEIQ",name:"Elite Education"},
  // صناديق وETF متقلبة
  {symbol:"SOXS",name:"Direxion Semi Bear"},{symbol:"LABD",name:"Direxion Bio Bear"},
  {symbol:"DRIP",name:"Direxion Oil Bear"},{symbol:"UVXY",name:"ProShares VIX"},
  {symbol:"VIXY",name:"ProShares VIX Short"},{symbol:"SDOW",name:"UltraPro Short DOW"},
  // صينية مدرجة أمريكا
  {symbol:"NIO",name:"Nio Inc"},{symbol:"XPEV",name:"XPeng"},
  {symbol:"LI",name:"Li Auto"},{symbol:"NTES",name:"NetEase"},
  {symbol:"BILI",name:"Bilibili"},{symbol:"DOYU",name:"DouYu"},
  {symbol:"HUYA",name:"Huya"},{symbol:"QFIN",name:"360 Finance"},
  {symbol:"BTRS",name:"Billtrust"},{symbol:"TIGR",name:"Tiger Brokers"},
];

export default async function handler(req, res) {
  const apiToken = process.env.EODHD_API_KEY || "";
  const results = [];
  const fromDate = getDateDaysAgo(60);

  // فلتر السعر من الـ query — الافتراضي $1-$5 (Penny Stocks)
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

      // فلتر السعر حسب النطاق المحدد
      if (price <= 0 || price < minPrice || price > maxPrice) return;

      const lastVol = vols[vols.length - 1];

      // شرط 1: حجم أكثر من 500K
      const c1 = lastVol >= 500000;

      // شرط 2: تغير الحجم أكثر من 100% (ضعف المتوسط)
      const avgVol20 = vols.slice(-21, -1).reduce((a, v) => a + v, 0) / 20;
      const volChange = avgVol20 > 0 ? ((lastVol - avgVol20) / avgVol20) * 100 : 0;
      const c2 = volChange >= 100;

      // شرط 3: الحجم النسبي أكبر من 2
      const relVol = avgVol20 > 0 ? lastVol / avgVol20 : 0;
      const c3 = relVol >= 2;

      // شرط 4: التغير اليومي أكثر من 0% (صاعد)
      const prevClose = closes[closes.length - 2];
      const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
      const c4 = changePercent > 0;

      // شرط 5: شمعة خضراء قوية (أكثر من 1%)
      const c5 = changePercent >= 1.0;

      // شرط 6: كسر أعلى سعر في 10 أيام
      const high10 = Math.max(...highs.slice(-11, -1));
      const c6 = price >= high10 * 0.98;

      // شرط 7: RSI مناسب (ليس متشبعاً)
      const rsi = calcRSI(closes);
      const c7 = rsi < 75;

      const score = [c1, c2, c3, c4, c5, c6, c7].filter(Boolean).length;

      // لازم يحقق: حجم 500K + تغير حجم 100% + حجم نسبي 2x + صاعد + 2 شروط أخرى
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

  // ترتيب حسب الحجم النسبي
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
