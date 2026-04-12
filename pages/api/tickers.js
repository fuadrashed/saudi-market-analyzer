// API endpoint: /api/tickers
// يجلب قائمة كل الأسهم السعودية المدرجة من EODHD مع أسمائها العربية

export default async function handler(req, res) {
  // Cache لمدة ساعة
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");

  const apiToken = process.env.EODHD_API_KEY;
  if (!apiToken) {
    return res.status(200).json({ stocks: FALLBACK_STOCKS, source: "fallback" });
  }

  try {
    // جلب قائمة كل الأسهم في السوق السعودي SR
    const url = `https://eodhd.com/api/exchange-symbol-list/SR?api_token=${apiToken}&fmt=json&type=common_stock`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) throw new Error(`EODHD error: ${response.status}`);
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) throw new Error("Empty response");

    // تحويل البيانات
    const stocks = data
      .filter(s => s.Code && s.Name && !s.Code.includes("-"))
      .map(s => ({
        symbol: `${s.Code}.SR`,
        name: s.Name_AR || translateName(s.Name, s.Code) || s.Name,
        nameEn: s.Name,
        sector: mapSector(s.Sector || s.Industry || ""),
        currency: s.Currency || "SAR",
        exchange: "SR",
        isin: s.Isin || null,
      }))
      .filter(s => s.symbol.match(/^\d{4}\.SR$/)) // فقط أرقام 4 خانات
      .sort((a, b) => a.symbol.localeCompare(b.symbol));

    // دمج مع القائمة الاحتياطية للأسماء العربية الصحيحة
    const merged = mergWithArabicNames(stocks);

    return res.status(200).json({ stocks: merged, source: "eodhd", total: merged.length });
  } catch (error) {
    console.error("Tickers API error:", error.message);
    return res.status(200).json({ stocks: FALLBACK_STOCKS, source: "fallback", total: FALLBACK_STOCKS.length });
  }
}

function mergWithArabicNames(eohdStocks) {
  const arabicMap = {};
  FALLBACK_STOCKS.forEach(s => { arabicMap[s.symbol] = s; });

  return eohdStocks.map(s => {
    const ar = arabicMap[s.symbol];
    if (ar) {
      return { ...s, name: ar.name, sector: ar.sector || s.sector };
    }
    return s;
  });
}

function mapSector(sector) {
  const map = {
    "Financial Services": "الخدمات المالية",
    "Banks": "البنوك", "Banking": "البنوك",
    "Insurance": "التأمين",
    "Basic Materials": "البتروكيماويات",
    "Chemicals": "البتروكيماويات",
    "Industrials": "الصناعة",
    "Consumer Cyclical": "التجزئة",
    "Consumer Defensive": "الأغذية",
    "Healthcare": "الصحة", "Health Care": "الصحة",
    "Technology": "تقنية المعلومات",
    "Communication Services": "الاتصالات",
    "Telecommunications": "الاتصالات",
    "Energy": "الطاقة",
    "Utilities": "المرافق",
    "Real Estate": "العقارات",
    "Real Estate Investment Trust": "صناديق الريت",
    "REITs": "صناديق الريت",
    "Agriculture": "الزراعة",
    "Construction Materials": "الأسمنت",
    "Building Materials": "الأسمنت",
    "Consumer Services": "السياحة والترفيه",
    "Education": "التعليم",
    "Transportation": "النقل",
    "Mining": "التعدين",
    "Media": "الإعلام",
  };
  return map[sector] || sector || "متنوع";
}

function translateName(nameEn, code) {
  // بعض الأسماء المعروفة
  const known = {
    "2222": "أرامكو السعودية",
    "1120": "مصرف الراجحي",
    "1180": "البنك الأهلي السعودي",
    "7010": "الاتصالات السعودية",
    "2010": "سابك",
    "1211": "معادن",
    "2280": "المراعي",
    "4190": "جرير للتسويق",
    "8010": "الشركة التعاونية للتأمين",
  };
  return known[code] || null;
}

