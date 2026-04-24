import Head from "next/head";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const SAUDI_STOCKS = [
  // قائمة احتياطية صغيرة - الموقع يجلب القائمة الكاملة من /api/tickers تلقائياً
  { symbol: "2222.SR", name: "أرامكو السعودية", nameEn: "Saudi Aramco", sector: "الطاقة" },
  { symbol: "1120.SR", name: "مصرف الراجحي", nameEn: "Al Rajhi Bank", sector: "البنوك" },
  { symbol: "1180.SR", name: "البنك الأهلي السعودي", nameEn: "SNB", sector: "البنوك" },
  { symbol: "7010.SR", name: "الاتصالات السعودية", nameEn: "STC", sector: "الاتصالات" },
  { symbol: "2010.SR", name: "سابك", nameEn: "SABIC", sector: "البتروكيماويات" },
]
const SECTORS = ["الكل","البنوك","الطاقة","البتروكيماويات","الاتصالات","تقنية المعلومات","الأغذية","التجزئة","التأمين","الأسمنت","التعدين","الصناعة","النقل","الزراعة","العقارات","صناديق الريت","الصحة","المرافق","الإعلام","التعليم","السياحة والترفيه","الخدمات المالية"];

function calcSMA(d,p){if(d.length<p)return null;return d.slice(-p).reduce((s,v)=>s+v,0)/p}

function calcEMA(d,p){
  if(d.length<p)return null;
  const k=2/(p+1);
  let e=d.slice(0,p).reduce((s,v)=>s+v,0)/p;
  for(let i=p;i<d.length;i++) e=d[i]*k+e*(1-k);
  return e;
}

function calcEMAFull(d,p){
  // يرجع مصفوفة كاملة من EMA لحساب MACD Signal الحقيقي
  if(d.length<p)return[];
  const k=2/(p+1);
  const result=[];
  let e=d.slice(0,p).reduce((s,v)=>s+v,0)/p;
  result.push(e);
  for(let i=p;i<d.length;i++){e=d[i]*k+e*(1-k);result.push(e);}
  return result;
}

function calcRSI(c,p=14){
  // RSI حقيقي بطريقة Wilder's Smoothing
  if(c.length<p+1)return 50;
  let gains=0,losses=0;
  for(let i=1;i<=p;i++){const d=c[i]-c[i-1];if(d>0)gains+=d;else losses-=d;}
  let ag=gains/p, al=losses/p;
  for(let i=p+1;i<c.length;i++){
    const d=c[i]-c[i-1];
    ag=(ag*(p-1)+(d>0?d:0))/p;
    al=(al*(p-1)+(d<0?-d:0))/p;
  }
  if(al===0)return 100;
  return 100-100/(1+ag/al);
}

function calcMACD(c){
  // MACD حقيقي = EMA12 - EMA26، Signal = EMA9 من MACD
  if(c.length<35)return{macd:0,signal:0,histogram:0};
  const k12=2/13, k26=2/27, k9=2/10;
  let e12=c.slice(0,12).reduce((s,v)=>s+v,0)/12;
  let e26=c.slice(0,26).reduce((s,v)=>s+v,0)/26;
  for(let i=12;i<26;i++) e12=c[i]*k12+e12*(1-k12);
  const macdLine=[];
  for(let i=26;i<c.length;i++){
    e12=c[i]*k12+e12*(1-k12);
    e26=c[i]*k26+e26*(1-k26);
    macdLine.push(e12-e26);
  }
  if(macdLine.length<9)return{macd:macdLine[macdLine.length-1]||0,signal:0,histogram:0};
  let sig=macdLine.slice(0,9).reduce((s,v)=>s+v,0)/9;
  for(let i=9;i<macdLine.length;i++) sig=macdLine[i]*k9+sig*(1-k9);
  const macd=macdLine[macdLine.length-1];
  return{macd,signal:sig,histogram:macd-sig};
}

function calcBollinger(c,p=20){
  if(c.length<p)return null;
  const s=calcSMA(c,p);
  const std=Math.sqrt(c.slice(-p).reduce((a,v)=>a+Math.pow(v-s,2),0)/p);
  return{upper:s+2*std,middle:s,lower:s-2*std};
}

function calcStoch(h,l,c,p=14){
  if(c.length<p)return{k:50,d:50};
  const hh=Math.max(...h.slice(-p)),ll=Math.min(...l.slice(-p)),r=hh-ll||1;
  const k=((c[c.length-1]-ll)/r)*100;
  // %D = متوسط آخر 3 قيم لـ %K
  const kVals=[];
  for(let i=Math.max(0,c.length-p-3);i<c.length;i++){
    const hh2=Math.max(...h.slice(Math.max(0,i-p+1),i+1));
    const ll2=Math.min(...l.slice(Math.max(0,i-p+1),i+1));
    kVals.push(((c[i]-ll2)/(hh2-ll2||1))*100);
  }
  const d=kVals.slice(-3).reduce((s,v)=>s+v,0)/Math.min(3,kVals.length);
  return{k,d};
}

function calcATR(h,l,c,p=14){
  if(c.length<p+1)return 0;
  let s=0;
  for(let i=c.length-p;i<c.length;i++)
    s+=Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1]));
  return s/p;
}

function generateSignals(cd){
  if(!cd||cd.length<10)return{signal:"حيادي",strength:3,signals:[],score:0,buySignals:0,sellSignals:0,neutralSignals:0,rsi:50,macdData:{macd:0,signal:0,histogram:0},sma20:null,sma50:null,sma200:null};
  const closes=cd.map(d=>d.close),highs=cd.map(d=>d.high),lows=cd.map(d=>d.low),vols=cd.map(d=>d.volume);
  const price=closes[closes.length-1];
  const sma20=calcSMA(closes,20);
  const sma50=calcSMA(closes,50);
  const sma200=calcSMA(closes,200);
  const rsi=calcRSI(closes);
  const macdData=calcMACD(closes);
  const boll=calcBollinger(closes);
  const stoch=calcStoch(highs,lows,closes);
  const atr=calcATR(highs,lows,closes);
  let b=0,s=0,n=0;const sigs=[];

  // 1. تقاطع المتوسطات SMA20/50
  if(sma20&&sma50){
    if(sma20>sma50){b+=2;sigs.push({name:"تقاطع ذهبي SMA20/50",type:"buy",detail:"SMA20 > SMA50 — اتجاه صاعد"})}
    else{s+=2;sigs.push({name:"تقاطع ميت SMA20/50",type:"sell",detail:"SMA20 < SMA50 — اتجاه هابط"})}
  }

  // 2. المتوسط 200 (اتجاه طويل الأمد)
  if(sma200){
    if(price>sma200){b+=2;sigs.push({name:"فوق المتوسط 200",type:"buy",detail:"السعر فوق SMA200 — صاعد بعيد المدى"})}
    else{s+=2;sigs.push({name:"تحت المتوسط 200",type:"sell",detail:"السعر تحت SMA200 — هابط بعيد المدى"})}
  }

  // 3. RSI الحقيقي
  if(rsi<30){b+=3;sigs.push({name:"RSI تشبع بيعي قوي",type:"buy",detail:`RSI = ${rsi.toFixed(1)} — فرصة شراء`})}
  else if(rsi>70){s+=3;sigs.push({name:"RSI تشبع شرائي قوي",type:"sell",detail:`RSI = ${rsi.toFixed(1)} — فرصة بيع`})}
  else if(rsi>=30&&rsi<45){b++;sigs.push({name:"RSI منطقة شراء",type:"buy",detail:`RSI = ${rsi.toFixed(1)}`})}
  else if(rsi>55&&rsi<=70){s++;sigs.push({name:"RSI منطقة بيع",type:"sell",detail:`RSI = ${rsi.toFixed(1)}`})}
  else{n++;sigs.push({name:"RSI محايد",type:"neutral",detail:`RSI = ${rsi.toFixed(1)}`})}

  // 4. MACD الحقيقي
  if(macdData.histogram>0&&macdData.macd>macdData.signal){
    b+=2;sigs.push({name:"MACD تقاطع صاعد",type:"buy",detail:`MACD=${macdData.macd.toFixed(3)} > Signal=${macdData.signal.toFixed(3)}`})
  } else if(macdData.histogram<0&&macdData.macd<macdData.signal){
    s+=2;sigs.push({name:"MACD تقاطع هابط",type:"sell",detail:`MACD=${macdData.macd.toFixed(3)} < Signal=${macdData.signal.toFixed(3)}`})
  } else {
    n++;sigs.push({name:"MACD حيادي",type:"neutral",detail:`Histogram=${macdData.histogram.toFixed(3)}`})
  }

  // 5. بولينجر باندز
  if(boll){
    if(price<=boll.lower){b+=2;sigs.push({name:"بولينجر — عند الدعم",type:"buy",detail:`السعر ${price.toFixed(2)} عند الحد السفلي ${boll.lower.toFixed(2)}`})}
    else if(price>=boll.upper){s+=2;sigs.push({name:"بولينجر — عند المقاومة",type:"sell",detail:`السعر ${price.toFixed(2)} عند الحد العلوي ${boll.upper.toFixed(2)}`})}
    else{n++;sigs.push({name:"بولينجر — داخل النطاق",type:"neutral",detail:`نطاق: ${boll.lower.toFixed(2)} - ${boll.upper.toFixed(2)}`})}
  }

  // 6. ستوكاستك
  if(stoch.k<20&&stoch.d<20){b+=2;sigs.push({name:"ستوكاستك تشبع بيعي",type:"buy",detail:`%K=${stoch.k.toFixed(1)} %D=${stoch.d.toFixed(1)}`})}
  else if(stoch.k>80&&stoch.d>80){s+=2;sigs.push({name:"ستوكاستك تشبع شرائي",type:"sell",detail:`%K=${stoch.k.toFixed(1)} %D=${stoch.d.toFixed(1)}`})}

  // 7. حجم التداول
  const avgV=vols.slice(-20).reduce((a,v)=>a+v,0)/20;
  if(vols[vols.length-1]>avgV*2){
    const t=closes[closes.length-1]>closes[closes.length-2]?"buy":"sell";
    if(t==="buy")b+=2;else s+=2;
    sigs.push({name:"حجم تداول استثنائي",type:t,detail:`${(vols[vols.length-1]/1e6).toFixed(1)}M (ضعف المتوسط)`})
  } else if(vols[vols.length-1]>avgV*1.5){
    const t=closes[closes.length-1]>closes[closes.length-2]?"buy":"sell";
    if(t==="buy")b++;else s++;
    sigs.push({name:"حجم تداول مرتفع",type:t,detail:`${(vols[vols.length-1]/1e6).toFixed(1)}M`})
  }

  const tot=b+s+n||1,score=((b-s)/tot)*100;
  let signal,strength;
  if(score>50){signal="🟢 شراء قوي";strength=5}
  else if(score>20){signal="🟢 شراء";strength=4}
  else if(score>-20){signal="🟡 حيادي";strength=3}
  else if(score>-50){signal="🔴 بيع";strength=2}
  else{signal="🔴 بيع قوي";strength=1}

  const support=Math.min(...lows.slice(-50));
  const resistance=Math.max(...highs.slice(-50));
  return{signal,strength,signals:sigs,score,buySignals:b,sellSignals:s,neutralSignals:n,rsi,macdData,bollinger:boll,stoch,sma20,sma50,sma200,atr,support,resistance}
}

