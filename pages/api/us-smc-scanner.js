const US_SMC_STOCKS = [
  // تقنية كبيرة
  {symbol:"NVDA",name:"Nvidia",sector:"تقنية"},{symbol:"AMD",name:"AMD",sector:"تقنية"},
  {symbol:"META",name:"Meta",sector:"تقنية"},{symbol:"GOOGL",name:"Alphabet",sector:"تقنية"},
  {symbol:"MSFT",name:"Microsoft",sector:"تقنية"},{symbol:"AAPL",name:"Apple",sector:"تقنية"},
  {symbol:"TSLA",name:"Tesla",sector:"سيارات"},{symbol:"AMZN",name:"Amazon",sector:"تجزئة"},
  {symbol:"NFLX",name:"Netflix",sector:"إعلام"},{symbol:"CRM",name:"Salesforce",sector:"برمجيات"},
  {symbol:"INTC",name:"Intel",sector:"تقنية"},{symbol:"PLTR",name:"Palantir",sector:"بيانات"},
  {symbol:"ARM",name:"ARM Holdings",sector:"تقنية"},{symbol:"MU",name:"Micron",sector:"أشباه موصلات"},
  {symbol:"CRWD",name:"CrowdStrike",sector:"أمن"},{symbol:"SNOW",name:"Snowflake",sector:"بيانات"},
  {symbol:"UBER",name:"Uber",sector:"مواصلات"},{symbol:"SHOP",name:"Shopify",sector:"تجارة"},
  {symbol:"SQ",name:"Block Inc",sector:"مالية"},{symbol:"PYPL",name:"PayPal",sector:"مالية"},
  // أسهم متوسطة وصغيرة
  {symbol:"SOFI",name:"SoFi",sector:"مالية"},{symbol:"MARA",name:"Marathon Digital",sector:"كريبتو"},
  {symbol:"COIN",name:"Coinbase",sector:"كريبتو"},{symbol:"RKLB",name:"Rocket Lab",sector:"فضاء"},
  {symbol:"SMCI",name:"Super Micro",sector:"تقنية"},{symbol:"HOOD",name:"Robinhood",sector:"مالية"},
  {symbol:"PATH",name:"UiPath",sector:"برمجيات"},{symbol:"AI",name:"C3.ai",sector:"ذكاء اصطناعي"},
  {symbol:"RIVN",name:"Rivian",sector:"سيارات"},{symbol:"LCID",name:"Lucid Motors",sector:"سيارات"},
  {symbol:"NIO",name:"Nio",sector:"سيارات"},{symbol:"XPEV",name:"XPeng",sector:"سيارات"},
  {symbol:"PLUG",name:"Plug Power",sector:"طاقة"},{symbol:"FCEL",name:"FuelCell",sector:"طاقة"},
  {symbol:"BLNK",name:"Blink Charging",sector:"طاقة"},{symbol:"RIOT",name:"Riot Platforms",sector:"كريبتو"},
  {symbol:"CIFR",name:"Cipher Mining",sector:"كريبتو"},{symbol:"WULF",name:"TeraWulf",sector:"كريبتو"},
  {symbol:"HUT",name:"Hut 8",sector:"كريبتو"},{symbol:"CLSK",name:"CleanSpark",sector:"كريبتو"},
  {symbol:"NVAX",name:"Novavax",sector:"صحة"},{symbol:"SAVA",name:"Cassava Sciences",sector:"صحة"},
  {symbol:"AGEN",name:"Agenus",sector:"صحة"},{symbol:"OCGN",name:"Ocugen",sector:"صحة"},
  {symbol:"OPEN",name:"Opendoor",sector:"عقارات"},{symbol:"LMND",name:"Lemonade",sector:"تأمين"},
  {symbol:"AMC",name:"AMC Entertainment",sector:"ترفيه"},{symbol:"SPCE",name:"Virgin Galactic",sector:"فضاء"},
  {symbol:"MVIS",name:"MicroVision",sector:"تقنية"},{symbol:"SIRI",name:"Sirius XM",sector:"إعلام"},
];

