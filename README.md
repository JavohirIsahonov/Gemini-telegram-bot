# NamDU AI Telegram Bot (Node.js)

Namangan Davlat Universiteti haqida ma'lumot beruvchi AI Telegram bot. Google Gemini API va JSON bilimlar bazasidan foydalanadi.

## O'rnatish

1. Loyihani klonlang yoki yuklab oling
2. Dependencylarni o'rnating:
\`\`\`bash
npm install
\`\`\`

3. `.env` faylini yarating va API tokenlarini kiriting:
\`\`\`
GEMINI_API_TOKEN=your_gemini_api_token_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
\`\`\`

4. Botni ishga tushiring:
\`\`\`bash
npm start
\`\`\`

Yoki development rejimida (auto-restart bilan):
\`\`\`bash
npm run dev
\`\`\`

## Fayllar tuzilishi

- `telegram_bot.js` - Asosiy bot fayli
- `functions.js` - Gemini API bilan ishlash uchun Generate klassi
- `namdu.json` - NamDU haqida bilimlar bazasi
- `main.json` - Synergy Hub Academy haqida ma'lumotlar
- `package.json` - Loyiha konfiguratsiyasi va dependencylar

## Xususiyatlar

- Google Gemini 2.0 Flash Lite modeli
- JSON bilimlar bazasiga asoslangan javoblar
- Xato holatlarini boshqarish
- Logging tizimi
- Async/await yondashuvi

## Komandalar

- `/start` - Botni ishga tushirish va salomlashish xabari
- Har qanday matn xabari - AI dan javob olish

## Texnik talablar

- Node.js 18+ 
- npm yoki yarn
- Internet aloqasi (Gemini API va Telegram uchun)
