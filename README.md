# 📊 محلل السوق السعودي | Saudi Market Analyzer

تطبيق احترافي لتحليل أسهم السوق السعودي (تداول) مع بيانات حية ومؤشرات فنية وتحليل بالذكاء الاصطناعي.

## ✨ المميزات

- 🔴 **بيانات حية** لأكثر من 20 سهم من السوق السعودي
- 📈 **رسوم بيانية** شموع يابانية تفاعلية
- 📊 **مؤشرات فنية** (RSI, MACD, SMA, EMA, ATR)
- 🤖 **تحليل بالذكاء الاصطناعي** عبر Claude API
- 🗺️ **خريطة حرارية** للسوق
- 🔍 **بحث وتصفية** حسب القطاع
- 📱 **متجاوب بالكامل** - يعمل على الجوال والكمبيوتر

## 🚀 النشر على Vercel

### الطريقة 1: من GitHub (الأسرع)

1. **ارفع المشروع على GitHub:**
   ```bash
   cd saudi-market-analyzer
   git init
   git add .
   git commit -m "Saudi Market Analyzer"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/saudi-market-analyzer.git
   git push -u origin main
   ```

2. **انشر على Vercel:**
   - افتح [vercel.com/new](https://vercel.com/new)
   - اختر المستودع `saudi-market-analyzer`
   - اضغط **Deploy**

3. **(اختياري) أضف مفتاح Claude API:**
   - في Vercel Dashboard → Settings → Environment Variables
   - أضف: `ANTHROPIC_API_KEY` = مفتاحك من anthropic.com

### الطريقة 2: Vercel CLI

```bash
npm i -g vercel
cd saudi-market-analyzer
vercel
```

## 🛠️ التشغيل المحلي

```bash
npm install
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000)

## 📝 ملاحظات

- البيانات من Yahoo Finance API (مجانية)
- التطبيق يعمل بدون مفتاح API (بتحليل أساسي)
- إضافة `ANTHROPIC_API_KEY` تفعل التحليل المتقدم بالذكاء الاصطناعي
- **ليس نصيحة استثمارية** - للأغراض التعليمية فقط

## 📄 التقنيات

- Next.js 14
- React 18
- Yahoo Finance API
- Claude API (Anthropic)
