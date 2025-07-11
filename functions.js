import { GoogleGenerativeAI } from "@google/generative-ai"
import fs from "fs/promises"


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
   * Qisqa so'zlar va noto'liq savollar uchun mos javob topish
   * @param {string} question - Foydalanuvchining savoli
   * @param {string} language - Tanlangan til
   * @returns {string|null} - Mos javob yoki null
   */
  findQuickAnswer(question, language) {
    const lowerQuestion = question.toLowerCase().trim()

    // Yo'nalishlar uchun qisqa javoblar
    const directionKeywords = {
      uzbek: {
        // Bank ishi
        bank: "bankIshi",
        "bank ishi": "bankIshi",
        banking: "bankIshi",
        bankir: "bankIshi",

        // Dasturlash
        dasturlash: "dasturiyInjiniring",
        dasturiy: "dasturiyInjiniring",
        programming: "dasturiyInjiniring",
        "dasturiy injiniring": "dasturiyInjiniring",
        kod: "dasturiyInjiniring",

        // Kompyuter
        kompyuter: "kompyuterInjiniringi",
        "kompyuter injiniringi": "kompyuterInjiniringi",
        it: "kompyuterInjiniringi",
        "axborot texnologiyalari": "kompyuterInjiniringi",

        // Moliya
        moliya: "moliyaTexnologiyalar",
        "moliya va moliyaviy texnologiyalar": "moliyaTexnologiyalar",
        finance: "moliyaTexnologiyalar",
        moliyaviy: "moliyaTexnologiyalar",

        // Iqtisodiyot
        iqtisod: "iqtisodiyot",
        iqtisodiyot: "iqtisodiyot",
        ekonomika: "iqtisodiyot",

        // Buxgalteriya
        buxgalter: "buxgalteriyaHisobi",
        "buxgalteriya hisobi": "buxgalteriyaHisobi",
        hisobchi: "buxgalteriyaHisobi",

        // Turizm
        turizm: "turizm",
        "turizm va mehmondo'stlik": "turizm",
        sayohat: "turizm",

        // Tillar
        til: "xorijiyTil",
        "xorijiy til": "xorijiyTil",
        ingliz: "xorijiyTil",
        "ingliz tili": "xorijiyTil",

        // Tarix
        tarix: "tarix",

        // Matematika
        matematika: "matematika",
        math: "matematika",

        // Psixologiya
        psixolog: "psixologiya",
        psixologiya: "psixologiya",

        // Arxitektura
        arxitektura: "arxitektura",

        // Ta'lim
        maktab: "boshlangichTalim",
        "boshlang'ich ta'lim": "boshlangichTalim",
        bolalar: "maktabgachaTalim",
        "maktabgacha ta'lim": "maktabgachaTalim",

        // Logistika
        logistika: "logistika",

        // Maxsus pedagogika
        "maxsus pedagogika": "maxsusPedagogika",

        // O'zbek tili
        "o'zbek tili": "ozbekTili",
        "ona tili": "ozbekTili",

        // Ijtimoiy ish
        "ijtimoiy ish": "ijtimoiyIsh",
      },
    }

    // Umumiy savollar uchun - YANGILANGAN VA KENGAYTIRILGAN
    const generalKeywords = {
      uzbek: {
        // Narx va to'lov
        narx: "kontraktNarxlari",
        narxlar: "kontraktNarxlari",
        "kontrakt narxi": "kontraktNarxlari",
        "kontrakt narxlari": "kontraktNarxlari",
        "o'qish narxi": "kontraktNarxlari",
        "to'lov": "moliyaviyShartlar",
        pul: "moliyaviyShartlar",
        "bo'lib to'lash": "moliyaviyShartlar",
        "online to'lash": "moliyaviyShartlar",
        "plastik karta": "moliyaviyShartlar",
        "to'lov usullari": "moliyaviyShartlar",
        
        // Grant va stipendiya
        grant: "grantVaStipendiyalar",
        "grant o'rinlari": "grantVaStipendiyalar",
        stipendiya: "grantVaStipendiyalar",
        "rektor stipendiyasi": "grantVaStipendiyalar",
        "prezident stipendiyasi": "grantVaStipendiyalar",
        "davlat granti": "grantVaStipendiyalar",
        "nomli stipendiya": "grantVaStipendiyalar",
        
        // Qabul jarayoni
        qabul: "qabulJarayoni",
        "qabul muddati": "qabulJarayoni",
        "qabul kvotasi": "qabulJarayoni",
        imtihon: "qabulJarayoni",
        test: "qabulJarayoni",
        "test fanlar": "qabulJarayoni",
        "minimal ball": "qabulJarayoni",
        "kirish ballari": "qabulJarayoni",
        "kirish imtihoni": "qabulJarayoni",
        "test shakli": "qabulJarayoni",
        "test takrorlash": "qabulJarayoni",
        "natijalar": "qabulJarayoni",
        hujjat: "qabulJarayoni",
        hujjatlar: "qabulJarayoni",
        "onlayn hujjat": "qabulJarayoni",
        "hujjat topshirish": "qabulJarayoni",
        "bepul hujjat": "qabulJarayoni",
        "shaxsiy kabinet": "qabulJarayoni",
        
        // Joylashuv
        manzil: "joylashuvManzili",
        joy: "joylashuvManzili",
        "qayerda joylashgan": "joylashuvManzili",
        "universitet manzili": "joylashuvManzili",
        
        // Yotoqxona
        yotoqxona: "infratuzilmaVaQulayliklar",
        ijara: "infratuzilmaVaQulayliklar",
        "talabalar yotoqxonasi": "infratuzilmaVaQulayliklar",
        "yotoqxona bepul": "infratuzilmaVaQulayliklar",
        "yashash sharoiti": "infratuzilmaVaQulayliklar",
        
        // Aloqa
        telefon: "boglanishUchun",
        aloqa: "boglanishUchun",
        "telefon raqam": "boglanishUchun",
        sayt: "boglanishUchun",
        "web-sayt": "boglanishUchun",
        vebsayt: "boglanishUchun",
        telegram: "boglanishUchun",
        instagram: "boglanishUchun",
        
        // Ta'lim shakli va muddati
        "ta'lim shakli": "oquvJarayoni",
        kunduzgi: "oquvJarayoni",
        kechki: "oquvJarayoni",
        sirtqi: "oquvJarayoni",
        masofaviy: "oquvJarayoni",
        "o'qish tili": "oquvJarayoni",
        "o'qish muddati": "oquvJarayoni",
        "4 yil": "oquvJarayoni",
        "5 yil": "oquvJarayoni",
        "dars vaqti": "oquvJarayoni",
        "darslar boshlanadi": "oquvJarayoni",
        "oflayn dars": "oquvJarayoni",
        "onlayn dars": "oquvJarayoni",
        
        // Magistratura
        magistratura: "oquvJarayoni",
        "magistratura bormi": "oquvJarayoni",
        
        // Diplom
        diplom: "oquvJarayoni",
        "diplom tan olinadimi": "oquvJarayoni",
        "xorijda tan olinadimi": "oquvJarayoni",
        "davlat diplomi": "oquvJarayoni",
        "xalqaro sertifikat": "oquvJarayoni",
        
        // IELTS va til sertifikatlari
        ielts: "chetTiliSertifikatiImtiyozlari",
        "ielts kerakmi": "chetTiliSertifikatiImtiyozlari",
        sertifikat: "chetTiliSertifikatiImtiyozlari",
        "chet tili": "chetTiliSertifikatiImtiyozlari",
        "til sertifikati": "chetTiliSertifikatiImtiyozlari",
        
        // Ish bilan ta'minlash
        ish: "oquvJarayoni",
        "ish topish": "oquvJarayoni",
        "ish bilan ta'minlash": "oquvJarayoni",
        "bitiruvchilarga yordam": "oquvJarayoni",
        "yarim stavka": "qoshimchaMalumotlar",
        "karyera markazi": "oquvJarayoni",
        
        // Sport va faoliyat
        sport: "infratuzilmaVaQulayliklar",
        "sport to'garaklari": "fanKlublar",
        "sport musobaqalari": "qoshimchaMalumotlar",
        "fan klublar": "fanKlublar",
        faoliyat: "fanKlublar",
        tadbirlar: "tadbirlar",
        festival: "tadbirlar",
        
        // Fakultet va yo'nalishlar
      fakultet: "oquvJarayoni",
      "nechta fakultet": "oquvJarayoni",
      "yo'nalish": "oquvJarayoni",
      "yo'nalishlar soni": "oquvJarayoni",
      "nechta yo'nalish": "oquvJarayoni",

    // Darslar
    dars: "oquvJarayoni",
        darslar: "oquvJarayoni",
        "dars vaqti": "oquvJarayoni",
        "necha soat": "oquvJarayoni",
        "necha daqiqa": "oquvJarayoni",
        "sessiya": "oquvJarayoni",
        "imtihonlar": "oquvJarayoni",
        
        // Rektor va boshqaruv
        rektor: "universitetHaqida",
        "rektor kim": "universitetHaqida",
        
        // Imtiyozlar va chegirmalar
        imtiyoz: "moliyaviyShartlar",
        imtiyozlar: "moliyaviyShartlar",
        chegirma: "moliyaviyShartlar",
        "ijtimoiy imtiyozlar": "moliyaviyShartlar",
        "nogironlik imtiyozi": "moliyaviyShartlar",
        
        // Amaliyot
        amaliyot: "oquvJarayoni",
        "amaliyot dasturlari": "oquvJarayoni",
        "amaliyot bazalari": "qoshimchaMalumotlar",
        
        // Xalqaro hamkorlik
        xalqaro: "universitetHaqida",
        "xalqaro almashinuv": "universitetHaqida",
        "chet el": "universitetHaqida",
        "chet ellik": "qoshimchaMalumotlar",
        "xorijlik": "universitetHaqida",
        
        // Ko'chirish va perevod
        "ko'chirish": "perevod",
        perevod: "perevod",
        "o'qishni ko'chirish": "perevod",
        "kredit tan olish": "perevod",
        
        // Infratuzilma
        kutubxona: "infratuzilmaVaQulayliklar",
        laboratoriya: "infratuzilmaVaQulayliklar",
        "axborot markazi": "infratuzilmaVaQulayliklar",
        "ovqatlanish joylari": "infratuzilmaVaQulayliklar",
        internet: "infratuzilmaVaQulayliklar",
        wifi: "infratuzilmaVaQulayliklar",
        
        // Litsenziya va akkreditatsiya
        litsenziya: "universitetHaqida",
        akkreditatsiya: "universitetHaqida",
        "davlat litsenziyasi": "universitetHaqida",
        
        // Yangi qo'shilgan kalit so'zlar
        "yozgi maktab": "qoshimchaMalumotlar",
        "harbiy kafedra": "qoshimchaMalumotlar",
        "harbiy tayyorgarlik": "qoshimchaMalumotlar",
        "iqtidorli talabalar": "qoshimchaMalumotlar",
        "ilmiy jurnal": "qoshimchaMalumotlar",
        "ichki stipendiya": "grantVaStipendiyalar",
        "rag'batlantiruvchi grant": "grantVaStipendiyalar",
        "to'lov muddati": "moliyaviyShartlar",
        "shartnoma imzolash": "moliyaviyShartlar",
        "buxgalteriya bo'limi": "infratuzilmaVaQulayliklar",
        "dasturiy tillar": "bakalavriYonalishlari"
      }
    }

    // Yo'nalish nomlarini tekshirish
    if (directionKeywords[language]) {
      for (const [key, value] of Object.entries(directionKeywords[language])) {
        if (lowerQuestion.includes(key)) {
          return value
        }
      }
    }

    // Umumiy savollarni tekshirish
    if (generalKeywords[language]) {
      for (const [key, value] of Object.entries(generalKeywords[language])) {
        if (lowerQuestion.includes(key)) {
          return value
        }
      }
    }

    return null
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

      // Qisqa savollar uchun tezkor javob topish
      const quickMatch = this.findQuickAnswer(question, language)
      let enhancedQuestion = question

      if (quickMatch) {
        enhancedQuestion = `${question} - ${quickMatch} haqida batafsil ma'lumot bering`
      }

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

MUHIM QOIDALAR:
1. Faqat ushbu ma'lumotlarga asoslanib savollarga javob bering
2. Qisqa so'zlar yoki noto'liq savollar uchun ham mos javob toping (masalan: "bank ishi", "dasturlash", "narx", "kontrakt narxlari", "qabul kvotasi", "yotoqxona bepul", "harbiy kafedra" kabi)
3. Har qanday uzunlikdagi savolga javob bering - qisqa (1-2 so'z), o'rta (1-2 jumla) yoki uzun (ko'p jumlali)
4. Agar savol berilgan mavzuga aloqador bo'lmasa yoki sizda javob berish uchun yetarli ma'lumot bo'lmasa, aynan shu matnni yozing: "Bu savol uchun ma'lumotlar mavjud emas. USAT universiteti haqida boshqa savollaringiz bo'lsa, bemalol so'rang!"
5. Javoblaringizda markdown formatlash (**, *, __, \`) ishlatmang - oddiy matn ko'rinishida yozing
6. Yo'nalish nomlari, narxlar va boshqa aniq ma'lumotlarni to'liq va aniq bering
7. Kontekstli va murakkab savollar uchun batafsil javob bering
8. Savolning mazmuniga qarab, tegishli bo'limdan ma'lumot oling va to'liq javob bering
9. Yangi qo'shilgan ma'lumotlardan ham foydalaning: magistratura mutaxassisliklari, grant turlari, onlayn hujjat topshirish, harbiy tayyorgarlik, iqtidorli talabalar markazi va boshqalar`

      const result = await this.model.generateContent([{ text: systemInstruction }, { text: enhancedQuestion }])

      const response = await result.response
      const text = response.text()

      if (!text || text.trim() === "") {
        console.warn(`Gemini API returned an empty text response for question: '${question}'`)

        const noAnswerMessages = {
          uzbek:
            "Bu savol uchun ma'lumotlar mavjud emas. USAT universiteti haqida boshqa savollaringiz bo'lsa, bemalol so'rang!",
          russian:
            "Информация по этому вопросу недоступна. Если у вас есть другие вопросы об университете USAT, смело спрашивайте!",
          english:
            "Information on this question is not available. If you have other questions about USAT university, feel free to ask!",
        }

        return noAnswerMessages[language] || noAnswerMessages.uzbek
      }

      // Clean the response text - remove markdown formatting
      const cleanedText = text
        .replace(/\*\*(.*?)\*\*/g, "$1") // Remove ** bold formatting
        .replace(/\*(.*?)\*/g, "$1") // Remove * italic formatting
        .replace(/__(.*?)__/g, "$1") // Remove __ underline formatting
        .replace(/`(.*?)`/g, "$1") // Remove ` code formatting
        .trim()

      console.log(`Received response from Gemini (${language}): '${cleanedText.substring(0, 50)}...'`)
      return cleanedText
    } catch (error) {
      console.error(`An error occurred during content generation: ${error.message}`)

      const errorMessages = {
        uzbek:
          "Bu savol uchun ma'lumotlar mavjud emas. USAT universiteti haqida boshqa savollaringiz bo'lsa, bemalol so'rang!",
        russian:
          "Информация по этому вопросу недоступна. Если у вас есть другие вопросы об университете USAT, смело спрашивайте!",
        english:
          "Information on this question is not available. If you have other questions about USAT university, feel free to ask!",
      }

      return errorMessages[language] || errorMessages.uzbek
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
