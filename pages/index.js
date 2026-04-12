import Head from "next/head";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const SAUDI_STOCKS = [
  // البنوك
  { symbol: "1120.SR", name: "الراجحي", nameEn: "Al Rajhi", sector: "البنوك" },
  { symbol: "1180.SR", name: "الأهلي السعودي", nameEn: "SNB", sector: "البنوك" },
  { symbol: "1010.SR", name: "الرياض", nameEn: "Riyad Bank", sector: "البنوك" },
  { symbol: "1150.SR", name: "بنك الإنماء", nameEn: "Alinma Bank", sector: "البنوك" },
  { symbol: "1050.SR", name: "بنك الجزيرة", nameEn: "Bank Aljazira", sector: "البنوك" },
  { symbol: "1020.SR", name: "بنك الجزيرة", nameEn: "BJAZ", sector: "البنوك" },
  { symbol: "1030.SR", name: "الاستثمار", nameEn: "SAIB", sector: "البنوك" },
  { symbol: "1060.SR", name: "الأول", nameEn: "SAB", sector: "البنوك" },
  { symbol: "1080.SR", name: "العربي", nameEn: "Arab National Bank", sector: "البنوك" },
  { symbol: "1140.SR", name: "البلاد", nameEn: "Bank Albilad", sector: "البنوك" },
  // الطاقة
  { symbol: "2222.SR", name: "أرامكو السعودية", nameEn: "Saudi Aramco", sector: "الطاقة" },
  { symbol: "2380.SR", name: "بترو رابغ", nameEn: "Petro Rabigh", sector: "الطاقة" },
  { symbol: "4200.SR", name: "الدريس", nameEn: "Aldrees", sector: "الطاقة" },
  { symbol: "2030.SR", name: "المصافي", nameEn: "Sarco", sector: "الطاقة" },
  { symbol: "4210.SR", name: "نماء للكيماويات", nameEn: "Nama Chemicals", sector: "الطاقة" },
  // المواد الأساسية
  { symbol: "2010.SR", name: "سابك", nameEn: "SABIC", sector: "المواد الأساسية" },
  { symbol: "2350.SR", name: "كيان السعودية", nameEn: "Kayan", sector: "المواد الأساسية" },
  { symbol: "2310.SR", name: "سبكيم العالمية", nameEn: "SIPCHEM", sector: "المواد الأساسية" },
  { symbol: "2250.SR", name: "المجموعة السعودية", nameEn: "SIG", sector: "المواد الأساسية" },
  { symbol: "2290.SR", name: "ينساب", nameEn: "Yansab", sector: "المواد الأساسية" },
  { symbol: "2060.SR", name: "التصنيع", nameEn: "Tasnee", sector: "المواد الأساسية" },
  { symbol: "2210.SR", name: "نماء للكيماويات", nameEn: "Nama", sector: "المواد الأساسية" },
  { symbol: "2020.SR", name: "سابك للمغذيات", nameEn: "SABIC Agri", sector: "المواد الأساسية" },
  { symbol: "2330.SR", name: "المتقدمة", nameEn: "Advanced", sector: "المواد الأساسية" },
  // الاتصالات
  { symbol: "7010.SR", name: "الاتصالات السعودية", nameEn: "STC", sector: "الاتصالات" },
  { symbol: "7020.SR", name: "اتحاد اتصالات", nameEn: "Mobily", sector: "الاتصالات" },
  { symbol: "7030.SR", name: "زين السعودية", nameEn: "Zain KSA", sector: "الاتصالات" },
  { symbol: "7040.SR", name: "عذيب للاتصالات", nameEn: "Atheeb", sector: "الاتصالات" },
  // الأغذية
  { symbol: "2280.SR", name: "المراعي", nameEn: "Almarai", sector: "الأغذية" },
  { symbol: "2050.SR", name: "صافولا", nameEn: "Savola", sector: "الأغذية" },
  { symbol: "6001.SR", name: "حلواني إخوان", nameEn: "Halwani Bros", sector: "الأغذية" },
  { symbol: "6002.SR", name: "هرفي للأغذية", nameEn: "Herfy", sector: "الأغذية" },
  { symbol: "6004.SR", name: "الأغذية المتحدة", nameEn: "Catering", sector: "الأغذية" },
  { symbol: "6090.SR", name: "جاكو للأغذية", nameEn: "Jaco", sector: "الأغذية" },
  { symbol: "2270.SR", name: "سدافكو", nameEn: "SADAFCO", sector: "الأغذية" },
  // التجزئة
  { symbol: "4190.SR", name: "جرير", nameEn: "Jarir", sector: "التجزئة" },
  { symbol: "4003.SR", name: "إكسترا", nameEn: "eXtra", sector: "التجزئة" },
  { symbol: "4001.SR", name: "عبداللطيف جميل", nameEn: "ALJ", sector: "التجزئة" },
  { symbol: "4240.SR", name: "سينومي ريتيل", nameEn: "Cenomi Retail", sector: "التجزئة" },
  { symbol: "4180.SR", name: "فتيحي", nameEn: "Fitaihi", sector: "التجزئة" },
  { symbol: "4160.SR", name: "ثمار", nameEn: "Thimar", sector: "التجزئة" },
  { symbol: "4050.SR", name: "ساسكو", nameEn: "SASCO", sector: "التجزئة" },
  // التأمين
  { symbol: "8010.SR", name: "التعاونية", nameEn: "Tawuniya", sector: "التأمين" },
  { symbol: "8020.SR", name: "ملاذ للتأمين", nameEn: "Malath", sector: "التأمين" },
  { symbol: "8030.SR", name: "ميدغلف", nameEn: "MedGulf", sector: "التأمين" },
  { symbol: "8040.SR", name: "أليانز السعودي", nameEn: "Allianz SF", sector: "التأمين" },
  { symbol: "8050.SR", name: "سلامة", nameEn: "Salama", sector: "التأمين" },
  { symbol: "8200.SR", name: "الدرع العربي", nameEn: "Arabian Shield", sector: "التأمين" },
  { symbol: "8240.SR", name: "تكافل الراجحي", nameEn: "Al Rajhi Takaful", sector: "التأمين" },
  // الأسمنت
  { symbol: "3010.SR", name: "أسمنت العربية", nameEn: "Arabian Cement", sector: "الأسمنت" },
  { symbol: "3020.SR", name: "أسمنت اليمامة", nameEn: "Yamama Cement", sector: "الأسمنت" },
  { symbol: "3030.SR", name: "أسمنت السعودية", nameEn: "Saudi Cement", sector: "الأسمنت" },
  { symbol: "3040.SR", name: "أسمنت القصيم", nameEn: "Qassim Cement", sector: "الأسمنت" },
  { symbol: "3050.SR", name: "أسمنت الجنوب", nameEn: "Southern Cement", sector: "الأسمنت" },
  { symbol: "3060.SR", name: "أسمنت ينبع", nameEn: "Yanbu Cement", sector: "الأسمنت" },
  { symbol: "3080.SR", name: "أسمنت الشرقية", nameEn: "Eastern Cement", sector: "الأسمنت" },
  { symbol: "3090.SR", name: "أسمنت تبوك", nameEn: "Tabuk Cement", sector: "الأسمنت" },
  { symbol: "3091.SR", name: "أسمنت الجوف", nameEn: "Jouf Cement", sector: "الأسمنت" },
  // التعدين
  { symbol: "1211.SR", name: "معادن", nameEn: "Ma'aden", sector: "التعدين" },
  // النقل
  { symbol: "4030.SR", name: "البحري", nameEn: "Bahri", sector: "النقل" },
  { symbol: "4040.SR", name: "سابتكو", nameEn: "SAPTCO", sector: "النقل" },
  { symbol: "4110.SR", name: "باتك", nameEn: "BATEC", sector: "النقل" },
  { symbol: "4261.SR", name: "بدجت السعودية", nameEn: "Budget Saudi", sector: "النقل" },
  // الزراعة
  { symbol: "6010.SR", name: "نادك", nameEn: "NADEC", sector: "الزراعة" },
  { symbol: "6020.SR", name: "الجوف الزراعية", nameEn: "JADCO", sector: "الزراعة" },
  { symbol: "6050.SR", name: "الأسماك", nameEn: "NFPC", sector: "الزراعة" },
  { symbol: "6060.SR", name: "الشرقية للتنمية", nameEn: "SSADCO", sector: "الزراعة" },
  { symbol: "6070.SR", name: "الجوف", nameEn: "Al Jouf", sector: "الزراعة" },
  // العقارات
  { symbol: "4300.SR", name: "دار الأركان", nameEn: "Dar Al Arkan", sector: "العقارات" },
  { symbol: "4310.SR", name: "مكة للإنشاء", nameEn: "MACE", sector: "العقارات" },
  { symbol: "4320.SR", name: "الأندلس العقارية", nameEn: "Al Andalus", sector: "العقارات" },
  { symbol: "4020.SR", name: "العقارية", nameEn: "SRECO", sector: "العقارات" },
  // الخدمات الصحية
  { symbol: "4002.SR", name: "المواساة", nameEn: "Mouwasat", sector: "الصحة" },
  { symbol: "4004.SR", name: "دله الصحية", nameEn: "Dallah Health", sector: "الصحة" },
  { symbol: "4005.SR", name: "رعاية", nameEn: "Care", sector: "الصحة" },
  { symbol: "4013.SR", name: "سليمان الحبيب", nameEn: "Dr. Sulaiman", sector: "الصحة" },
  // المرافق العامة
  { symbol: "5110.SR", name: "الكهرباء", nameEn: "SEC", sector: "المرافق" },
  { symbol: "2082.SR", name: "أكوا باور", nameEn: "ACWA Power", sector: "المرافق" },
  // الإعلام والترفيه
  { symbol: "4070.SR", name: "تهامة", nameEn: "Tihama", sector: "الإعلام" },
  { symbol: "1111.SR", name: "مجموعة تداول", nameEn: "Tadawul Group", sector: "الخدمات المالية" },
];
const SECTORS = ["الكل","البنوك","الطاقة","المواد الأساسية","الاتصالات","الأغذية","التجزئة","التأمين","الأسمنت","التعدين","النقل","الزراعة","العقارات","الصحة","المرافق","الإعلام","الخدمات المالية"];

