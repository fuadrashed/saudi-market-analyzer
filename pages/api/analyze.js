export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { name, nameEn, symbol, price, change, high, low, volume, sector, rsi, macd, signal, score, support, resistance, buySignals, sellSignals } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const direction = change >= 0 ? "إيجابي" : "سلبي";
  const strength = Math.abs(change) > 2 ? "قوي" : Math.abs(change) > 1 ? "متوسط" : "ضعيف";

  if (!apiKey) {
    const analysis = `📊 تحليل ${name} (${symbol.replace(".SR", "")})

🎯 الإشارة: ${signal || "غير محدد"}
📈 الأداء: اتجاه ${direction} ${strength} بنسبة ${Math.abs(change || 0).toFixed(2)}%
💰 السعر: ${price?.toFixed(2)} ر.س

📐 المستويات الفنية:
• الدعم: ${support?.toFixed(2) || "-"} ر.س
• المقاومة: ${resistance?.toFixed(2) || "-"} ر.س
• RSI: ${rsi?.toFixed(1) || "-"} ${rsi > 70 ? "(تشبع شرائي ⚠️)" : rsi < 30 ? "(تشبع بيعي — فرصة ↑)" : "(متوازن)"}
• MACD: ${macd?.toFixed(3) || "-"} ${macd >= 0 ? "(إيجابي ✅)" : "(سلبي ❌)"}

📊 ملخص الإشارات: ${buySignals || 0} شراء | ${sellSignals || 0} بيع
${score > 20 ? "✅ الإشارات تميل للشراء — السهم في وضع إيجابي" : score < -20 ? "⚠️ الإشارات تميل للبيع — يُنصح بالحذر" : "🟡 الإشارات متوازنة — يُنصح بالمراقبة"}

💡 التوصية:
${score > 30 ? `السهم يُظهر قوة فنية. لو تبي تدخل، مستوى ${support?.toFixed(2)} يعتبر دعم جيد مع وقف خسارة تحته.` : score < -30 ? `السهم تحت ضغط. يُفضل الانتظار حتى يُظهر إشارات ارتداد من مستوى ${support?.toFixed(2)}.` : `السهم في نطاق حيادي. راقب كسر ${resistance?.toFixed(2)} للأعلى أو ${support?.toFixed(2)} للأسفل.`}

⚠️ تنبيه: هذا تحليل فني آلي وليس نصيحة استثمارية.
لتفعيل التحليل المتقدم بالذكاء الاصطناعي، أضف ANTHROPIC_API_KEY في Vercel.`;

    return res.status(200).json({ analysis });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `أنت محلل فني محترف للسوق السعودي. حلل هذا السهم بدقة:

السهم: ${name} (${nameEn}) — ${symbol}
السعر: ${price} ر.س | التغير: ${change?.toFixed(2)}%
الأعلى: ${high} | الأدنى: ${low} | الحجم: ${volume}
القطاع: ${sector}

المؤشرات الفنية:
- RSI: ${rsi?.toFixed(1)} | MACD: ${macd?.toFixed(3)}
- الدعم: ${support?.toFixed(2)} | المقاومة: ${resistance?.toFixed(2)}
- إشارات الشراء: ${buySignals} | إشارات البيع: ${sellSignals}
- الإشارة العامة: ${signal} (النقاط: ${score?.toFixed(0)})

قدم تحليلاً شاملاً يشمل:
1. تقييم الوضع الفني الحالي
2. مستويات الدعم والمقاومة والأهداف السعرية
3. استراتيجية الدخول والخروج المقترحة
4. إدارة المخاطر ووقف الخسارة
5. توصية واضحة مع التنبيه أنها ليست نصيحة استثمارية

اكتب بالعربية باختصار (250 كلمة كحد أقصى).`
        }]
      })
    });
    const data = await response.json();
    res.status(200).json({ analysis: data.content?.[0]?.text || "تعذر إنشاء التحليل" });
  } catch {
    res.status(500).json({ analysis: "حدث خطأ أثناء التحليل. يرجى المحاولة لاحقاً." });
  }
}