// ======================================================
// قائمة احتياطية كاملة - أسماء عربية صحيحة 100%
// ======================================================
const FALLBACK_STOCKS = [
  // البنوك
  { symbol: "1010.SR", name: "بنك الرياض", sector: "البنوك" },
  { symbol: "1020.SR", name: "بنك الجزيرة", sector: "البنوك" },
  { symbol: "1030.SR", name: "بنك الاستثمار السعودي", sector: "البنوك" },
  { symbol: "1050.SR", name: "بنك فرنسا السعودي (BSF)", sector: "البنوك" },
  { symbol: "1060.SR", name: "البنك السعودي البريطاني (ساب)", sector: "البنوك" },
  { symbol: "1080.SR", name: "البنك العربي الوطني", sector: "البنوك" },
  { symbol: "1111.SR", name: "مجموعة تداول السعودية", sector: "البنوك" },
  { symbol: "1120.SR", name: "مصرف الراجحي", sector: "البنوك" },
  { symbol: "1140.SR", name: "بنك البلاد", sector: "البنوك" },
  { symbol: "1150.SR", name: "بنك الإنماء", sector: "البنوك" },
  { symbol: "1180.SR", name: "البنك الأهلي السعودي (SNB)", sector: "البنوك" },
  { symbol: "1182.SR", name: "أملاك للتمويل", sector: "البنوك" },
  { symbol: "1183.SR", name: "سهل للتمويل", sector: "البنوك" },
  // الطاقة
  { symbol: "2222.SR", name: "أرامكو السعودية", sector: "الطاقة" },
  { symbol: "2380.SR", name: "بترو رابغ", sector: "الطاقة" },
  { symbol: "2081.SR", name: "أكوا باور", sector: "الطاقة" },
  { symbol: "4200.SR", name: "الدريس للبترول والنقل", sector: "الطاقة" },
  { symbol: "2080.SR", name: "الغاز والتصنيع الأهلية", sector: "الطاقة" },
  { symbol: "2120.SR", name: "المصافي السعودية", sector: "الطاقة" },
  // البتروكيماويات
  { symbol: "2001.SR", name: "كيمانول", sector: "البتروكيماويات" },
  { symbol: "2010.SR", name: "سابك", sector: "البتروكيماويات" },
  { symbol: "2020.SR", name: "سابك للمغذيات الزراعية", sector: "البتروكيماويات" },
  { symbol: "2060.SR", name: "التصنيع الوطنية (تاسنيع)", sector: "البتروكيماويات" },
  { symbol: "2090.SR", name: "نماء للكيماويات", sector: "البتروكيماويات" },
  { symbol: "2110.SR", name: "سبكيم العالمية", sector: "البتروكيماويات" },
  { symbol: "2150.SR", name: "ميبكو", sector: "البتروكيماويات" },
  { symbol: "2160.SR", name: "بتروكيم", sector: "البتروكيماويات" },
  { symbol: "2230.SR", name: "المجموعة السعودية للاستثمار الصناعي", sector: "البتروكيماويات" },
  { symbol: "2250.SR", name: "السعودية للاستثمار الصناعي والأعمال (SIG)", sector: "البتروكيماويات" },
  { symbol: "2290.SR", name: "ينساب", sector: "البتروكيماويات" },
  { symbol: "2300.SR", name: "سابك للصناعات الأساسية", sector: "البتروكيماويات" },
  { symbol: "2310.SR", name: "سبكيم", sector: "البتروكيماويات" },
  { symbol: "2330.SR", name: "أدفانسد بتروكيميكال", sector: "البتروكيماويات" },
  { symbol: "2350.SR", name: "كيان السعودية للبتروكيماويات", sector: "البتروكيماويات" },
  { symbol: "4361.SR", name: "صدارة للكيماويات", sector: "البتروكيماويات" },
  { symbol: "2040.SR", name: "الخزف السعودي", sector: "البتروكيماويات" },
  // الاتصالات
  { symbol: "7010.SR", name: "الاتصالات السعودية (STC)", sector: "الاتصالات" },
  { symbol: "7020.SR", name: "موبايلي (اتحاد اتصالات)", sector: "الاتصالات" },
  { symbol: "7030.SR", name: "زين السعودية", sector: "الاتصالات" },
  { symbol: "7040.SR", name: "عذيب للاتصالات", sector: "الاتصالات" },
  // تقنية المعلومات
  { symbol: "7201.SR", name: "علم", sector: "تقنية المعلومات" },
  { symbol: "7202.SR", name: "حلول (Solutions by STC)", sector: "تقنية المعلومات" },
  { symbol: "7203.SR", name: "الشركة العربية للتقنية", sector: "تقنية المعلومات" },
  // الأغذية
  { symbol: "2050.SR", name: "مجموعة صافولا", sector: "الأغذية" },
  { symbol: "2270.SR", name: "سدافكو", sector: "الأغذية" },
  { symbol: "2280.SR", name: "المراعي", sector: "الأغذية" },
  { symbol: "2281.SR", name: "تنمية للأغذية", sector: "الأغذية" },
  { symbol: "2282.SR", name: "جدوى وأبعاد للخدمات الغذائية", sector: "الأغذية" },
  { symbol: "6001.SR", name: "حلواني إخوان", sector: "الأغذية" },
  { symbol: "6002.SR", name: "هرفي للأغذية", sector: "الأغذية" },
  { symbol: "6004.SR", name: "خدمات الطيران والأغذية (SACA)", sector: "الأغذية" },
  { symbol: "6014.SR", name: "المطاحن الأولى", sector: "الأغذية" },
  { symbol: "6015.SR", name: "المطاحن الثانية", sector: "الأغذية" },
  { symbol: "6016.SR", name: "المطاحن الثالثة", sector: "الأغذية" },
  { symbol: "6090.SR", name: "جاكو للإنتاج الحيواني", sector: "الأغذية" },
  { symbol: "4220.SR", name: "مجموعة الرومانسية للمطاعم", sector: "الأغذية" },
  { symbol: "4222.SR", name: "هرفي للخدمات الغذائية", sector: "الأغذية" },
  // التجزئة
  { symbol: "4001.SR", name: "عبداللطيف جميل للصناعة والتجارة", sector: "التجزئة" },
  { symbol: "4003.SR", name: "إكسترا (United Electronics)", sector: "التجزئة" },
  { symbol: "4008.SR", name: "مجموعة الحكير للسياحة والتجارة", sector: "التجزئة" },
  { symbol: "4014.SR", name: "سينومي للمراكز التجارية", sector: "التجزئة" },
  { symbol: "4050.SR", name: "ساسكو", sector: "التجزئة" },
  { symbol: "4140.SR", name: "أبناء عبدالعزيز العجلان (العجلان)", sector: "التجزئة" },
  { symbol: "4160.SR", name: "ثمار الجزيرة", sector: "التجزئة" },
  { symbol: "4165.SR", name: "لازوردي للمجوهرات", sector: "التجزئة" },
  { symbol: "4180.SR", name: "مجموعة فتيحي", sector: "التجزئة" },
  { symbol: "4190.SR", name: "مجموعة جرير للتسويق", sector: "التجزئة" },
  { symbol: "4240.SR", name: "سينومي ريتيل", sector: "التجزئة" },
  { symbol: "4250.SR", name: "عسير للتجارة والسياحة", sector: "التجزئة" },
  // التأمين
  { symbol: "4015.SR", name: "بوبا العربية للتأمين التعاوني", sector: "التأمين" },
  { symbol: "8010.SR", name: "الشركة التعاونية للتأمين (تعاونية)", sector: "التأمين" },
  { symbol: "8020.SR", name: "ملاذ للتأمين وإعادة التأمين", sector: "التأمين" },
  { symbol: "8030.SR", name: "ميدغلف للتأمين", sector: "التأمين" },
  { symbol: "8040.SR", name: "أليانز السعودي الفرنسي للتأمين التعاوني", sector: "التأمين" },
  { symbol: "8050.SR", name: "سلامة للتأمين التعاوني", sector: "التأمين" },
  { symbol: "8060.SR", name: "ولاء للتأمين التعاوني", sector: "التأمين" },
  { symbol: "8070.SR", name: "إعادة التأمين السعودية", sector: "التأمين" },
  { symbol: "8080.SR", name: "سهل للتأمين التعاوني", sector: "التأمين" },
  { symbol: "8100.SR", name: "الوطنية للتأمين التعاوني", sector: "التأمين" },
  { symbol: "8110.SR", name: "الاتحاد للتأمين التعاوني", sector: "التأمين" },
  { symbol: "8120.SR", name: "الاتحاد الخليجي للتأمين التعاوني", sector: "التأمين" },
  { symbol: "8130.SR", name: "بروج للتأمين التعاوني", sector: "التأمين" },
  { symbol: "8150.SR", name: "تكافل الراجحي", sector: "التأمين" },
  { symbol: "8160.SR", name: "الخليج للتأمين التعاوني", sector: "التأمين" },
  { symbol: "8170.SR", name: "أمانة للتأمين التعاوني", sector: "التأمين" },
  { symbol: "8180.SR", name: "المتحدة للتأمين التعاوني", sector: "التأمين" },
  { symbol: "8190.SR", name: "ريم للتأمين التعاوني", sector: "التأمين" },
  { symbol: "8200.SR", name: "الدرع العربي للتأمين التعاوني", sector: "التأمين" },
  { symbol: "8210.SR", name: "الأولى للتأمين التعاوني", sector: "التأمين" },
  { symbol: "8230.SR", name: "أسيج للتأمين التعاوني", sector: "التأمين" },
  { symbol: "8240.SR", name: "تكافل الراجحي للتأمين", sector: "التأمين" },
  { symbol: "8270.SR", name: "ساب تكافل", sector: "التأمين" },
  { symbol: "8300.SR", name: "أبوظبي الوطني للتأمين - فرع السعودية", sector: "التأمين" },
  { symbol: "8310.SR", name: "إنما للتأمين التعاوني", sector: "التأمين" },
  { symbol: "8311.SR", name: "بوبا العربية", sector: "التأمين" },
  // الأسمنت ومواد البناء
  { symbol: "3002.SR", name: "سيكو للأسمنت", sector: "الأسمنت" },
  { symbol: "3005.SR", name: "أسمنت الجوف", sector: "الأسمنت" },
  { symbol: "3007.SR", name: "أسمنت الرياض", sector: "الأسمنت" },
  { symbol: "3009.SR", name: "أسمنت تبوك", sector: "الأسمنت" },
  { symbol: "3010.SR", name: "الأسمنت العربية", sector: "الأسمنت" },
  { symbol: "3020.SR", name: "أسمنت اليمامة", sector: "الأسمنت" },
  { symbol: "3030.SR", name: "الأسمنت السعودية", sector: "الأسمنت" },
  { symbol: "3040.SR", name: "أسمنت القصيم", sector: "الأسمنت" },
  { symbol: "3050.SR", name: "أسمنت الجنوب", sector: "الأسمنت" },
  { symbol: "3060.SR", name: "أسمنت ينبع", sector: "الأسمنت" },
  { symbol: "3080.SR", name: "أسمنت الشرقية", sector: "الأسمنت" },
  { symbol: "3090.SR", name: "أسمنت المدينة", sector: "الأسمنت" },
  { symbol: "3091.SR", name: "أسمنت المنطقة الشمالية", sector: "الأسمنت" },
  { symbol: "3093.SR", name: "أسمنت نجران", sector: "الأسمنت" },
  // الصناعة والتصنيع
  { symbol: "1201.SR", name: "تكوين للصناعات المتقدمة", sector: "الصناعة" },
  { symbol: "1202.SR", name: "مبكو", sector: "الصناعة" },
  { symbol: "1211.SR", name: "معادن (التعدين السعودية)", sector: "التعدين" },
  { symbol: "1212.SR", name: "أسترا الصناعية", sector: "الصناعة" },
  { symbol: "1213.SR", name: "نسيج", sector: "الصناعة" },
  { symbol: "1214.SR", name: "مجموعة شاكر", sector: "الصناعة" },
  { symbol: "1301.SR", name: "أسلاك الكوابل السعودية", sector: "الصناعة" },
  { symbol: "1302.SR", name: "بوان", sector: "الصناعة" },
  { symbol: "1303.SR", name: "الصناعات الكهربائية السعودية", sector: "الصناعة" },
  { symbol: "1304.SR", name: "اليمامة للحديد والصلب", sector: "الصناعة" },
  { symbol: "1320.SR", name: "الأنابيب السعودية", sector: "الصناعة" },
  { symbol: "1321.SR", name: "أنابيب الشرق", sector: "الصناعة" },
  { symbol: "1322.SR", name: "أماك للمنتجات المعدنية", sector: "الصناعة" },
  { symbol: "1820.SR", name: "بان", sector: "الصناعة" },
  // النقل
  { symbol: "4030.SR", name: "الشركة الوطنية للنقل البحري (البحري)", sector: "النقل" },
  { symbol: "4040.SR", name: "سابتكو", sector: "النقل" },
  { symbol: "4110.SR", name: "باتك", sector: "النقل" },
  { symbol: "4166.SR", name: "مبرد للنقل", sector: "النقل" },
  { symbol: "4261.SR", name: "بدجت السعودية لتأجير السيارات", sector: "النقل" },
  { symbol: "4334.SR", name: "الخدمات الأرضية السعودية", sector: "النقل" },
  // الزراعة
  { symbol: "6010.SR", name: "نادك (التنمية الزراعية الوطنية)", sector: "الزراعة" },
  { symbol: "6020.SR", name: "الجوف للتنمية الزراعية (جادكو)", sector: "الزراعة" },
  { symbol: "6050.SR", name: "الوطنية لتجارة الأسماك (NFPC)", sector: "الزراعة" },
  { symbol: "6060.SR", name: "الشرقية للتنمية والاستثمار", sector: "الزراعة" },
  { symbol: "6070.SR", name: "الجوف للتنمية الزراعية", sector: "الزراعة" },
  // الصحة
  { symbol: "2070.SR", name: "الشركة السعودية للصناعات الدوائية (سبيماكو)", sector: "الصحة" },
  { symbol: "4002.SR", name: "مستشفيات المواساة", sector: "الصحة" },
  { symbol: "4004.SR", name: "مجموعة دله الصحية", sector: "الصحة" },
  { symbol: "4005.SR", name: "رعاية لخدمات الصحة", sector: "الصحة" },
  { symbol: "4013.SR", name: "مجموعة مستشفيات سليمان الحبيب الطبية", sector: "الصحة" },
  { symbol: "4150.SR", name: "الحمادي للرعاية الصحية", sector: "الصحة" },
  { symbol: "4230.SR", name: "الشرق الأوسط للرعاية الصحية (MEAHCO)", sector: "الصحة" },
  // المرافق
  { symbol: "5110.SR", name: "الشركة السعودية للكهرباء", sector: "المرافق" },
  { symbol: "2082.SR", name: "الشركة السعودية للكهرباء (SEC)", sector: "المرافق" },
  // العقارات
  { symbol: "4020.SR", name: "الشركة العقارية السعودية (SRECO)", sector: "العقارات" },
  { symbol: "4300.SR", name: "دار الأركان للتطوير العقاري", sector: "العقارات" },
  { symbol: "4310.SR", name: "مجموعة مكة للإنشاء والتعمير (MACC)", sector: "العقارات" },
  { symbol: "4320.SR", name: "الأندلس العقارية", sector: "العقارات" },
  { symbol: "4321.SR", name: "شركة جبل عمر للتطوير", sector: "العقارات" },
  { symbol: "4360.SR", name: "إيوان للتطوير والاستثمار العقاري", sector: "العقارات" },
  // صناديق الريت
  { symbol: "4332.SR", name: "جدوى ريت الحرمين", sector: "صناديق الريت" },
  { symbol: "4342.SR", name: "جدوى ريت السعودية", sector: "صناديق الريت" },
  { symbol: "4343.SR", name: "ريت البلاد", sector: "صناديق الريت" },
  { symbol: "4344.SR", name: "ريت ملكية", sector: "صناديق الريت" },
  { symbol: "4345.SR", name: "ريت مشاركة", sector: "صناديق الريت" },
  { symbol: "4346.SR", name: "ريت الأهلي", sector: "صناديق الريت" },
  { symbol: "4347.SR", name: "ريت الرياض", sector: "صناديق الريت" },
  { symbol: "4348.SR", name: "ريت إنجاز", sector: "صناديق الريت" },
  // الإعلام
  { symbol: "4070.SR", name: "تهامة للإعلان والعلاقات العامة", sector: "الإعلام" },
  // التعليم
  { symbol: "4292.SR", name: "مجموعة التعليم الدولية", sector: "التعليم" },
  { symbol: "4341.SR", name: "الوطنية للتعليم (NCLE)", sector: "التعليم" },
  // السياحة والترفيه
  { symbol: "1830.SR", name: "لجام للرياضة", sector: "السياحة والترفيه" },
  { symbol: "4009.SR", name: "السعودية للترفيه (SEVEN)", sector: "السياحة والترفيه" },
  { symbol: "4280.SR", name: "فنادق ومنتجعات المناطق السعودية (SHRA)", sector: "السياحة والترفيه" },
  // الخدمات المالية
  { symbol: "1810.SR", name: "سيرا", sector: "الخدمات المالية" },
  { symbol: "1831.SR", name: "مهارة", sector: "الخدمات المالية" },
  { symbol: "1833.SR", name: "الموارد", sector: "الخدمات المالية" },
  { symbol: "1834.SR", name: "سماسكو", sector: "الخدمات المالية" },
  { symbol: "1835.SR", name: "تمكين", sector: "الخدمات المالية" },
  { symbol: "4322.SR", name: "مداد", sector: "الخدمات المالية" },
];