function calcSMA(d,p){if(d.length<p)return null;return d.slice(-p).reduce((s,v)=>s+v,0)/p}
function calcEMA(d,p){if(d.length<p)return null;const k=2/(p+1);let e=d.slice(0,p).reduce((s,v)=>s+v,0)/p;for(let i=p;i<d.length;i++)e=d[i]*k+e*(1-k);return e}
function calcRSI(c,p=14){if(c.length<p+1)return 50;let g=0,l=0;for(let i=c.length-p;i<c.length;i++){const d=c[i]-c[i-1];if(d>0)g+=d;else l-=d}if(l===0)return 100;return 100-100/(1+g/l)}
function calcMACD(c){const e12=calcEMA(c,12),e26=calcEMA(c,26);if(!e12||!e26)return{macd:0,signal:0,histogram:0};const m=e12-e26;return{macd:m,signal:m*.8,histogram:m*.2}}
function calcBollinger(c,p=20){if(c.length<p)return null;const s=calcSMA(c,p),std=Math.sqrt(c.slice(-p).reduce((a,v)=>a+Math.pow(v-s,2),0)/p);return{upper:s+2*std,middle:s,lower:s-2*std}}
function calcStoch(h,l,c,p=14){if(c.length<p)return{k:50,d:50};const hh=Math.max(...h.slice(-p)),ll=Math.min(...l.slice(-p)),r=hh-ll||1;const k=((c[c.length-1]-ll)/r)*100;return{k,d:k*.9}}
function calcATR(h,l,c,p=14){if(c.length<p+1)return 0;let s=0;for(let i=c.length-p;i<c.length;i++)s+=Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1]));return s/p}