export default async function handler(req, res) {
  const apiToken = process.env.EODHD_API_KEY || "";
  const minScore = parseInt(req.query.minScore || "3");
  const minPrice = parseFloat(req.query.minPrice || "0");
  const maxPrice = parseFloat(req.query.maxPrice || "99999");
  const results = [];
  const fromDate = getDateDaysAgo(90);

  await Promise.allSettled(US_SMC_STOCKS.map(async stock => {
    try {
      const url = `https://eodhd.com/api/eod/${stock.symbol}.US?api_token=${apiToken}&fmt=json&period=d&order=a&from=${fromDate}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data) || data.length < 20) return;

      const closes = data.map(d => +(d.adjusted_close || d.close));
      const highs  = data.map(d => +d.high);
      const lows   = data.map(d => +d.low);
      const vols   = data.map(d => +d.volume);
      const n = closes.length;
      const price = closes[n-1];

      if (price < minPrice || price > maxPrice) return;

      const atr    = calcATR(highs, lows, closes);
      const rsi    = calcRSI(closes);
      const rsiPrev= calcRSI(closes.slice(0,-1));
      const avgVol = vols.slice(-21,-1).reduce((a,v)=>a+v,0)/20;
      const lastVol= vols[n-1];
      const ema50  = calcEMA(closes, 50);
      const sigs   = [];
      let score    = 0;

      // 1. Order Block صاعد
      const ob_bull = closes[n-2] < closes[n-3] &&
                      closes[n-1] > highs[n-3] &&
                      (closes[n-1]-closes[n-3]) > atr*0.5;
      if (ob_bull) { sigs.push({t:"OB صاعد", c:"#26a69a"}); score++; }

      // 2. Order Block هابط
      const ob_bear = closes[n-2] > closes[n-3] &&
                      closes[n-1] < lows[n-3] &&
                      (closes[n-3]-closes[n-1]) > atr*0.5;
      if (ob_bear) { sigs.push({t:"OB هابط", c:"#ef5350"}); score++; }

      // 3. FVG صاعد
      const fvg_bull = lows[n-1] > highs[n-3] && closes[n-2] > closes[n-2];
      if (fvg_bull) { sigs.push({t:"FVG ↑", c:"#00bcd4"}); score++; }

      // 4. FVG هابط
      const fvg_bear = highs[n-1] < lows[n-3] && closes[n-2] < closes[n-2];
      if (fvg_bear) { sigs.push({t:"FVG ↓", c:"#ff9800"}); score++; }

      // 5. BOS صاعد
      const swingH = Math.max(...highs.slice(-11,-1));
      const bos_bull = closes[n-1] > swingH && closes[n-2] <= swingH;
      if (bos_bull) { sigs.push({t:"BOS ↑", c:"#2196f3"}); score+=2; }

      // 6. BOS هابط
      const swingL = Math.min(...lows.slice(-11,-1));
      const bos_bear = closes[n-1] < swingL && closes[n-2] >= swingL;
      if (bos_bear) { sigs.push({t:"BOS ↓", c:"#f44336"}); score+=2; }

      // 7. CHoCH صاعد
      const choch_bull = lows.slice(-6).some(l=>l<swingL) && closes[n-1]>swingH*0.99;
      if (choch_bull) { sigs.push({t:"CHoCH ↑", c:"#9c27b0"}); score+=2; }

      // 8. RSI ارتداد من تشبع بيعي
      const rsi_bounce = rsiPrev < 40 && rsi > rsiPrev && rsi < 60;
      if (rsi_bounce) { sigs.push({t:"RSI ارتداد", c:"#ff9800"}); score++; }

      // 9. RSI تشبع بيعي
      if (rsi < 30) { sigs.push({t:"RSI تشبع بيعي", c:"#4caf50"}); score++; }

      // 10. انفجار حجم
      const vol_exp = avgVol > 0 ? lastVol/avgVol : 0;
      if (vol_exp >= 1.8) { sigs.push({t:`حجم ${vol_exp.toFixed(1)}x`, c:"#4caf50"}); score++; }

      // 11. نطاق ضيق NR
      const last5 = closes.slice(-6,-1);
      const nr = (Math.max(...last5)-Math.min(...last5))/Math.min(...last5)*100;
      if (nr < 3) { sigs.push({t:"NR ضغط", c:"#9c27b0"}); score++; }

      // 12. فوق EMA50
      if (ema50 && closes[n-1] > ema50) { sigs.push({t:"فوق EMA50", c:"#ffeb3b"}); score++; }

      if (score < minScore || sigs.length === 0) return;

      // اتجاه السوق
      const bullSigs = sigs.filter(s=>s.t.includes("↑")||s.t.includes("صاعد")||s.t.includes("ارتداد")||s.t.includes("بيعي")||s.t.includes("EMA")||s.t.includes("NR")||s.t.includes("حجم")).length;
      const direction = bullSigs >= sigs.length/2 ? "bull" : "bear";

      const risk = atr*1.5;
      const sl   = direction==="bull" ? (price-risk).toFixed(2) : (price+risk).toFixed(2);
      const tp1  = direction==="bull" ? (price+risk*2).toFixed(2) : (price-risk*2).toFixed(2);
      const tp2  = direction==="bull" ? (price+risk*3).toFixed(2) : (price-risk*3).toFixed(2);
      const tp3  = direction==="bull" ? (price+risk*4.5).toFixed(2) : (price-risk*4.5).toFixed(2);
      const strength = score>=7?"🔥 ممتاز":score>=5?"⭐ قوي":score>=3?"✅ جيد":"🔵 محتمل";
      const prevClose = closes[n-2];
      const chgPct = prevClose>0?((price-prevClose)/prevClose*100).toFixed(2):"0";

      results.push({
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        price, rsi: rsi.toFixed(1),
        chgPct,
        vol_exp: vol_exp.toFixed(1),
        score, sigs, sl, tp1, tp2, tp3,
        strength, direction,
        atr: atr.toFixed(2),
        nr: nr.toFixed(1),
        currency: "USD"
      });
    } catch(e) {}
  }));

  results.sort((a,b) => b.score-a.score);
  res.status(200).json({ results: results.slice(0,20), total: results.length });
}

function calcRSI(c, p=14) {
  if (c.length<p+1) return 50;
  let ag=0,al=0;
  for(let i=1;i<=p;i++){const d=c[i]-c[i-1];if(d>0)ag+=d;else al-=d;}
  ag/=p;al/=p;
  for(let i=p+1;i<c.length;i++){const d=c[i]-c[i-1];ag=(ag*(p-1)+(d>0?d:0))/p;al=(al*(p-1)+(d<0?-d:0))/p;}
  return al===0?100:100-100/(1+ag/al);
}

function calcEMA(d,p){
  if(d.length<p)return null;
  const k=2/(p+1);let e=d.slice(0,p).reduce((s,v)=>s+v,0)/p;
  for(let i=p;i<d.length;i++)e=d[i]*k+e*(1-k);
  return e;
}

function calcATR(h,l,c,p=14){
  if(c.length<p+1)return 0;
  let s=0;
  for(let i=c.length-p;i<c.length;i++)
    s+=Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1]));
  return s/p;
}

function getDateDaysAgo(days){
  const d=new Date();d.setDate(d.getDate()-days);
  return d.toISOString().split("T")[0];
}
