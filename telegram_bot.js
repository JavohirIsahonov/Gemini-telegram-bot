import TelegramBot from "node-telegram-bot-api"
import dotenv from "dotenv"
import { Generate } from "./functions.js"

// Environment variables yuklaymiz
dotenv.config()

// Tilni avtomatik aniqlash funksiyasi
function detectLanguage(text) {
  const lowerText = text.toLowerCase()

  // Rus tili uchun kirill harflari va rus so'zlari
  const russianPatterns = [
    /[а-яё]/,
    /\b(что|как|где|когда|почему|сколько|университет|образование|стоимость|обучение|факультет|специальность|магистратура|бакалавриат|экзамен|поступление|общежитие|стипендия|грант|диплом|лицензия|аккредитация)\b/,
  ]

  // Ingliz tili uchun ingliz so'zlari
  const englishPatterns = [
    /\b(what|how|where|when|why|university|education|cost|tuition|faculty|major|master|bachelor|exam|admission|dormitory|scholarship|grant|diploma|license|accreditation|program|course|degree|student|study|learn|price|fee)\b/,
  ]

  // Rus tilini tekshirish
  for (const pattern of russianPatterns) {
    if (pattern.test(lowerText)) {
      return "russian"
    }
  }

  // Ingliz tilini tekshirish
  for (const pattern of englishPatterns) {
    if (pattern.test(lowerText)) {
      return "english"
    }
  }

  // Default o'zbek tili
  return "uzbek"
}

// Uzun xabarlarni bo'lib yuborish funksiyasi
async function sendLongMessage(bot, chatId, text, maxLength = 4000) {
  if (text.length <= maxLength) {
    await bot.sendMessage(chatId, text)
    return
  }

  console.log(`Uzun xabar aniqlandi (${text.length} belgi). Bo'laklarga bo'linmoqda...`)

  // Matnni bo'laklarga bo'lish
  const chunks = []
  let currentChunk = ""
  const sentences = text.split(". ")

  for (const sentence of sentences) {
    if ((currentChunk + sentence + ". ").length <= maxLength) {
      currentChunk += sentence + ". "
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = sentence + ". "
      } else {
        // Agar bitta jumla ham juda uzun bo'lsa, uni majburan bo'lish
        const words = sentence.split(" ")
        let wordChunk = ""
        for (const word of words) {
          if ((wordChunk + word + " ").length <= maxLength) {
            wordChunk += word + " "
          } else {
            if (wordChunk) {
              chunks.push(wordChunk.trim())
              wordChunk = word + " "
            }
          }
        }
        if (wordChunk) {
          currentChunk = wordChunk
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }

  console.log(`Xabar ${chunks.length} ta bo'lakga bo'lindi`)

  // Bo'laklarni ketma-ket yuborish
  for (let i = 0; i < chunks.length; i++) {
    await bot.sendMessage(chatId, chunks[i])
    if (i < chunks.length - 1) {
      // Keyingi xabar uchun kichik kutish
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
}

async function main() {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
  const geminiApiToken = process.env.GEMINI_API_TOKEN

  if (!telegramBotToken) {
    console.error("TELEGRAM_BOT_TOKEN is not set. Exiting.")
    return
  }

  if (!geminiApiToken) {
    console.error("GEMINI_API_TOKEN is not set. Exiting.")
    return
  }

  // Telegram botni yaratamiz
  const bot = new TelegramBot(telegramBotToken, { polling: true })

  // Generate instanceni yaratamiz
  let usatGenerator
  try {
    usatGenerator = new Generate(geminiApiToken, "usat.json")
  } catch (error) {
    console.error(`Failed to initialize AI generator: ${error.message}. Exiting.`)
    return
  }

  // /start komandasi uchun handler - faqat o'zbek tilida
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id
    console.log(`Received /start from ${chatId}`)

    try {
      const welcomeMessage = `Assalomu alaykum! 👋

Men USAT (Fan va texnologiyalar universiteti) AI botman. 

🎓 Universitet haqida barcha savollaringizga javob berishga tayyorman:
• Yo'nalishlar va narxlar
• Qabul jarayoni va imtihonlar  
• Grant va stipendiyalar
• Yotoqxona va infratuzilma
• Aloqa ma'lumotlari

Savolingizni istalgan tilda yozing! 📝
(O'zbek, Русский, English)`

      await bot.sendMessage(chatId, welcomeMessage)
    } catch (error) {
      console.error(`Error sending welcome message to ${chatId}: ${error.message}`)
    }
  })

  // Barcha boshqa xabarlar uchun handler
  bot.on("message", async (msg) => {
    // /start komandasi uchun qayta ishlamaslik
    if (msg.text && msg.text.startsWith("/start")) {
      return
    }

    const userInput = msg.text
    const chatId = msg.chat.id

    if (!userInput) {
      return
    }

    // Tilni avtomatik aniqlash
    const detectedLanguage = detectLanguage(userInput)
    console.log(`Received message from ${chatId} (detected: ${detectedLanguage}): ${userInput}`)

    try {
      // "typing..." statusini ko'rsatamiz
      await bot.sendChatAction(chatId, "typing")

      // AI dan javob olamiz (aniqlangan tilda)
      const responseText = await usatGenerator.generateInLanguage(userInput, detectedLanguage)

      // Javobni yuboramiz (uzun bo'lsa bo'lib yuboramiz)
      await sendLongMessage(bot, chatId, responseText)
    } catch (error) {
      console.error(`Error processing message from ${chatId}: ${error.message}`)

      try {
        // Xato xabarini aniqlangan tilda yuborish
        const errorMessages = {
          uzbek: "Kechirasiz, savolingizga javob berishda xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.",
          russian: "Извините, произошла ошибка при ответе на ваш вопрос. Пожалуйста, попробуйте позже.",
          english: "Sorry, there was an error answering your question. Please try again later.",
        }

        await sendLongMessage(bot, chatId, errorMessages[detectedLanguage] || errorMessages.uzbek)
      } catch (sendError) {
        console.error(`Error sending error message to ${chatId}: ${sendError.message}`)
      }
    }
  })

  // Error handling
  bot.on("error", (error) => {
    console.error("Telegram bot error:", error.message)
  })

  bot.on("polling_error", (error) => {
    console.error("Polling error:", error.message)
  })

  console.log("Bot ishga tushdi. So'rovlarni kutmoqda...")
}

// Botni ishga tushiramiz
main().catch((error) => {
  console.error("Failed to start bot:", error.message)
  process.exit(1)
})