function generateSignals(cd){
  if(!cd||cd.length<15)return{signal:"حيادي",strength:3,signals:[],score:0,buySignals:0,sellSignals:0,neutralSignals:0,rsi:50,macdData:{macd:0},sma7:null,sma20:null};
  const closes=cd.map(d=>d.close),highs=cd.map(d=>d.high),lows=cd.map(d=>d.low),vols=cd.map(d=>d.volume);
  const price=closes[closes.length-1],sma7=calcSMA(closes,7),sma20=calcSMA(closes,Math.min(20,closes.length)),rsi=calcRSI(closes),macdData=calcMACD(closes),boll=calcBollinger(closes),stoch=calcStoch(highs,lows,closes),atr=calcATR(highs,lows,closes);
  let b=0,s=0,n=0;const sigs=[];
  if(sma7&&sma20){if(sma7>sma20){b++;sigs.push({name:"تقاطع المتوسطات",type:"buy",detail:"SMA7 > SMA20 — صاعد"})}else{s++;sigs.push({name:"تقاطع المتوسطات",type:"sell",detail:"SMA7 < SMA20 — هابط"})}}
  if(rsi<30){b+=2;sigs.push({name:"RSI تشبع بيعي",type:"buy",detail:`RSI = ${rsi.toFixed(1)}`})}else if(rsi>70){s+=2;sigs.push({name:"RSI تشبع شرائي",type:"sell",detail:`RSI = ${rsi.toFixed(1)}`})}else if(rsi<45){b++;sigs.push({name:"RSI مائل للشراء",type:"buy",detail:`RSI = ${rsi.toFixed(1)}`})}else if(rsi>55){s++;sigs.push({name:"RSI مائل للبيع",type:"sell",detail:`RSI = ${rsi.toFixed(1)}`})}else{n++;sigs.push({name:"RSI متوازن",type:"neutral",detail:`RSI = ${rsi.toFixed(1)}`})}
  if(macdData.histogram>0){b++;sigs.push({name:"MACD إيجابي",type:"buy",detail:`${macdData.macd.toFixed(3)}`})}else{s++;sigs.push({name:"MACD سلبي",type:"sell",detail:`${macdData.macd.toFixed(3)}`})}
  if(boll){if(price<=boll.lower){b+=2;sigs.push({name:"بولينجر — دعم",type:"buy",detail:"عند الحد السفلي"})}else if(price>=boll.upper){s+=2;sigs.push({name:"بولينجر — مقاومة",type:"sell",detail:"عند الحد العلوي"})}else{n++;sigs.push({name:"بولينجر — طبيعي",type:"neutral",detail:"داخل النطاق"})}}
  if(stoch.k<20){b++;sigs.push({name:"ستوكاستك بيعي",type:"buy",detail:`%K = ${stoch.k.toFixed(1)}`})}else if(stoch.k>80){s++;sigs.push({name:"ستوكاستك شرائي",type:"sell",detail:`%K = ${stoch.k.toFixed(1)}`})}
  const avgV=vols.slice(-14).reduce((a,v)=>a+v,0)/14;if(vols[vols.length-1]>avgV*1.5){const t=closes[closes.length-1]>closes[closes.length-2]?"buy":"sell";if(t==="buy")b++;else s++;sigs.push({name:"حجم تداول مرتفع",type:t,detail:`${(vols[vols.length-1]/1e6).toFixed(1)}M`})}
  if(sma20){if(price>sma20*1.02){b++;sigs.push({name:"فوق المتوسط",type:"buy",detail:"اتجاه صاعد"})}else if(price<sma20*.98){s++;sigs.push({name:"تحت المتوسط",type:"sell",detail:"اتجاه هابط"})}}
  const tot=b+s+n||1,score=((b-s)/tot)*100;
  let signal,strength;
  if(score>40){signal="🟢 شراء قوي";strength=5}else if(score>15){signal="🟢 شراء";strength=4}else if(score>-15){signal="🟡 حيادي";strength=3}else if(score>-40){signal="🔴 بيع";strength=2}else{signal="🔴 بيع قوي";strength=1}
  const support=Math.min(...lows.slice(-20)),resistance=Math.max(...highs.slice(-20));
  return{signal,strength,signals:sigs,score,buySignals:b,sellSignals:s,neutralSignals:n,rsi,macdData,bollinger:boll,stoch,sma7,sma20,atr,support,resistance}
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
  const[analysis,setAnalysis]=useState("");const[loading,setLoading]=useState(false);
  const analyze=useCallback(async()=>{if(!stock?.data)return;setLoading(true);try{const sigs=generateSignals(chartData);const r=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:stock.name,nameEn:stock.nameEn,symbol:stock.symbol,price:stock.data.price,change:stock.data.changePercent,high:stock.data.high,low:stock.data.low,volume:stock.data.volume,sector:stock.sector,rsi:sigs.rsi,macd:sigs.macdData?.macd,signal:sigs.signal,score:sigs.score,support:sigs.support,resistance:sigs.resistance,buySignals:sigs.buySignals,sellSignals:sigs.sellSignals})});const d=await r.json();setAnalysis(d.analysis||"تعذر")}catch{setAnalysis("تعذر الاتصال بخدمة التحليل")}setLoading(false)},[stock,chartData]);
  if(!stock)return null;
  return<div className="aipanel"><div className="aihead"><span>🤖</span><h3>تحليل الذكاء الاصطناعي</h3><button className="aibtn" onClick={analyze} disabled={loading}>{loading?"⏳ جاري التحليل...":"⚡ حلل السهم"}</button></div>{analysis&&<div className="aicontent"><p>{analysis}</p></div>}</div>
}