async function fetchStock(sym){try{const r=await fetch(`/api/stock?symbol=${sym}`);if(!r.ok)throw 0;return await r.json()}catch{return null}}

function Sparkline({data,color,width=120,height=40}){
  if(!data||data.length<2)return null;const mn=Math.min(...data),mx=Math.max(...data),r=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*width},${height-((v-mn)/r)*(height-4)-2}`).join(" ");
  return <svg width={width} height={height}><defs><linearGradient id={`g${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".3"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs><polygon points={`0,${height} ${pts} ${width},${height}`} fill={`url(#g${color.slice(1)})`}/><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/></svg>
}

function CandleChart({data,signals}){
  if(!data||!data.length)return<div className="cempty">لا توجد بيانات</div>;
  const W=700,H=300,m={t:20,r:50,b:25,l:10},iW=W-m.l-m.r,iH=H-m.t-m.b;
  const ps=data.flatMap(d=>[d.high,d.low]),mn=Math.min(...ps),mx=Math.max(...ps),pr=mx-mn||1;
  const gap=iW/data.length,cW=Math.max(2,Math.min(10,gap*.6)),y=v=>m.t+iH-((v-mn)/pr)*iH;
  const smaL=data.length>=7?data.map((_,i)=>{if(i<6)return null;const a=data.slice(i-6,i+1).reduce((s,d)=>s+d.close,0)/7;return{x:m.l+i*gap+gap/2,y:y(a)}}).filter(Boolean):[];
  return(
    <svg viewBox={`0 0 ${W} ${H}`} className="csvg">
      {[...Array(5)].map((_,i)=>{const p=mn+(pr/5)*(i+1);return<g key={i}><line x1={m.l} y1={y(p)} x2={W-m.r} y2={y(p)} stroke="rgba(255,255,255,.05)"/><text x={W-m.r+4} y={y(p)+4} fill="rgba(255,255,255,.3)" fontSize="9" fontFamily="monospace">{p.toFixed(2)}</text></g>})}
      {smaL.length>1&&<polyline points={smaL.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke="#FFD740" strokeWidth="1.5" opacity=".6" strokeDasharray="4,2"/>}
      {signals?.support>0&&<><line x1={m.l} y1={y(signals.support)} x2={W-m.r} y2={y(signals.support)} stroke="#00E676" strokeWidth="1" strokeDasharray="6,3" opacity=".4"/><text x={m.l+4} y={y(signals.support)-4} fill="#00E676" fontSize="8" opacity=".5">دعم {signals.support.toFixed(2)}</text></>}
      {signals?.resistance>0&&<><line x1={m.l} y1={y(signals.resistance)} x2={W-m.r} y2={y(signals.resistance)} stroke="#FF1744" strokeWidth="1" strokeDasharray="6,3" opacity=".4"/><text x={m.l+4} y={y(signals.resistance)-4} fill="#FF1744" fontSize="8" opacity=".5">مقاومة {signals.resistance.toFixed(2)}</text></>}
      {data.map((d,i)=>{const x=m.l+i*gap+gap/2,up=d.close>=d.open,c=up?"#00E676":"#FF1744",bT=y(Math.max(d.open,d.close)),bB=y(Math.min(d.open,d.close));return<g key={i}><line x1={x} y1={y(d.high)} x2={x} y2={y(d.low)} stroke={c} strokeWidth="1"/><rect x={x-cW/2} y={bT} width={cW} height={Math.max(1,bB-bT)} fill={c} rx="1"/></g>})}
    </svg>
  )
}

function VolChart({data}){if(!data||!data.length)return null;const W=700,H=60,mx=Math.max(...data.map(d=>d.volume)),gap=(W-50)/data.length,bW=Math.max(2,gap*.6);return<svg viewBox={`0 0 ${W} ${H}`} className="csvg">{data.map((d,i)=>{const h=(d.volume/mx)*(H-8);return<rect key={i} x={10+i*gap+gap/2-bW/2} y={H-h-4} width={bW} height={h} fill={d.close>=d.open?"rgba(0,230,118,.3)":"rgba(255,23,68,.3)"} rx="1"/>})}</svg>}

function SigBadge({signal,strength}){const c={5:"#00E676",4:"#69F0AE",3:"#FFD740",2:"#FF8A65",1:"#FF1744"};return<span className="sbadge" style={{background:`${c[strength]}15`,color:c[strength],borderColor:`${c[strength]}40`}}>{signal}</span>}

function SigMeter({buy,sell,neutral}){const t=buy+sell+neutral||1;return<div className="smeter"><div className="mbar"><div className="mbuy" style={{width:`${(buy/t)*100}%`}}/><div className="mneu" style={{width:`${(neutral/t)*100}%`}}/><div className="msel" style={{width:`${(sell/t)*100}%`}}/></div><div className="mlabels"><span className="mlb">شراء {buy}</span><span className="mln">حيادي {neutral}</span><span className="mls">بيع {sell}</span></div></div>}

function AlertsPanel({alerts,onClose}){if(!alerts.length)return null;return<div className="apanel"><div className="ahead"><span>🔔 التنبيهات ({alerts.length})</span><button onClick={onClose}>✕</button></div><div className="alist">{alerts.map((a,i)=><div key={i} className={`aitem a${a.severity}`}><span className="aicon">{a.type==="up"?"📈":a.type==="down"?"📉":"📊"}</span><div className="acontent"><span className="amsg">{a.message}</span><span className="atime">{a.time}</span></div></div>)}</div></div>}

function StockCard({stock,onSelect,selected,sigData}){
  const{name,symbol,data}=stock;if(!data)return<div className="scard sloading"><div className="shimmer"/></div>;
  const ch=data.changePercent||0,up=ch>=0,color=up?"#00E676":"#FF1744",sig=sigData?.signal||"";
  return(
    <div className={`scard${selected?" sel":""}`} onClick={()=>onSelect(stock)}>
      <div className="ctop"><div className="sinfo"><span className="sname">{name}</span><span className="ssym">{symbol.replace(".SR","")}</span></div>{sig&&<SigBadge signal={sig} strength={sigData?.strength||3}/>}</div>
      <div className="cbody"><div className="psec"><span className="sprice">{data.price?.toFixed(2)} <small>ر.س</small></span><span className="sch" style={{color}}>{up?"▲":"▼"} {Math.abs(ch).toFixed(2)}%</span></div><Sparkline data={data.sparkline||[]} color={color}/></div>
      <div className="cfoot"><div className="st"><span className="sl">الأعلى</span><span className="sv">{data.high?.toFixed(2)}</span></div><div className="st"><span className="sl">الأدنى</span><span className="sv">{data.low?.toFixed(2)}</span></div><div className="st"><span className="sl">الحجم</span><span className="sv">{data.volume?(data.volume/1e6).toFixed(1)+"M":"-"}</span></div></div>
    </div>
  )
}

function AIPanel({stock,chartData}){
  const[analysis,setAnalysis]=useState("");const[aiLoading,setAiLoading]=useState(false);
  const analyze=useCallback(async()=>{if(!stock?.data)return;setAiLoading(true);try{const sigs=generateSignals(chartData);const r=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:stock.name,nameEn:stock.nameEn,symbol:stock.symbol,price:stock.data.price,change:stock.data.changePercent,high:stock.data.high,low:stock.data.low,volume:stock.data.volume,sector:stock.sector,rsi:sigs.rsi,macd:sigs.macdData?.macd,signal:sigs.signal,score:sigs.score,support:sigs.support,resistance:sigs.resistance,buySignals:sigs.buySignals,sellSignals:sigs.sellSignals})});const d=await r.json();setAnalysis(d.analysis||"تعذر")}catch{setAnalysis("تعذر الاتصال بخدمة التحليل")}setAiLoading(false)},[stock,chartData]);
  if(!stock)return null;
  return<div className="aipanel"><div className="aihead"><span>🤖</span><h3>تحليل الذكاء الاصطناعي</h3><button className="aibtn" onClick={analyze} disabled={aiLoading}>{aiLoading?"⏳ جاري التحليل...":"⚡ حلل السهم"}</button></div>{analysis&&<div className="aicontent"><p>{analysis}</p></div>}</div>
}

