import { GoogleGenerativeAI } from "@google/generative-ai"
import fs from "fs/promises"

/**
 * Google Gemini API bilan o'zaro aloqa qilish uchun mo'ljallangan sinf bo'lib,
 * taqdim etilgan JSON bilimlar bazasiga asoslanib savollarga javob beradigan savdo menejeri vazifasini bajaradi.
 */
export class Generate {
  /**
   * Generate klassini Gemini API tokeni va bilimlar bazasi fayli bilan ishga tushiradi.
   * @param {string} apiToken - Sizning Google Gemini API kalitingiz
   * @param {string} jsonFilePath - Bilimlar bazasini o'z ichiga olgan JSON faylga yo'l
   */
  constructor(apiToken, jsonFilePath) {
    if (!apiToken) {
      console.error("GEMINI_API_TOKEN topilmadi. Iltimos, Google Gemini API tokenini kiriting.")
      throw new Error("Gemini klienti uchun API tokeni talab qilinadi.")
    }

    this.genAI = new GoogleGenerativeAI(apiToken)
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" })
    this.jsonFilePath = jsonFilePath || "usat.json"
    this.data = null

    console.log(`${this.model.model} modeli va ${this.jsonFilePath} bilimlar bazasi bilan Generate ishga tushirildi`)
  }

  /**
   * Belgilangan JSON fayldan ma'lumotni yuklaydi va qaytaradi.
   * @returns {Promise<string>} JSON fayl mazmuni qator ko'rinishida
   */
  async _loadDataFromJson() {
    try {
      const data = await fs.readFile(this.jsonFilePath, "utf-8")
      return data
    } catch (error) {
      if (error.code === "ENOENT") {
        console.error(`JSON bilimlar bazasi mavjud emas: ${this.jsonFilePath}. Please ensure it exists.`)
        throw new Error(`Bilimlar bazasi fayli '${this.jsonFilePath}' mavjud emas.`)
      } else {
        console.error(`JSON faylni o'qishda xatolik yuzaga keldi: '${this.jsonFilePath}': ${error.message}`)
        throw new Error(
          `Bilimlar bazasi faylini o'qishda xatolik yuzaga keldi: '${this.jsonFilePath}'. Fayl formati va o'qish huquqini tekshiring.`,
        )
      }
    }
  }

  /**
   * Konfiguratsiya qilingan Gemini modeli yordamida foydalanuvchi savoliga javob yaratadi.
   * @param {string} question - Foydalanuvchining savoli
   * @returns {Promise<string>} Gemini modelidan yaratilgan javob, yoki muammo yuzaga kelsa, xato xabari
   */
  async generate(question) {
    try {
      // Ma'lumotlarni yuklaymiz (agar hali yuklanmagan bo'lsa)
      if (!this.data) {
        this.data = await this._loadDataFromJson()
      }

      console.log(`Geminiga savol yuborildi: '${question.substring(0, 50)}...'`)

      const systemInstruction = `Tasavvur qiling, siz sotuv menejerisiz.
Quyidagi ma'lumotlardan foydalaning:
${this.data}

Faqat ushbu ma'lumotlarga asoslanib savollarga javob bering. Agar savol berilgan mavzuga aloqador bo'lmasa yoki sizda javob berish uchun yetarli ma'lumot bo'lmasa, buni ochiq ayting va javob bermang. Agar ushbu mavzuda qo'shimcha ma'lumot bera olsangiz, uni faqat tanishish maqsadida taqdim etishingiz mumkin.`

      const result = await this.model.generateContent([{ text: systemInstruction }, { text: question }])

      const response = await result.response
      const text = response.text()

      if (!text || text.trim() === "") {
        console.warn(`Gemini API returned an empty text response for question: '${question}'`)
        return "Kechirasiz, men savolingizga aniq javob topa olmadim. Boshqa savol berib ko'rishingiz mumkin."
      }

      console.log(`Received response from Gemini: '${text.substring(0, 50)}...'`)
      return text
    } catch (error) {
      console.error(`An error occurred during content generation: ${error.message}`)

      if (error.message.includes("API")) {
        return "Kechirasiz, hozirda sun'iy intellekt xizmatida texnik muammo yuzaga keldi. Iltimos, keyinroq urinib ko'ring."
      }

      return "Kechirasiz, so'rovingizni bajarishda kutilmagan xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring."
    }
  }