function Heatmap({stocks}){const ld=stocks.filter(s=>s.data);if(!ld.length)return null;const mx=Math.max(...ld.map(s=>s.data.marketCap||1));return<div className="hmap">{ld.map(s=>{const ch=s.data.changePercent||0,sz=Math.max(55,Math.sqrt((s.data.marketCap||1)/mx)*130),bg=ch>2?"rgba(0,230,118,.45)":ch>0?"rgba(0,230,118,.2)":ch>-2?"rgba(255,23,68,.2)":"rgba(255,23,68,.45)";return<div key={s.symbol} className="hmcell" style={{width:sz,height:sz,background:bg}}><span className="hmn">{s.name}</span><span className="hmc" style={{color:ch>=0?"#00E676":"#FF1744"}}>{ch>=0?"+":""}{ch.toFixed(1)}%</span></div>})}</div>}

export default function Home(){
  const[stocks,setStocks]=useState(SAUDI_STOCKS.map(s=>({...s,data:null})));
  const[sel,setSel]=useState(null);const[sector,setSector]=useState("الكل");const[search,setSearch]=useState("");
  const[view,setView]=useState("cards");const[sigFilter,setSigFilter]=useState("الكل");const[chartData,setChartData]=useState([]);const[loading,setLoading]=useState(true);
  const[lastUp,setLastUp]=useState(null);const[tasi,setTasi]=useState(null);const[alerts,setAlerts]=useState([]);
  const[showAlerts,setShowAlerts]=useState(false);const[sigMap,setSigMap]=useState({});const prevRef=useRef([]);

  const load=useCallback(async()=>{
    setLoading(true);
    const res=await Promise.allSettled(SAUDI_STOCKS.map(async s=>{const d=await fetchStock(s.symbol);return{...s,data:d}}));
    const upd=res.map((r,i)=>r.status==="fulfilled"?r.value:{...SAUDI_STOCKS[i],data:null});
    if(prevRef.current.length>0){const na=[];upd.forEach(s=>{if(!s.data)return;const ch=Math.abs(s.data.changePercent||0);if(ch>3)na.push({type:s.data.changePercent>0?"up":"down",message:`${s.name} ${s.data.changePercent>0?"ارتفع":"انخفض"} ${ch.toFixed(2)}%`,severity:ch>5?"high":"medium",time:new Date().toLocaleTimeString("ar-SA")});if(s.data.volume>15e6)na.push({type:"volume",message:`حجم مرتفع: ${s.name} — ${(s.data.volume/1e6).toFixed(1)}M`,severity:"medium",time:new Date().toLocaleTimeString("ar-SA")})});if(na.length)setAlerts(p=>[...na,...p].slice(0,20))}
    prevRef.current=upd;
    const ld=upd.filter(s=>s.data);if(ld.length){const avg=ld.reduce((s,st)=>s+(st.data.changePercent||0),0)/ld.length;setTasi({value:11268+avg*50,change:avg})}
    setStocks(upd);setLastUp(new Date());setLoading(false)
  },[]);

  useEffect(()=>{load();const iv=setInterval(load,300000);return()=>clearInterval(iv)},[load]);
  useEffect(()=>{if(!sel)return;(async()=>{try{const r=await fetch(`/api/chart?symbol=${sel.symbol}`);if(r.ok){const d=await r.json();setChartData(d.chart||[])}}catch{setChartData([])}})()},[sel]);
  useEffect(()=>{if(stocks.every(s=>!s.data))return;const f=async()=>{const m={};await Promise.allSettled(stocks.map(async s=>{if(!s.data)return;try{const r=await fetch(`/api/chart?symbol=${s.symbol}`);if(r.ok){const d=await r.json();m[s.symbol]=generateSignals(d.chart||[])}}catch{}}));setSigMap(m)};f()},[stocks]);

  const sigData=useMemo(()=>generateSignals(chartData),[chartData]);
  const filtered=stocks.filter(s=>{const sm=sector==="الكل"||s.sector===sector;const qm=!search||s.name.includes(search)||s.nameEn.toLowerCase().includes(search.toLowerCase())||s.symbol.includes(search);const sf=sigFilter==="الكل"||(!sigMap[s.symbol]?sigFilter==="الكل":sigFilter==="شراء"?(sigMap[s.symbol]?.strength>=4):sigFilter==="حيادي"?(sigMap[s.symbol]?.strength===3):sigFilter==="بيع"?(sigMap[s.symbol]?.strength<=2):sigFilter==="صاعد"?(s.data?.changePercent>0):sigFilter==="هابط"?(s.data?.changePercent<0):true);return sm&&qm&&sf});

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

      <div className="tbar"><div className="sbox"><span>🔍</span><input placeholder="ابحث عن سهم..." value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="stabs">{SECTORS.map(s=><button key={s} className={`stb${sector===s?" act":""}`} onClick={()=>setSector(s)}>{s}</button>)}</div><div className="vtog"><button className={view==="cards"?"act":""} onClick={()=>setView("cards")}>📊 بطاقات</button><button className={view==="heatmap"?"act":""} onClick={()=>setView("heatmap")}>🗺️ خريطة</button></div></div>

      <div className="sigbar"><span className="sigbar-label">⚡ فلتر الإشارات:</span><div className="sigbtns">{["الكل","شراء","حيادي","بيع","صاعد","هابط"].map(f=><button key={f} className={`sfb sfb-${f}${sigFilter===f?" sact":""}`} onClick={()=>setSigFilter(f)}>{f==="الكل"?"📋 الكل":f==="شراء"?"🟢 شراء":f==="حيادي"?"🟡 حيادي":f==="بيع"?"🔴 بيع":f==="صاعد"?"📈 صاعد":"📉 هابط"}</button>)}</div><span className="sigbar-count">{filtered.length} سهم</span></div>

      <main className="mn"><div className={`cgrid${sel?" hdet":""}`}>
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
      </div></main>

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

      .ftr{text-align:center;padding:20px 28px;border-top:1px solid rgba(255,255,255,.03);margin-top:30px}.ftr p{font-size:10px;color:rgba(255,255,255,.2)}.ftr strong{color:rgba(0,230,118,.6)}

      @media(max-width:1024px){.cgrid.hdet{grid-template-columns:1fr!important}.dpanel{position:static;max-height:none}}
      @media(max-width:640px){.hinner{flex-direction:column}.tbar{flex-direction:column}.sbox{min-width:100%}.sgrid{grid-template-columns:1fr}.dsts{grid-template-columns:repeat(2,1fr)}.hdr,.tbar,.mn,.ftr{padding-left:14px;padding-right:14px}.apanel{left:8px;right:8px;width:auto}}
    `}</style></>
  )
}
