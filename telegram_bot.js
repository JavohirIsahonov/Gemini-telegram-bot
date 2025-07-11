import TelegramBot from "node-telegram-bot-api"
import dotenv from "dotenv"
import { Generate } from "./functions.js"

// Environment variables yuklaymiz
dotenv.config()

// Foydalanuvchilar tilini saqlash uchun
const userLanguages = {}

// Til tanlash tugmalari
const languageKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🇺🇿 O'zbek", callback_data: "lang_uzbek" },
        { text: "🇷🇺 Русский", callback_data: "lang_russian" },
      ],
      [{ text: "🇺🇸 English", callback_data: "lang_english" }],
    ],
  },
}

// Til bo'yicha xabarlar
const messages = {
  uzbek: {
    welcome:
      "Salom! Men USAT (Fan va texnologiyalar universiteti) AI botman. Universitet haqida savollaringizga javob berishga tayyorman.",
    languageSelected: "✅ O'zbek tili tanlandi. Endi savollaringizni bering!",
    chooseLanguage: "Iltimos, tilni tanlang:",
    error:
      "Bu savol uchun ma'lumotlar mavjud emas. USAT universiteti haqida boshqa savollaringiz bo'lsa, bemalol so'rang!",
  },
  russian: {
    welcome: "Привет! Я AI-бот USAT (Университет науки и технологий). Готов ответить на ваши вопросы об университете.",
    languageSelected: "✅ Русский язык выбран. Теперь задавайте ваши вопросы!",
    chooseLanguage: "Пожалуйста, выберите язык:",
    error:
      "Информация по этому вопросу недоступна. Если у вас есть другие вопросы об университете USAT, смело спрашивайте!",
  },
  english: {
    welcome:
      "Hello! I'm USAT (University of Science and Technology) AI bot. Ready to answer your questions about the university.",
    languageSelected: "✅ English language selected. Now ask your questions!",
    chooseLanguage: "Please choose a language:",
    error:
      "Information on this question is not available. If you have other questions about USAT university, feel free to ask!",
  },
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

  // /start komandasi uchun handler
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id
    console.log(`Received /start from ${chatId}`)

    try {
      await bot.sendMessage(chatId, "🌐 Tilni tanlang / Выберите язык / Choose language:", languageKeyboard)
    } catch (error) {
      console.error(`Error sending welcome message to ${chatId}: ${error.message}`)
    }
  })

  // Callback query handler (til tanlash uchun)
  bot.on("callback_query", async (callbackQuery) => {
    const msg = callbackQuery.message
    const chatId = msg.chat.id
    const data = callbackQuery.data

    if (data.startsWith("lang_")) {
      const selectedLang = data.replace("lang_", "")
      userLanguages[chatId] = selectedLang

      console.log(`User ${chatId} selected language: ${selectedLang}`)

      try {
        // Til tanlash xabarini o'chirish
        await bot.deleteMessage(chatId, msg.message_id)

        // Tanlangan tilda xush kelibsiz xabari
        await sendLongMessage(bot, chatId, messages[selectedLang].welcome)
        await sendLongMessage(bot, chatId, messages[selectedLang].languageSelected)

        // Callback query ni javoblash
        await bot.answerCallbackQuery(callbackQuery.id)
      } catch (error) {
        console.error(`Error handling language selection for ${chatId}: ${error.message}`)
      }
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

    // Foydalanuvchi tilini tekshirish
    const userLang = userLanguages[chatId]
    if (!userLang) {
      await bot.sendMessage(
        chatId,
        "🌐 Iltimos, avval tilni tanlang / Пожалуйста, сначала выберите язык / Please choose a language first:",
        languageKeyboard,
      )
      return
    }

    console.log(`Received message from ${chatId} (${userLang}): ${userInput}`)

    try {
      // "typing..." statusini ko'rsatamiz
      await bot.sendChatAction(chatId, "typing")

      // AI dan javob olamiz (tanlangan tilda)
      const responseText = await usatGenerator.generateInLanguage(userInput, userLang)

      // Javobni yuboramiz (uzun bo'lsa bo'lib yuboramiz)
      await sendLongMessage(bot, chatId, responseText)
    } catch (error) {
      console.error(`Error processing message from ${chatId}: ${error.message}`)

      try {
        await sendLongMessage(bot, chatId, messages[userLang].error)
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