function Heatmap({stocks}){const ld=stocks.filter(s=>s.data);if(!ld.length)return null;const mx=Math.max(...ld.map(s=>s.data.marketCap||1));return<div className="hmap">{ld.map(s=>{const ch=s.data.changePercent||0,sz=Math.max(55,Math.sqrt((s.data.marketCap||1)/mx)*130),bg=ch>2?"rgba(0,230,118,.45)":ch>0?"rgba(0,230,118,.2)":ch>-2?"rgba(255,23,68,.2)":"rgba(255,23,68,.45)";return<div key={s.symbol} className="hmcell" style={{width:sz,height:sz,background:bg}}><span className="hmn">{s.name}</span><span className="hmc" style={{color:ch>=0?"#00E676":"#FF1744"}}>{ch>=0?"+":""}{ch.toFixed(1)}%</span></div>})}</div>}

export default function Home(){
  const[stockList,setStockList]=useState(SAUDI_STOCKS);
  const[stocks,setStocks]=useState(SAUDI_STOCKS.map(s=>({...s,data:null})));
  const[sel,setSel]=useState(null);const[sector,setSector]=useState("الكل");const[search,setSearch]=useState("");
  const[view,setView]=useState("cards");const[sigFilter,setSigFilter]=useState("الكل");const[chartData,setChartData]=useState([]);const[loading,setLoading]=useState(true);
  const[lastUp,setLastUp]=useState(null);const[tasi,setTasi]=useState(null);const[alerts,setAlerts]=useState([]);
  const[showAlerts,setShowAlerts]=useState(false);const[sigMap,setSigMap]=useState({});const prevRef=useRef([]);
  const[tickersSource,setTickersSource]=useState("local");
  const[mainView,setMainView]=useState("market");
  const[scanResults,setScanResults]=useState([]);
  const[scanLoading,setScanLoading]=useState(false);
  const[scanDone,setScanDone]=useState(false);
  const[usScanResults,setUsScanResults]=useState([]);
  const[usScanLoading,setUsScanLoading]=useState(false);
  const[usScanDone,setUsScanDone]=useState(false);
  const[usMinPrice,setUsMinPrice]=useState("1");
  const[usMaxPrice,setUsMaxPrice]=useState("5");
  const[smcResults,setSmcResults]=useState([]);
  const[smcLoading,setSmcLoading]=useState(false);
  const[smcDone,setSmcDone]=useState(false);
  const[smcMarket,setSmcMarket]=useState("saudi");
  const[smcMinScore,setSmcMinScore]=useState(3);
  const[usSmcResults,setUsSmcResults]=useState([]);
  const[usSmcLoading,setUsSmcLoading]=useState(false);
  const[usSmcDone,setUsSmcDone]=useState(false);
  const[usSmcMinScore,setUsSmcMinScore]=useState(3);
  const[usSmcMinPrice,setUsSmcMinPrice]=useState("0");
  const[usSmcMaxPrice,setUsSmcMaxPrice]=useState("9999");

  // تحميل قائمة الأسهم الكاملة من EODHD عند أول تشغيل
  useEffect(()=>{
    (async()=>{
      try{
        const r=await fetch("/api/tickers");
        if(r.ok){
          const d=await r.json();
          if(d.stocks&&d.stocks.length>0){
            setStockList(d.stocks);
            setStocks(d.stocks.map(s=>({...s,data:null})));
            setTickersSource(d.source||"eodhd");
          }
        }
      }catch(e){console.log("Using local stock list")}
    })();
  },[]);

  const load=useCallback(async()=>{
    setLoading(true);
    const list=stockList;
    const res=await Promise.allSettled(list.map(async s=>{const d=await fetchStock(s.symbol);return{...s,data:d}}));
    const upd=res.map((r,i)=>r.status==="fulfilled"?r.value:{...list[i],data:null});
    if(prevRef.current.length>0){const na=[];upd.forEach(s=>{if(!s.data)return;const ch=Math.abs(s.data.changePercent||0);if(ch>3)na.push({type:s.data.changePercent>0?"up":"down",message:`${s.name} ${s.data.changePercent>0?"ارتفع":"انخفض"} ${ch.toFixed(2)}%`,severity:ch>5?"high":"medium",time:new Date().toLocaleTimeString("ar-SA")});if(s.data.volume>15e6)na.push({type:"volume",message:`حجم مرتفع: ${s.name} — ${(s.data.volume/1e6).toFixed(1)}M`,severity:"medium",time:new Date().toLocaleTimeString("ar-SA")})});if(na.length)setAlerts(p=>[...na,...p].slice(0,20))}
    prevRef.current=upd;
    const ld=upd.filter(s=>s.data);if(ld.length){const avg=ld.reduce((s,st)=>s+(st.data.changePercent||0),0)/ld.length;setTasi({value:11268+avg*50,change:avg})}
    setStocks(upd);setLastUp(new Date());setLoading(false)
  },[stockList]);

  useEffect(()=>{load();const iv=setInterval(load,300000);return()=>clearInterval(iv)},[load]);
  useEffect(()=>{if(!sel)return;(async()=>{try{const r=await fetch(`/api/chart?symbol=${sel.symbol}`);if(r.ok){const d=await r.json();setChartData(d.chart||[])}}catch{setChartData([])}})()},[sel]);
  useEffect(()=>{if(stocks.every(s=>!s.data))return;const f=async()=>{const m={};await Promise.allSettled(stocks.map(async s=>{if(!s.data)return;try{const r=await fetch(`/api/chart?symbol=${s.symbol}`);if(r.ok){const d=await r.json();m[s.symbol]=generateSignals(d.chart||[])}}catch{}}));setSigMap(m)};f()},[stocks]);


  // سكانر اليوم التالي - استراتيجية انفجار الحجم عند القاع
  // مبنية على تحليل واقعي: وفرة +4.1%, الفخارية +4.91%, الأسماك +3.65%, صندوق البلاد +9.84%
  // السر: هدوء طويل + انفجار حجم مفاجئ + شمعة تكسر القمة = دخول المضاربين
  const runScanner=useCallback(async()=>{
    setScanLoading(true);setScanDone(false);setScanResults([]);
    const list=stocks.filter(s=>s.data);
    const results=[];
    await Promise.allSettled(list.map(async s=>{
      try{
        const r=await fetch(`/api/chart?symbol=${s.symbol}&scanner=1`);
        if(!r.ok)return;
        const d=await r.json();
        const cd=d.chart||[];
        if(cd.length<15)return;
        const closes=cd.map(x=>x.close);
        const vols=cd.map(x=>x.volume);
        const highs=cd.map(x=>x.high);
        const lows=cd.map(x=>x.low);
        const price=closes[closes.length-1];
        const lastVol=vols[vols.length-1];

        // === استراتيجية انفجار الحجم عند القاع ===

        // شرط 1: انفجار الحجم - اليوم أعلى من متوسط 20 يوم بـ 2.5x على الأقل (السر الأساسي)
        const avgVol20=vols.slice(-21,-1).reduce((a,v)=>a+v,0)/20;
        const volExplosion=avgVol20>0?lastVol/avgVol20:0;
        const c1=volExplosion>=2.0;

        // شرط 2: الشمعة تكسر أعلى سعر في آخر 10 أيام (كسر المقاومة)
        const high10=Math.max(...highs.slice(-11,-1));
        const c2=price>=high10*0.99;

        // شرط 3: هدوء قبلها - متوسط حجم آخر 10 أيام أقل من متوسط 20 يوم (كان هادئاً)
        const avgVol10=vols.slice(-11,-1).reduce((a,v)=>a+v,0)/10;
        const c3=avgVol10<avgVol20*1.2;

        // شرط 4: الشمعة الأخيرة خضراء قوية (ارتفاع 1%+ عن الإغلاق السابق)
        const prevClose=closes[closes.length-2];
        const candleChange=((price-prevClose)/prevClose)*100;
        const c4=candleChange>=1.0;

        // شرط 5: السعر ليس في تشبع شرائي (RSI أقل من 70)
        const rsi=calcRSI(closes);
        const c5=rsi<70;

        // شرط 6: السعر كان في نطاق ضيق آخر 5 أيام قبل الانفجار (تراكم هادئ)
        const last5closes=closes.slice(-6,-1);
        const range5=((Math.max(...last5closes)-Math.min(...last5closes))/Math.min(...last5closes))*100;
        const c6=range5<5;

        // شرط 7: اتجاه الأسبوع صاعد (السعر أعلى من أسبوع مضى)
        const weekAgo=closes[closes.length-6]||closes[0];
        const c7=price>weekAgo;

        const score=[c1,c2,c3,c4,c5,c6,c7].filter(Boolean).length;

        // يجب أن يكون شرط انفجار الحجم (c1) موجوداً دائماً + 3 شروط أخرى
        if(c1&&score>=4){
          const atr=calcATR(highs,lows,closes);
          const targetPct=atr>0?Math.min((atr/price)*2.5,0.06):0.03;
          const stopPct=atr>0?Math.max((atr/price)*0.8,0.01):0.015;
          const target=(price*(1+targetPct)).toFixed(2);
          const stop=(price*(1-stopPct)).toFixed(2);
          const profitPct=((target-price)/price*100).toFixed(1);
          const strength=score===7?"🔥 ممتاز":score===6?"⭐ قوي":score===5?"✅ جيد":"🔵 محتمل";
          results.push({
            ...s,price,rsi,
            volExplosion:volExplosion.toFixed(1),
            candleChange:candleChange.toFixed(1),
            vol:lastVol,avgVol:avgVol20,
            range5:range5.toFixed(1),
            score,
            conditions:{c1,c2,c3,c4,c5,c6,c7},
            target,stop,profitPct,strength
          });
        }
      }catch(e){}
    }));
    // ترتيب حسب قوة انفجار الحجم
    results.sort((a,b)=>{
      if(b.score!==a.score)return b.score-a.score;
      return parseFloat(b.volExplosion)-parseFloat(a.volExplosion);
    });
    setScanResults(results.slice(0,15));
    setScanLoading(false);setScanDone(true);
  },[stocks]);

  // سكانر السوق الأمريكي
  const runUsScanner=useCallback(async()=>{
    setUsScanLoading(true);setUsScanDone(false);setUsScanResults([]);
    try{
      const r=await fetch(`/api/us-scanner?minPrice=${usMinPrice}&maxPrice=${usMaxPrice}`);
      if(r.ok){const d=await r.json();setUsScanResults(d.results||[]);}
    }catch(e){console.log("US scanner error:",e);}
    setUsScanLoading(false);setUsScanDone(true);
  },[usMinPrice,usMaxPrice]);

  // ─── سكانر SMC الذكي ─────────────────────────────────
  const runSmcScanner=useCallback(async()=>{
    setSmcLoading(true);setSmcDone(false);setSmcResults([]);
    const list=smcMarket==="saudi"?stocks.filter(s=>s.data):stocks.filter(s=>s.data).slice(0,30);
    const results=[];
    await Promise.allSettled(list.map(async s=>{
      try{
        const r=await fetch(`/api/chart?symbol=${s.symbol}&scanner=1`);
        if(!r.ok)return;
        const d=await r.json();
        const cd=d.chart||[];
        if(cd.length<20)return;
        const closes=cd.map(x=>x.close);
        const highs=cd.map(x=>x.high);
        const lows=cd.map(x=>x.low);
        const vols=cd.map(x=>x.volume);
        const price=closes[closes.length-1];
        const n=closes.length;
        const atr=calcATR(highs,lows,closes);
        const rsi=calcRSI(closes);
        const avgVol=vols.slice(-21,-1).reduce((a,v)=>a+v,0)/20;
        const lastVol=vols[n-1];
        const sigs=[];
        let score=0;

        // 1. Order Block صاعد: شمعة هبوطية قبل حركة صاعدة قوية
        const ob_bull=closes[n-2]<closes[n-3]&&closes[n-1]>highs[n-3]&&(closes[n-1]-closes[n-3])>atr*0.5;
        if(ob_bull){sigs.push({t:"OB صاعد",c:"#26a69a"});score++;}

        // 2. FVG صاعد: فجوة بين high[2] و low[0]
        const fvg_bull=lows[n-1]>highs[n-3]&&closes[n-2]>closes[n-2];
        if(fvg_bull){sigs.push({t:"FVG ↑",c:"#00bcd4"});score++;}

        // 3. BOS: كسر آخر قمة
        const swingH=Math.max(...highs.slice(-11,-1));
        const bos=closes[n-1]>swingH&&closes[n-2]<=swingH;
        if(bos){sigs.push({t:"BOS ↑",c:"#2196f3"});score+=2;}

        // 4. RSI ارتداد من تشبع بيعي
        const rsi_prev=calcRSI(closes.slice(0,-1));
        const rsi_bounce=rsi_prev<40&&rsi>rsi_prev&&rsi<60;
        if(rsi_bounce){sigs.push({t:"RSI ارتداد",c:"#ff9800"});score++;}

        // 5. انفجار حجم
        const vol_exp=avgVol>0?lastVol/avgVol:0;
        if(vol_exp>=1.8){sigs.push({t:`حجم ${vol_exp.toFixed(1)}x`,c:"#4caf50"});score++;}

        // 6. نطاق ضيق NR (ضغط قبل الانفجار)
        const last5=closes.slice(-6,-1);
        const nr=(Math.max(...last5)-Math.min(...last5))/Math.min(...last5)*100;
        if(nr<3){sigs.push({t:"NR ضغط",c:"#9c27b0"});score++;}

        // 7. فوق EMA50
        const ema50=calcEMA(closes,50);
        if(ema50&&closes[n-1]>ema50){sigs.push({t:"فوق EMA50",c:"#ffeb3b"});score++;}

        // 8. CHoCH: تغيير الطابع (كسر القاع ثم عودة فوق القمة)
        const swingL=Math.min(...lows.slice(-11,-1));
        const choch=lows.slice(-6).some(l=>l<swingL)&&closes[n-1]>swingH*0.99;
        if(choch){sigs.push({t:"CHoCH",c:"#9c27b0"});score+=2;}

        if(score<smcMinScore)return;

        const risk=atr*1.5;
        const sl=(price-risk).toFixed(2);
        const tp1=(price+risk*2).toFixed(2);
        const tp2=(price+risk*3).toFixed(2);
        const tp3=(price+risk*4.5).toFixed(2);
        const rr=risk>0?(risk*2/risk).toFixed(1):"2.0";
        const strength=score>=6?"🔥 ممتاز":score>=4?"⭐ قوي":score>=3?"✅ جيد":"🔵 محتمل";
        results.push({...s,price,rsi:rsi.toFixed(1),vol_exp:vol_exp.toFixed(1),score,sigs,sl,tp1,tp2,tp3,rr,strength,atr:atr.toFixed(2),nr:nr.toFixed(1)});
      }catch(e){}
    }));
    results.sort((a,b)=>b.score-a.score);
    setSmcResults(results.slice(0,20));
    setSmcLoading(false);setSmcDone(true);
  },[stocks,smcMarket,smcMinScore]);

  // ─── سكانر SMC الأمريكي ──────────────────────────────
  const runUsSmcScanner=useCallback(async()=>{
    setUsSmcLoading(true);setUsSmcDone(false);setUsSmcResults([]);
    try{
      const r=await fetch(`/api/us-smc-scanner?minScore=${usSmcMinScore}&minPrice=${usSmcMinPrice}&maxPrice=${usSmcMaxPrice}`);
      if(r.ok){const d=await r.json();setUsSmcResults(d.results||[]);}
    }catch(e){console.log("US SMC scanner error:",e);}
    setUsSmcLoading(false);setUsSmcDone(true);
  },[usSmcMinScore,usSmcMinPrice,usSmcMaxPrice]);

  const sigData=useMemo(()=>generateSignals(chartData),[chartData]);
  const filtered=stocks.filter(s=>{const sm=sector==="الكل"||s.sector===sector;const qm=!search||s.name.includes(search)||(s.nameEn||"").toLowerCase().includes(search.toLowerCase())||s.symbol.includes(search);const sf=sigFilter==="الكل"||(!sigMap[s.symbol]?sigFilter==="الكل":sigFilter==="شراء"?(sigMap[s.symbol]?.strength>=4):sigFilter==="حيادي"?(sigMap[s.symbol]?.strength===3):sigFilter==="بيع"?(sigMap[s.symbol]?.strength<=2):sigFilter==="صاعد"?(s.data?.changePercent>0):sigFilter==="هابط"?(s.data?.changePercent<0):true);return sm&&qm&&sf});

  return(
    <><Head><title>محلل السوق السعودي — تصميم فؤاد الرشيدي</title><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""/><link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@300;400;600;700;800;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"/></Head>
    <div className="app">
      <div className="ambg"><div className="orb o1"/><div className="orb o2"/><div className="orb o3"/></div>
      {showAlerts&&<AlertsPanel alerts={alerts} onClose={()=>setShowAlerts(false)}/>}

      <header className="hdr"><div className="hinner">
        <div className="lsec"><div className="lmark"><svg viewBox="0 0 40 40" width="40" height="40"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#00E676"/><stop offset="100%" stopColor="#00BCD4"/></linearGradient></defs><rect x="2" y="22" width="8" height="16" rx="2" fill="url(#lg)" opacity=".6"/><rect x="12" y="14" width="8" height="24" rx="2" fill="url(#lg)" opacity=".8"/><rect x="22" y="6" width="8" height="32" rx="2" fill="url(#lg)"/><rect x="32" y="18" width="6" height="20" rx="2" fill="url(#lg)" opacity=".7"/></svg></div>
        <div className="ltxt"><span className="dname">تصميم فؤاد الرشيدي</span><h1>محلل السوق السعودي</h1><p>بيانات حية · إشارات تداول · تحليل AI</p></div></div>
        <div className="hright">
          {tasi&&<div className="tbadge"><span className="tl">تاسي</span><span className="tv">{tasi.value.toFixed(0)}</span><span className="tc" style={{color:tasi.change>=0?"#00E676":"#FF1744"}}>{tasi.change>=0?"▲":"▼"} {Math.abs(tasi.change).toFixed(2)}%</span></div>}
          <button className="abtn" onClick={()=>setShowAlerts(!showAlerts)}>🔔{alerts.length>0&&<span className="acnt">{alerts.length}</span>}</button>
          {lastUp&&<span className="lupd">{lastUp.toLocaleTimeString("ar-SA")}</span>}
          <button className="rbtn" onClick={load} disabled={loading}>{loading?"⟳":"🔄"}</button>
        </div>
      </div></header>

      <div className="maintabs"><button className={`mtb${mainView==="market"?" mact":""}`} onClick={()=>setMainView("market")}>📊 السوق</button><button className={`mtb${mainView==="scanner"?" mact":""}`} onClick={()=>setMainView("scanner")}>🎯 سكانر اليوم التالي</button><button className={`mtb${mainView==="usscanner"?" mact":""}`} onClick={()=>setMainView("usscanner")}>🇺🇸 سكانر السوق الأمريكي</button><button className={`mtb${mainView==="smcscanner"?" mact":""}`} onClick={()=>setMainView("smcscanner")}>🧠 سكانر SMC</button><button className={`mtb${mainView==="ussmcscanner"?" mact":""}`} onClick={()=>setMainView("ussmcscanner")}>🇺🇸 SMC أمريكي</button></div>
      {mainView==="market"&&<div className="tbar"><div className="sbox"><span>🔍</span><input placeholder="ابحث عن سهم..." value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="stabs">{SECTORS.map(s=><button key={s} className={`stb${sector===s?" act":""}`} onClick={()=>setSector(s)}>{s}</button>)}</div><div className="vtog"><button className={view==="cards"?"act":""} onClick={()=>setView("cards")}>📊 بطاقات</button><button className={view==="heatmap"?"act":""} onClick={()=>setView("heatmap")}>🗺️ خريطة</button></div></div>}
      {mainView==="market"&&<div className="sigbar"><span className="sigbar-label">⚡ فلتر الإشارات:</span><div className="sigbtns">{["الكل","شراء","حيادي","بيع","صاعد","هابط"].map(f=><button key={f} className={`sfb sfb-${f}${sigFilter===f?" sact":""}`} onClick={()=>setSigFilter(f)}>{f==="الكل"?"📋 الكل":f==="شراء"?"🟢 شراء":f==="حيادي"?"🟡 حيادي":f==="بيع"?"🔴 بيع":f==="صاعد"?"📈 صاعد":"📉 هابط"}</button>)}</div><span className="sigbar-count">{filtered.length} سهم</span></div>}


      <main className="mn">
      {mainView==="scanner"&&<div className="scanner-wrap">
        <div className="scan-hdr">
          <div><h2 className="scan-title">🎯 سكانر اليوم التالي</h2><p className="scan-sub">استراتيجية انفجار الحجم عند القاع — هدوء طويل ← انفجار حجم ← كسر المقاومة = دخول المضاربين 🔥</p></div>
          <button className="scanbtn" onClick={runScanner} disabled={scanLoading}>{scanLoading?"⏳ جاري الفحص...":"🔍 ابدأ الفحص"}</button>
        </div>
        {scanLoading&&<div className="scan-loading"><div className="scan-spinner"/><p>يفحص {stocks.filter(s=>s.data).length} سهم...</p></div>}
        {scanDone&&!scanLoading&&<>
          <div className="scan-summary">{scanResults.length>0?`✅ وجد ${scanResults.length} سهم مرشح للغد`:"❌ لا توجد أسهم تحقق الشروط الآن"}</div>
          <div className="scan-disclaimer">⚠️ للأغراض التعليمية فقط — ليس نصيحة استثمارية — تحقق دائماً قبل الدخول</div>
          <div className="scan-grid">{scanResults.map((s,i)=>(
            <div key={s.symbol} className="scan-card">
              <div className="sc-top">
                <div className="sc-rank">#{i+1}</div>
                <div className="sc-info"><span className="sc-name">{s.name}</span><span className="sc-sym">{s.symbol.replace(".SR","")}</span></div>
                <span className="sc-strength">{s.strength}</span>
              </div>
              <div className="sc-price">{s.price?.toFixed(2)} <small>ر.س</small></div>
              <div className="sc-levels">
                <div className="sc-lv grn">🎯 الهدف<span>{s.target} (+{s.profitPct}%)</span></div>
                <div className="sc-lv red">🛑 الوقف<span>{s.stop}</span></div>
              </div>
              <div className="sc-vol-badge">🔥 انفجار الحجم {s.volExplosion}x | شمعة +{s.candleChange}%</div>
              <div className="sc-conds">
                <span className={s.conditions.c1?"cond-ok":"cond-no"}>حجم {s.volExplosion}x</span>
                <span className={s.conditions.c2?"cond-ok":"cond-no"}>كسر المقاومة</span>
                <span className={s.conditions.c3?"cond-ok":"cond-no"}>هدوء قبلها</span>
                <span className={s.conditions.c4?"cond-ok":"cond-no"}>شمعة +{s.candleChange}%</span>
                <span className={s.conditions.c5?"cond-ok":"cond-no"}>RSI {s.rsi?.toFixed(0)}</span>
                <span className={s.conditions.c6?"cond-ok":"cond-no"}>نطاق {s.range5}%</span>
                <span className={s.conditions.c7?"cond-ok":"cond-no"}>أسبوع ↑</span>
              </div>
            </div>
          ))}</div>
        </>}
      </div>}
      {mainView==="usscanner"&&<div className="scanner-wrap">
        <div className="scan-hdr">
          <div><h2 className="scan-title">🇺🇸 سكانر السوق الأمريكي</h2><p className="scan-sub">أسهم رخيصة | حجم +500K | تغير الحجم +100% | حجم نسبي 2x+ | صاعد 🔥</p></div>
          <button className="scanbtn" onClick={runUsScanner} disabled={usScanLoading}>{usScanLoading?"⏳ جاري الفحص...":"🔍 ابدأ الفحص"}</button>
        </div>
        <div className="us-price-controls">
          <div className="usp-top-row">
            <span className="usp-label">💰 نطاق السعر (USD):</span>
            <div className="usp-custom">
              <span>من $</span>
              <input type="number" value={usMinPrice} onChange={e=>setUsMinPrice(e.target.value)} min="0.1" max="100" step="0.5" className="usp-input"/>
              <span>إلى $</span>
              <input type="number" value={usMaxPrice} onChange={e=>setUsMaxPrice(e.target.value)} min="0.5" max="100" step="0.5" className="usp-input"/>
            </div>
          </div>
          <div className="usp-presets">
            <button className={`usp-btn${usMinPrice==="1"&&usMaxPrice==="5"?" usp-act":""}`} onClick={()=>{setUsMinPrice("1");setUsMaxPrice("5")}}>🔥 $1 - $5 Penny</button>
            <button className={`usp-btn${usMinPrice==="5"&&usMaxPrice==="10"?" usp-act":""}`} onClick={()=>{setUsMinPrice("5");setUsMaxPrice("10")}}>$5 - $10</button>
            <button className={`usp-btn${usMinPrice==="10"&&usMaxPrice==="25"?" usp-act":""}`} onClick={()=>{setUsMinPrice("10");setUsMaxPrice("25")}}>$10 - $25</button>
            <button className={`usp-btn${usMinPrice==="1"&&usMaxPrice==="25"?" usp-act":""}`} onClick={()=>{setUsMinPrice("1");setUsMaxPrice("25")}}>الكل $1-$25</button>
          </div>
        </div>
        {usScanLoading&&<div className="scan-loading"><div className="scan-spinner"/><p>يفحص أسهم السوق الأمريكي $5-$10...</p></div>}
        {usScanDone&&!usScanLoading&&<>
          <div className="scan-summary">{usScanResults.length>0?`✅ وجد ${usScanResults.length} سهم مرشح`:"❌ لا توجد أسهم تحقق الشروط الآن"}</div>
          <div className="scan-disclaimer">⚠️ للأغراض التعليمية فقط — السوق الأمريكي يفتح 4:30 مساءً بتوقيت السعودية — ليس نصيحة استثمارية</div>
          <div className="scan-grid">{usScanResults.map((s,i)=>(
            <div key={s.symbol} className="scan-card">
              <div className="sc-top">
                <div className="sc-rank">#{i+1}</div>
                <div className="sc-info"><span className="sc-name">{s.name}</span><span className="sc-sym">{s.symbol}</span></div>
                <span className="sc-strength">{s.strength}</span>
              </div>
              <div className="sc-price">${s.price?.toFixed(2)} <small>USD</small></div>
              <div className="sc-levels">
                <div className="sc-lv grn">🎯 الهدف<span>${s.target} (+{s.profitPct}%)</span></div>
                <div className="sc-lv red">🛑 الوقف<span>${s.stop}</span></div>
              </div>
              <div className="sc-vol-badge">🔥 حجم نسبي {s.volExplosion}x | تغير الحجم +{s.volChange}% | شمعة +{s.candleChange}%</div>
              <div className="sc-conds">
                <span className={s.conditions.c1?"cond-ok":"cond-no"}>حجم {(s.vol/1000).toFixed(0)}K</span>
                <span className={s.conditions.c2?"cond-ok":"cond-no"}>حجم +{s.volChange}%</span>
                <span className={s.conditions.c3?"cond-ok":"cond-no"}>نسبي {s.volExplosion}x</span>
                <span className={s.conditions.c4?"cond-ok":"cond-no"}>صاعد ↑</span>
                <span className={s.conditions.c5?"cond-ok":"cond-no"}>شمعة +{s.candleChange}%</span>
                <span className={s.conditions.c6?"cond-ok":"cond-no"}>كسر المقاومة</span>
                <span className={s.conditions.c7?"cond-ok":"cond-no"}>RSI {s.rsi?.toFixed(0)}</span>
              </div>
            </div>
          ))}</div>
        </>}
      </div>}
      {mainView==="smcscanner"&&<div className="scanner-wrap">
        <div className="scan-hdr">
          <div><h2 className="scan-title">🧠 سكانر SMC الذكي</h2><p className="scan-sub">Order Block · FVG · BOS · CHoCH · RSI ارتداد · انفجار حجم · NR ضغط</p></div>
          <button className="scanbtn" onClick={runSmcScanner} disabled={smcLoading}>{smcLoading?"⏳ جاري الفحص...":"⚡ تشغيل المسح"}</button>
        </div>
        <div className="us-price-controls">
          <div className="usp-top-row">
            <span className="usp-label">🔬 الحد الأدنى للإشارات:</span>
            <div className="usp-custom" style={{gap:"8px"}}>
              {[2,3,4,5].map(v=><button key={v} className={`usp-btn${smcMinScore===v?" usp-act":""}`} onClick={()=>setSmcMinScore(v)}>{v==="2"?"كل الإشارات":v===3?"3+ إشارات":v===4?"4+ قوي":v===5?"5+ ممتاز":v+"+ إشارات"}</button>)}
            </div>
          </div>
        </div>
        {smcLoading&&<div className="scan-loading"><div className="scan-spinner"/><p>يحلل إشارات SMC على كل الأسهم...</p></div>}
        {smcDone&&!smcLoading&&<>
          <div className="scan-summary">{smcResults.length>0?`✅ وجد ${smcResults.length} سهم بإشارات SMC`:"❌ لا توجد أسهم تحقق الشروط — جرب تخفيض الحد الأدنى للإشارات"}</div>
          <div className="scan-disclaimer">⚠️ إشارات SMC تقنية بحتة · راجع الشارت قبل الدخول · ليس نصيحة استثمارية</div>
          <div className="scan-grid">{smcResults.map((s,i)=>(
            <div key={s.symbol} className="scan-card" style={{borderTop:`2px solid ${s.score>=6?"#26a69a":s.score>=4?"#ff9800":"#2196f3"}`}}>
              <div className="sc-top">
                <div className="sc-rank">#{i+1}</div>
                <div className="sc-info"><span className="sc-name">{s.name}</span><span className="sc-sym">{s.symbol}</span></div>
                <span className="sc-strength">{s.strength}</span>
              </div>
              <div className="sc-price">{s.price?.toFixed(2)} <small>ر.س</small></div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"4px",margin:"6px 0"}}>
                {s.sigs.map((sg,j)=><span key={j} style={{fontSize:"10px",padding:"2px 7px",borderRadius:"10px",background:sg.c+"22",color:sg.c,border:`1px solid ${sg.c}44`}}>{sg.t}</span>)}
              </div>
              <div className="sc-levels">
                <div className="sc-lv grn">🎯 TP1 <span>{s.tp1}</span></div>
                <div className="sc-lv grn">🎯 TP2 <span>{s.tp2}</span></div>
                <div className="sc-lv grn">🎯 TP3 <span>{s.tp3}</span></div>
                <div className="sc-lv red">🛑 SL <span>{s.sl}</span></div>
              </div>
              <div className="sc-vol-badge">RSI {s.rsi} · ATR {s.atr} · حجم {s.vol_exp}x · نطاق {s.nr}% · R:R 1:{s.rr}</div>
              <div className="sc-conds">
                <span style={{fontSize:"11px",color:"rgba(255,255,255,.5)"}}>نقاط: {s.score}/8</span>
              </div>
            </div>
          ))}</div>
        </>}
      </div>}
      </div>}
      {mainView==="ussmcscanner"&&<div className="scanner-wrap">
        <div className="scan-hdr">
          <div><h2 className="scan-title">🇺🇸 سكانر SMC الأمريكي</h2><p className="scan-sub">Order Block · FVG · BOS · CHoCH · RSI · انفجار حجم · NR — بيانات حقيقية EODHD</p></div>
          <button className="scanbtn" onClick={runUsSmcScanner} disabled={usSmcLoading}>{usSmcLoading?"⏳ جاري الفحص...":"⚡ تشغيل المسح"}</button>
        </div>
        <div className="us-price-controls">
          <div className="usp-top-row">
            <span className="usp-label">🔬 الحد الأدنى للإشارات:</span>
            <div className="usp-custom" style={{gap:"8px"}}>
              {[2,3,4,5].map(v=><button key={v} className={`usp-btn${usSmcMinScore===v?" usp-act":""}`} onClick={()=>setUsSmcMinScore(v)}>{v===2?"2+ إشارات":v===3?"3+ إشارات":v===4?"4+ قوي":"5+ ممتاز"}</button>)}
            </div>
          </div>
          <div className="usp-top-row" style={{marginTop:"8px"}}>
            <span className="usp-label">💰 نطاق السعر ($):</span>
            <div className="usp-custom" style={{gap:"8px"}}>
              {[["1","10","Penny"],["10","50","صغيرة"],["50","200","متوسطة"],["0","9999","الكل"]].map(([mn,mx,lbl])=>(
                <button key={lbl} className={`usp-btn${usSmcMinPrice===mn&&usSmcMaxPrice===mx?" usp-act":""}`} onClick={()=>{setUsSmcMinPrice(mn);setUsSmcMaxPrice(mx)}}>{lbl}</button>
              ))}
            </div>
          </div>
        </div>
        {usSmcLoading&&<div className="scan-loading"><div className="scan-spinner"/><p>يحلل إشارات SMC على الأسهم الأمريكية...</p></div>}
        {usSmcDone&&!usSmcLoading&&<>
          <div className="scan-summary">{usSmcResults.length>0?`✅ وجد ${usSmcResults.length} سهم أمريكي بإشارات SMC`:"❌ لا توجد أسهم — جرب تخفيض الحد الأدنى للإشارات"}</div>
          <div className="scan-disclaimer">⚠️ السوق الأمريكي يفتح 4:30 مساءً بتوقيت السعودية · إشارات تقنية بحتة · ليس نصيحة استثمارية</div>
          <div className="scan-grid">{usSmcResults.map((s,i)=>(
            <div key={s.symbol} className="scan-card" style={{borderTop:`2px solid ${s.score>=6?"#26a69a":s.score>=4?"#ff9800":"#2196f3"}`}}>
              <div className="sc-top">
                <div className="sc-rank">#{i+1}</div>
                <div className="sc-info">
                  <span className="sc-name">{s.name}</span>
                  <span className="sc-sym">{s.symbol} · {s.sector}</span>
                </div>
                <span className="sc-strength">{s.strength}</span>
              </div>
              <div className="sc-price">${s.price?.toFixed(2)} <small>USD</small> <span style={{fontSize:"11px",color:parseFloat(s.chgPct)>=0?"#26a69a":"#ef5350",marginRight:"6px"}}>{parseFloat(s.chgPct)>=0?"▲":"▼"}{Math.abs(s.chgPct)}%</span></div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"4px",margin:"6px 0"}}>
                {s.sigs.map((sg,j)=><span key={j} style={{fontSize:"10px",padding:"2px 7px",borderRadius:"10px",background:sg.c+"22",color:sg.c,border:`1px solid ${sg.c}44`}}>{sg.t}</span>)}
              </div>
              <div className="sc-levels">
                <div className="sc-lv grn">🎯 TP1 <span>${s.tp1}</span></div>
                <div className="sc-lv grn">🎯 TP2 <span>${s.tp2}</span></div>
                <div className="sc-lv grn">🎯 TP3 <span>${s.tp3}</span></div>
                <div className="sc-lv red">🛑 SL <span>${s.sl}</span></div>
              </div>
              <div className="sc-vol-badge">RSI {s.rsi} · ATR {s.atr} · حجم {s.vol_exp}x · نطاق {s.nr}% · نقاط {s.score}/12</div>
            </div>
          ))}</div>
        </>}
      </div>}
      {mainView==="market"&&<div className={`cgrid${sel?" hdet":""}`}>
        <div className="spanel">{view==="cards"?<div className="sgrid">{filtered.map(s=><StockCard key={s.symbol} stock={s} onSelect={setSel} selected={sel?.symbol===s.symbol} sigData={sigMap[s.symbol]}/>)}</div>:<Heatmap stocks={filtered}/>}</div>

        {sel&&<div className="dpanel">
          <div className="dhdr"><div><h2>{sel.name}</h2><span className="dsym">{sel.symbol.replace(".SR","")} · {sel.nameEn}</span></div><button className="clbtn" onClick={()=>setSel(null)}>✕</button></div>
          {sel.data&&<>
            <div className="dpr"><span className="dp">{sel.data.price?.toFixed(2)} <small>ر.س</small></span><span className="dch" style={{color:(sel.data.changePercent||0)>=0?"#00E676":"#FF1744"}}>{(sel.data.changePercent||0)>=0?"▲":"▼"} {Math.abs(sel.data.changePercent||0).toFixed(2)}%</span></div>

            <div className="sigbox"><div className="sigbhdr"><h3>🎯 إشارة التداول</h3><SigBadge signal={sigData.signal} strength={sigData.strength}/></div><SigMeter buy={sigData.buySignals} sell={sigData.sellSignals} neutral={sigData.neutralSignals}/>{sigData.support>0&&<div className="srlevels"><div className="sri"><span className="srl">📗 الدعم</span><span className="srv grn">{sigData.support?.toFixed(2)}</span></div><div className="sri"><span className="srl">📕 المقاومة</span><span className="srv red">{sigData.resistance?.toFixed(2)}</span></div></div>}</div>

            <div className="siglist"><h3>📋 تفاصيل الإشارات</h3>{sigData.signals.map((s,i)=><div key={i} className={`sgi sgi-${s.type}`}><span className="sgdot"/><div className="sginfo"><span className="sgn">{s.name}</span><span className="sgd">{s.detail}</span></div><span className="sgt">{s.type==="buy"?"شراء":s.type==="sell"?"بيع":"حيادي"}</span></div>)}</div>

            <div className="dsts"><div className="stb2"><span>الافتتاح</span><span>{sel.data.open?.toFixed(2)}</span></div><div className="stb2"><span>الأعلى</span><span style={{color:"#00E676"}}>{sel.data.high?.toFixed(2)}</span></div><div className="stb2"><span>الأدنى</span><span style={{color:"#FF1744"}}>{sel.data.low?.toFixed(2)}</span></div><div className="stb2"><span>الحجم</span><span>{sel.data.volume?(sel.data.volume/1e6).toFixed(1)+"M":"-"}</span></div><div className="stb2"><span>السوقية</span><span>{sel.data.marketCap?(sel.data.marketCap/1e9).toFixed(1)+"B":"-"}</span></div><div className="stb2"><span>RSI</span><span style={{color:sigData.rsi>70?"#FF1744":sigData.rsi<30?"#00E676":"#FFD740"}}>{sigData.rsi?.toFixed(1)}</span></div></div>

            <div className="chsec"><h3>📈 الرسم البياني</h3><CandleChart data={chartData} signals={sigData}/><VolChart data={chartData}/></div>

            <div className="inds"><h3>📊 المؤشرات الفنية</h3><div className="igrid">
              <div className="iitem"><span className="il">RSI (14)</span><span className="iv">{sigData.rsi?.toFixed(1)}</span><div className="rbar"><div className="rfill" style={{width:`${sigData.rsi}%`,background:sigData.rsi>70?"#FF1744":sigData.rsi<30?"#00E676":"#FFD740"}}/></div></div>
              <div className="iitem"><span className="il">MACD</span><span className="iv" style={{color:sigData.macdData?.macd>=0?"#00E676":"#FF1744"}}>{sigData.macdData?.macd?.toFixed(3)}</span></div>
              <div className="iitem"><span className="il">SMA 7</span><span className="iv">{sigData.sma7?.toFixed(2)||"-"}</span></div>
              <div className="iitem"><span className="il">SMA 20</span><span className="iv">{sigData.sma20?.toFixed(2)||"-"}</span></div>
              {sigData.bollinger&&<><div className="iitem"><span className="il">بولينجر ↑</span><span className="iv">{sigData.bollinger.upper?.toFixed(2)}</span></div><div className="iitem"><span className="il">بولينجر ↓</span><span className="iv">{sigData.bollinger.lower?.toFixed(2)}</span></div></>}
              <div className="iitem"><span className="il">Stoch %K</span><span className="iv">{sigData.stoch?.k?.toFixed(1)}</span></div>
              <div className="iitem"><span className="il">ATR</span><span className="iv">{sigData.atr?.toFixed(3)||"-"}</span></div>
            </div></div>

            <AIPanel stock={sel} chartData={chartData}/>
            <div className="disc">⚠️ تنبيه: هذه أداة مساعدة وليست نصيحة استثمارية. استشر مستشاراً مالياً مرخصاً قبل اتخاذ أي قرار.</div>
          </>}
        </div>}
      </div>}
      </main>

      <footer className="ftr"><p>تصميم وتطوير <strong>فؤاد الرشيدي</strong> · محلل السوق السعودي · للأغراض التعليمية فقط</p></footer>
    </div>

    <style jsx global>{`
      *{margin:0;padding:0;box-sizing:border-box}html{direction:rtl}body{font-family:'Noto Kufi Arabic',sans-serif;background:#07080c;color:#e0e0e0;min-height:100vh;overflow-x:hidden}
      ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:rgba(255,255,255,.02)}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}
      .app{position:relative;min-height:100vh}
      .ambg{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
      .orb{position:absolute;border-radius:50%;filter:blur(120px)}.o1{width:600px;height:600px;background:rgba(0,230,118,.035);top:-200px;right:-100px;animation:f1 20s ease-in-out infinite}.o2{width:500px;height:500px;background:rgba(68,138,255,.035);bottom:-150px;left:-100px;animation:f2 25s ease-in-out infinite}.o3{width:400px;height:400px;background:rgba(224,64,251,.025);top:40%;left:40%;animation:f3 30s ease-in-out infinite}
      @keyframes f1{0%,100%{transform:translate(0,0)}50%{transform:translate(-50px,50px)}}@keyframes f2{0%,100%{transform:translate(0,0)}50%{transform:translate(50px,-50px)}}@keyframes f3{0%,100%{transform:translate(-50%,-50%)}50%{transform:translate(-40%,-60%)}}

      .hdr{position:sticky;top:0;z-index:100;background:rgba(7,8,12,.88);backdrop-filter:blur(24px);border-bottom:1px solid rgba(255,255,255,.05);padding:12px 28px}
      .hinner{display:flex;justify-content:space-between;align-items:center;max-width:1600px;margin:0 auto;flex-wrap:wrap;gap:12px}
      .lsec{display:flex;align-items:center;gap:14px}
      .dname{font-size:11px;font-weight:800;color:#00E676;letter-spacing:1.5px;display:block;margin-bottom:3px}
      .ltxt h1{font-size:20px;font-weight:900;background:linear-gradient(135deg,#00E676,#00BCD4);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
      .ltxt p{font-size:10px;color:rgba(255,255,255,.35);margin-top:1px}
      .hright{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
      .tbadge{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.03);padding:6px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.05)}
      .tl{font-size:10px;color:rgba(255,255,255,.35);font-weight:700}.tv{font-family:'Space Mono',monospace;font-size:16px;font-weight:700;color:white}.tc{font-family:'Space Mono',monospace;font-size:12px;font-weight:600}
      .abtn{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);color:white;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:14px;position:relative}
      .acnt{position:absolute;top:-4px;right:-4px;background:#FF1744;color:white;font-size:9px;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Space Mono'}
      .lupd{font-size:10px;color:rgba(255,255,255,.25)}.rbtn{background:rgba(0,230,118,.08);border:1px solid rgba(0,230,118,.15);color:#00E676;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:13px;transition:all .2s}.rbtn:hover{background:rgba(0,230,118,.15)}.rbtn:disabled{opacity:.4}

      .tbar{max-width:1600px;margin:0 auto;padding:12px 28px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;z-index:10;position:relative}
      .sbox{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);border-radius:10px;padding:8px 14px;min-width:220px}
      .sbox input{background:none;border:none;outline:none;color:white;font-family:inherit;font-size:13px;width:100%}.sbox input::placeholder{color:rgba(255,255,255,.2)}
      .stabs{display:flex;gap:5px;flex-wrap:wrap;flex:1}
      .stb{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);color:rgba(255,255,255,.4);padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:11px;transition:all .2s;white-space:nowrap}.stb:hover{background:rgba(255,255,255,.06);color:white}.stb.act{background:rgba(0,230,118,.12);border-color:rgba(0,230,118,.25);color:#00E676}
      .vtog{display:flex;gap:4px}.vtog button{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);color:rgba(255,255,255,.35);padding:6px 12px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:11px;transition:all .2s}.vtog button.act{background:rgba(68,138,255,.12);border-color:rgba(68,138,255,.25);color:#448AFF}

      .sigbar{max-width:1600px;margin:0 auto;padding:4px 28px 10px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;z-index:10;position:relative}
      .sigbar-label{font-size:12px;font-weight:700;color:rgba(255,255,255,.5)}.sigbtns{display:flex;gap:5px;flex-wrap:wrap}
      .sfb{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.4);padding:6px 14px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:11px;font-weight:600;transition:all .2s;white-space:nowrap}.sfb:hover{background:rgba(255,255,255,.06);color:white}
      .sact{font-weight:800}
      .sfb-شراء.sact{background:rgba(0,230,118,.15);border-color:rgba(0,230,118,.3);color:#00E676}
      .sfb-حيادي.sact{background:rgba(255,215,64,.12);border-color:rgba(255,215,64,.25);color:#FFD740}
      .sfb-بيع.sact{background:rgba(255,23,68,.12);border-color:rgba(255,23,68,.25);color:#FF1744}
      .sfb-الكل.sact{background:rgba(68,138,255,.12);border-color:rgba(68,138,255,.25);color:#448AFF}
      .sfb-صاعد.sact{background:rgba(0,230,118,.12);border-color:rgba(0,230,118,.25);color:#00E676}
      .sfb-هابط.sact{background:rgba(255,23,68,.12);border-color:rgba(255,23,68,.25);color:#FF1744}
      .sigbar-count{font-size:11px;color:rgba(255,255,255,.3);font-family:'Space Mono',monospace}

      .mn{max-width:1600px;margin:0 auto;padding:0 28px 28px;position:relative;z-index:1}
      .cgrid{display:grid;grid-template-columns:1fr;gap:20px}.cgrid.hdet{grid-template-columns:1fr 440px}
      .sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
      .scard{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:14px;cursor:pointer;transition:all .25s;position:relative;overflow:hidden}
      .scard:hover{border-color:rgba(0,230,118,.2);transform:translateY(-2px);background:rgba(255,255,255,.035)}.scard.sel{border-color:rgba(0,230,118,.35);background:rgba(0,230,118,.04)}
      .ctop{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
      .sname{display:block;font-size:13px;font-weight:700;color:white}.ssym{font-family:'Space Mono',monospace;font-size:10px;color:rgba(255,255,255,.25)}
      .cbody{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:10px}
      .sprice{font-family:'Space Mono',monospace;font-size:18px;font-weight:700;color:white}.sprice small{font-size:10px;color:rgba(255,255,255,.25)}
      .sch{font-family:'Space Mono',monospace;font-size:12px;font-weight:600}
      .cfoot{display:flex;gap:14px;border-top:1px solid rgba(255,255,255,.04);padding-top:8px}
      .st{display:flex;flex-direction:column}.sl{font-size:9px;color:rgba(255,255,255,.2)}.sv{font-family:'Space Mono',monospace;font-size:11px;color:rgba(255,255,255,.6)}
      .sloading{min-height:150px}.shimmer{width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.02),transparent);animation:shm 2s infinite}@keyframes shm{0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}
      .sbadge{font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;border:1px solid;white-space:nowrap}

      .dpanel{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:16px;padding:20px;height:fit-content;position:sticky;top:80px;max-height:calc(100vh - 100px);overflow-y:auto}
      .dhdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}.dhdr h2{font-size:18px;font-weight:800;color:white}.dsym{font-family:'Space Mono',monospace;font-size:11px;color:rgba(255,255,255,.3)}
      .clbtn{background:rgba(255,255,255,.04);border:none;color:rgba(255,255,255,.35);width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:14px;transition:all .2s}.clbtn:hover{background:rgba(255,23,68,.12);color:#FF1744}
      .dpr{display:flex;align-items:baseline;gap:14px;margin-bottom:16px}.dp{font-family:'Space Mono',monospace;font-size:28px;font-weight:700;color:white}.dp small{font-size:12px;color:rgba(255,255,255,.25)}.dch{font-family:'Space Mono',monospace;font-size:14px;font-weight:600}

      .sigbox{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:14px;margin-bottom:14px}
      .sigbhdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.sigbhdr h3{font-size:13px;font-weight:700;color:white}
      .smeter{margin-top:8px}.mbar{display:flex;height:8px;border-radius:4px;overflow:hidden;background:rgba(255,255,255,.04)}
      .mbuy{background:#00E676;transition:width .5s}.mneu{background:#FFD740;transition:width .5s}.msel{background:#FF1744;transition:width .5s}
      .mlabels{display:flex;justify-content:space-between;margin-top:6px;font-size:10px}.mlb{color:#00E676}.mln{color:#FFD740}.mls{color:#FF1744}
      .srlevels{display:flex;gap:12px;margin-top:10px}.sri{flex:1;background:rgba(255,255,255,.03);border-radius:8px;padding:8px;text-align:center}
      .srl{font-size:10px;display:block;color:rgba(255,255,255,.4);margin-bottom:4px}.srv{font-family:'Space Mono',monospace;font-size:14px;font-weight:700}.srv.grn{color:#00E676}.srv.red{color:#FF1744}

      .siglist{margin-bottom:14px}.siglist h3{font-size:13px;font-weight:700;color:rgba(255,255,255,.7);margin-bottom:10px}
      .sgi{display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;margin-bottom:4px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.03)}
      .sgdot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
      .sgi-buy .sgdot{background:#00E676}.sgi-sell .sgdot{background:#FF1744}.sgi-neutral .sgdot{background:#FFD740}
      .sginfo{flex:1}.sgn{font-size:11px;font-weight:600;color:white;display:block}.sgd{font-size:10px;color:rgba(255,255,255,.35)}
      .sgt{font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px}
      .sgi-buy .sgt{color:#00E676;background:rgba(0,230,118,.1)}.sgi-sell .sgt{color:#FF1744;background:rgba(255,23,68,.1)}.sgi-neutral .sgt{color:#FFD740;background:rgba(255,215,64,.1)}

      .dsts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
      .stb2{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.035);border-radius:8px;padding:8px;text-align:center}
      .stb2 span:first-child{display:block;font-size:9px;color:rgba(255,255,255,.25);margin-bottom:3px}.stb2 span:last-child{font-family:'Space Mono',monospace;font-size:12px;font-weight:600}

      .chsec{margin-bottom:14px}.chsec h3{font-size:13px;font-weight:600;color:rgba(255,255,255,.5);margin-bottom:8px}
      .csvg{width:100%;height:auto}.cempty{text-align:center;padding:30px;color:rgba(255,255,255,.15)}

      .inds{margin-bottom:14px}.inds h3{font-size:13px;font-weight:600;color:rgba(255,255,255,.5);margin-bottom:10px}
      .igrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
      .iitem{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.035);border-radius:8px;padding:10px}
      .il{font-size:9px;color:rgba(255,255,255,.25);font-weight:600;text-transform:uppercase;letter-spacing:.5px}
      .iv{font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:white;display:block;margin-top:2px}
      .rbar{width:100%;height:4px;background:rgba(255,255,255,.04);border-radius:2px;margin-top:6px}.rfill{height:100%;border-radius:2px;transition:width .5s}

      .aipanel{background:rgba(68,138,255,.04);border:1px solid rgba(68,138,255,.1);border-radius:12px;padding:14px;margin-bottom:14px}
      .aihead{display:flex;align-items:center;gap:8px;margin-bottom:10px}.aihead h3{font-size:13px;font-weight:600;color:rgba(255,255,255,.6);flex:1}
      .aibtn{background:linear-gradient(135deg,rgba(0,230,118,.15),rgba(0,188,212,.15));border:1px solid rgba(0,230,118,.25);color:#00E676;padding:6px 14px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:11px;font-weight:700;transition:all .2s}.aibtn:hover{background:linear-gradient(135deg,rgba(0,230,118,.25),rgba(0,188,212,.25))}.aibtn:disabled{opacity:.4}
      .aicontent{font-size:12px;line-height:1.9;color:rgba(255,255,255,.65);white-space:pre-wrap}
      .disc{background:rgba(255,152,0,.06);border:1px solid rgba(255,152,0,.12);border-radius:10px;padding:10px 14px;font-size:10px;color:rgba(255,152,0,.7);text-align:center;margin-top:6px}

      .hmap{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;padding:16px}
      .hmcell{display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:8px;border:1px solid rgba(255,255,255,.05);transition:all .2s;cursor:pointer}.hmcell:hover{transform:scale(1.05)}.hmn{font-size:8px;font-weight:600;color:white;text-align:center}.hmc{font-family:'Space Mono',monospace;font-size:9px;font-weight:700}

      .apanel{position:fixed;top:70px;left:28px;width:320px;max-height:400px;background:rgba(10,10,15,.95);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.08);border-radius:14px;z-index:200;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}
      .ahead{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.05);font-size:13px;font-weight:700;color:white}.ahead button{background:none;border:none;color:rgba(255,255,255,.3);cursor:pointer;font-size:14px}
      .alist{max-height:340px;overflow-y:auto;padding:8px}
      .aitem{display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;margin-bottom:4px;background:rgba(255,255,255,.02)}
      .ahigh{border-right:3px solid #FF1744}.amedium{border-right:3px solid #FFD740}
      .aicon{font-size:18px}.amsg{font-size:11px;color:rgba(255,255,255,.7);display:block}.atime{font-size:9px;color:rgba(255,255,255,.25)}


      .maintabs{display:flex;gap:8px;padding:12px 28px 0;border-bottom:1px solid rgba(255,255,255,.05)}
      .mtb{background:none;border:none;color:rgba(255,255,255,.4);font-family:inherit;font-size:14px;font-weight:600;padding:10px 20px;cursor:pointer;border-bottom:2px solid transparent;transition:all .2s}
      .mtb.mact{color:#00E676;border-bottom-color:#00E676}

      .scanner-wrap{padding:20px 0}
      .scan-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;gap:16px}
      .scan-title{font-size:20px;font-weight:800;color:white;margin:0 0 6px}
      .scan-sub{font-size:12px;color:rgba(255,255,255,.4);margin:0}
      .scanbtn{background:linear-gradient(135deg,#00E676,#00BCD4);border:none;color:#000;font-family:inherit;font-size:14px;font-weight:800;padding:12px 28px;border-radius:12px;cursor:pointer;white-space:nowrap;transition:all .2s}
      .scanbtn:disabled{opacity:.5;cursor:not-allowed}
      .scanbtn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 25px rgba(0,230,118,.3)}

      .scan-loading{text-align:center;padding:60px 20px}
      .scan-spinner{width:48px;height:48px;border:3px solid rgba(0,230,118,.2);border-top-color:#00E676;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px}
      @keyframes spin{to{transform:rotate(360deg)}}
      .scan-loading p{color:rgba(255,255,255,.5);font-size:14px}

      .scan-summary{background:rgba(0,230,118,.08);border:1px solid rgba(0,230,118,.2);border-radius:10px;padding:12px 16px;font-size:14px;font-weight:600;color:#00E676;margin-bottom:10px}
      .scan-disclaimer{background:rgba(255,152,0,.06);border:1px solid rgba(255,152,0,.15);border-radius:10px;padding:10px 16px;font-size:11px;color:rgba(255,152,0,.8);margin-bottom:20px}

      .scan-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
      .scan-card{background:rgba(0,230,118,.04);border:1px solid rgba(0,230,118,.15);border-radius:14px;padding:16px;transition:all .2s}
      .scan-card:hover{border-color:rgba(0,230,118,.35);transform:translateY(-2px)}
      .sc-top{display:flex;align-items:center;gap:10px;margin-bottom:12px}
      .sc-rank{width:28px;height:28px;background:rgba(0,230,118,.15);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#00E676;flex-shrink:0}
      .sc-info{flex:1}.sc-name{display:block;font-size:14px;font-weight:700;color:white}.sc-sym{font-family:'Space Mono',monospace;font-size:10px;color:rgba(255,255,255,.3)}
      .sc-strength{font-size:12px;font-weight:700;white-space:nowrap}
      .sc-price{font-family:'Space Mono',monospace;font-size:24px;font-weight:700;color:white;margin-bottom:12px}.sc-price small{font-size:12px;color:rgba(255,255,255,.3)}
      .sc-levels{display:flex;gap:8px;margin-bottom:12px}
      .sc-lv{flex:1;background:rgba(255,255,255,.03);border-radius:8px;padding:8px 10px;font-size:10px;color:rgba(255,255,255,.4);display:flex;flex-direction:column;gap:4px}
      .sc-lv span{font-family:'Space Mono',monospace;font-size:13px;font-weight:700}
      .sc-lv.grn span{color:#00E676}.sc-lv.red span{color:#FF1744}
      .sc-vol-badge{background:rgba(0,230,118,.08);border:1px solid rgba(0,230,118,.2);border-radius:8px;padding:6px 10px;font-size:11px;font-weight:700;color:#00E676;margin-bottom:8px;text-align:center}
      .sc-conds{display:flex;flex-wrap:wrap;gap:6px}
      .cond-ok{background:rgba(0,230,118,.12);color:#00E676;border:1px solid rgba(0,230,118,.25);padding:3px 8px;border-radius:6px;font-size:10px;font-weight:600}
      .cond-no{background:rgba(255,255,255,.04);color:rgba(255,255,255,.25);border:1px solid rgba(255,255,255,.08);padding:3px 8px;border-radius:6px;font-size:10px;font-weight:600;text-decoration:line-through}

      .us-price-controls{background:rgba(255,255,255,.03);border:1px solid rgba(0,230,118,.15);border-radius:14px;padding:16px 20px;margin-bottom:20px;display:flex;flex-direction:column;gap:12px}
      .usp-top-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
      .usp-label{font-size:13px;font-weight:700;color:#00E676;white-space:nowrap}
      .usp-presets{display:flex;gap:8px;flex-wrap:wrap}
      .usp-btn{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.5);padding:8px 16px;border-radius:9px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;transition:all .2s;white-space:nowrap}
      .usp-btn:hover{background:rgba(255,255,255,.08);color:white}
      .usp-btn.usp-act{background:rgba(0,230,118,.15);border-color:rgba(0,230,118,.35);color:#00E676;font-weight:800}
      .usp-custom{display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(255,255,255,.5)}
      .usp-input{width:65px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:6px 10px;color:white;font-family:inherit;font-size:13px;font-weight:700;text-align:center;outline:none;direction:ltr}
      .usp-input:focus{border-color:rgba(0,230,118,.4);box-shadow:0 0 0 2px rgba(0,230,118,.1)}

      .ftr{text-align:center;padding:20px 28px;border-top:1px solid rgba(255,255,255,.03);margin-top:30px}.ftr p{font-size:10px;color:rgba(255,255,255,.2)}.ftr strong{color:rgba(0,230,118,.6)}

      @media(max-width:1024px){.cgrid.hdet{grid-template-columns:1fr!important}.dpanel{position:static;max-height:none}}
      @media(max-width:640px){.hinner{flex-direction:column}.tbar{flex-direction:column}.sbox{min-width:100%}.sgrid{grid-template-columns:1fr}.dsts{grid-template-columns:repeat(2,1fr)}.hdr,.tbar,.mn,.ftr{padding-left:14px;padding-right:14px}.apanel{left:8px;right:8px;width:auto}}
    `}</style></>
  )
}