  /**
   * Tanlangan tilda javob yaratadi
   * @param {string} question - Foydalanuvchining savoli
   * @param {string} language - Tanlangan til (uzbek, russian, english)
   * @returns {Promise<string>} Tanlangan tilda javob
   */
  async generateInLanguage(question, language) {
    try {
      // Ma'lumotlarni yuklaymiz (agar hali yuklanmagan bo'lsa)
      if (!this.data) {
        this.data = await this._loadDataFromJson()
      }

      console.log(`Geminiga savol yuborildi (${language}): '${question.substring(0, 50)}...'`)

      // Tanlangan til bo'yicha system instruction
      const languageInstructions = {
        uzbek: `Siz USAT (Fan va texnologiyalar universiteti) bo'yicha sotuv menejerisiz. 
Faqat o'zbek tilida javob bering. 
Quyidagi ma'lumotlardan foydalaning (faqat "uzbek" bo'limidan):`,
        russian: `Вы менеджер по продажам USAT (Университет науки и технологий). 
Отвечайте только на русском языке. 
Используйте следующую информацию (только из раздела "russian"):`,
        english: `You are a sales manager for USAT (University of Science and Technology). 
Answer only in English. 
Use the following information (only from "english" section):`,
      }

      const parsedData = JSON.parse(this.data)
      const languageData = parsedData[language] || parsedData.uzbek

      const systemInstruction = `${languageInstructions[language]}
${JSON.stringify(languageData, null, 2)}

Faqat ushbu ma'lumotlarga asoslanib savollarga javob bering. Agar savol berilgan mavzuga aloqador bo'lmasa yoki sizda javob berish uchun yetarli ma'lumot bo'lmasa, buni ochiq ayting va javob bermang.`

      const result = await this.model.generateContent([{ text: systemInstruction }, { text: question }])

      const response = await result.response
      const text = response.text()

      if (!text || text.trim() === "") {
        console.warn(`Gemini API returned an empty text response for question: '${question}'`)

        const noAnswerMessages = {
          uzbek: "Kechirasiz, men savolingizga aniq javob topa olmadim. Boshqa savol berib ko'rishingiz mumkin.",
          russian: "Извините, я не смог найти точный ответ на ваш вопрос. Попробуйте задать другой вопрос.",
          english: "Sorry, I couldn't find an exact answer to your question. Please try asking another question.",
        }

        return noAnswerMessages[language] || noAnswerMessages.uzbek
      }

      console.log(`Received response from Gemini (${language}): '${text.substring(0, 50)}...'`)
      return text
    } catch (error) {
      console.error(`An error occurred during content generation: ${error.message}`)

      const errorMessages = {
        uzbek:
          "Kechirasiz, hozirda sun'iy intellekt xizmatida texnik muammo yuzaga keldi. Iltimos, keyinroq urinib ko'ring.",
        russian:
          "Извините, в настоящее время возникла техническая проблема с сервисом ИИ. Пожалуйста, попробуйте позже.",
        english: "Sorry, there is currently a technical issue with the AI service. Please try again later.",
      }

      if (error.message.includes("API")) {
        return errorMessages[language] || errorMessages.uzbek
      }

      const generalErrorMessages = {
        uzbek:
          "Kechirasiz, so'rovingizni bajarishda kutilmagan xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko'ring.",
        russian:
          "Извините, произошла непредвиденная ошибка при обработке вашего запроса. Пожалуйста, попробуйте еще раз позже.",
        english: "Sorry, an unexpected error occurred while processing your request. Please try again later.",
      }

      return generalErrorMessages[language] || generalErrorMessages.uzbek
    }
  }
}

// Test qilish uchun
if (process.argv[1] === new URL(import.meta.url).pathname) {
  import("dotenv").then(({ config }) => {
    config()

    const testGeminiApiToken = process.env.GEMINI_API_TOKEN
    if (!testGeminiApiToken) {
      console.log("Error: GEMINI_API_TOKEN topilmadi. Testni ishga tushirib bo'lmaydi.")
      process.exit(1)
    }

    // Test qilish uchun soxta usat.json fayli yaratish
    const testJsonPath = "usat.json"

    fs.access(testJsonPath)
      .catch(async () => {
        console.log("Test maqsadida 'usat.json' fayli yaratilmoqda...")
        const testData = {
          company_name: "USAT Company",
          services: [
            { name: "Web Development", description: "We create modern and responsive websites." },
            { name: "Mobile App Development", description: "We develop mobile applications for iOS and Android." },
          ],
          contacts: "Website: usat.uz, Tel: +998997778899",
        }
        await fs.writeFile(testJsonPath, JSON.stringify(testData, null, 2))
      })
      .then(async () => {
        try {
          const usatGenerator = new Generate(testGeminiApiToken, testJsonPath)

          console.log("\n--- Test Case 1: Tegishli savol ---")
          const question1 = "Veb sayt yaratish bo'yicha xizmatlar bormi?"
          const response1 = await usatGenerator.generate(question1)
          console.log(`Savol: ${question1}\nJavob: ${response1}`)

          console.log("\n--- Test Case 2: Yana bir tegishli savol ---")
          const question2 = "USAT kompaniyasining aloqa ma'lumotlari qanday?"
          const response2 = await usatGenerator.generate(question2)
          console.log(`Savol: ${question2}\nJavob: ${response2}`)

          console.log("\n--- Test Case 3: Aloqasi yo'q savol ---")
          const question3 = "Eng yaxshi mashina qaysi?"
          const response3 = await usatGenerator.generate(question3)
          console.log(`Savol: ${question3}\nJavob: ${response3}`)
        } catch (error) {
          console.log(`\nIshga tushirish xatosi: ${error.message}`)
        }
      })
  })
}
