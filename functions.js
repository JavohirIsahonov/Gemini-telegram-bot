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
      russian: {
        // Банковское дело
        банк: "bankIshi",
        "банковское дело": "bankIshi",
        банкир: "bankIshi",

        // Программирование
        программирование: "dasturiyInjiniring",
        "программная инженерия": "dasturiyInjiniring",
        программист: "dasturiyInjiniring",

        // Компьютер
        компьютер: "kompyuterInjiniringi",
        "компьютерная инженерия": "kompyuterInjiniringi",
        "информационные технологии": "kompyuterInjiniringi",

        // Финансы
        финансы: "moliyaTexnologiyalar",
        "финансовые технологии": "moliyaTexnologiyalar",

        // Экономика
        экономика: "iqtisodiyot",

        // Бухгалтерия
        бухгалтер: "buxgalteriyaHisobi",
        "бухгалтерский учет": "buxgalteriyaHisobi",

        // Туризм
        туризм: "turizm",
        "туризм и гостеприимство": "turizm",

        // Языки
        язык: "xorijiyTil",
        "иностранный язык": "xorijiyTil",
        английский: "xorijiyTil",

        // История
        история: "tarix",

        // Математика
        математика: "matematika",

        // Психология
        психология: "psixologiya",
        психолог: "psixologiya",

        // Архитектура
        архитектура: "arxitektura",

        // Образование
        "дошкольное образование": "maktabgachaTalim",
        "начальное образование": "boshlangichTalim",

        // Логистика
        логистика: "logistika",

        // Специальная педагогика
        "специальная педагогика": "maxsusPedagogika",

        // Узбекский язык
        "узбекский язык": "ozbekTili",

        // Социальная работа
        "социальная работа": "ijtimoiyIsh",
      },
      english: {
        // Banking
        bank: "bankIshi",
        banking: "bankIshi",
        banker: "bankIshi",

        // Programming
        programming: "dasturiyInjiniring",
        "software engineering": "dasturiyInjiniring",
        programmer: "dasturiyInjiniring",
        coding: "dasturiyInjiniring",

        // Computer
        computer: "kompyuterInjiniringi",
        "computer engineering": "kompyuterInjiniringi",
        "information technology": "kompyuterInjiniringi",

        // Finance
        finance: "moliyaTexnologiyalar",
        "financial technologies": "moliyaTexnologiyalar",

        // Economics
        economics: "iqtisodiyot",

        // Accounting
        accounting: "buxgalteriyaHisobi",
        accountant: "buxgalteriyaHisobi",

        // Tourism
        tourism: "turizm",
        "tourism and hospitality": "turizm",
        hospitality: "turizm",

        // Languages
        language: "xorijiyTil",
        "foreign language": "xorijiyTil",
        english: "xorijiyTil",

        // History
        history: "tarix",

        // Mathematics
        mathematics: "matematika",
        math: "matematika",

        // Psychology
        psychology: "psixologiya",
        psychologist: "psixologiya",

        // Architecture
        architecture: "arxitektura",

        // Education
        "preschool education": "maktabgachaTalim",
        "primary education": "boshlangichTalim",

        // Logistics
        logistics: "logistika",

        // Special pedagogy
        "special pedagogy": "maxsusPedagogika",

        // Uzbek language
        "uzbek language": "ozbekTili",

        // Social work
        "social work": "ijtimoiyIsh",
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
        natijalar: "qabulJarayoni",
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
        "yo'nalish": "oquvJarayoni", // <-- Tuzatilgan qator
        "yo'nalishlar soni": "oquvJarayoni",
        "nechta yo'nalish": "oquvJarayoni",

        // Darslar
        dars: "oquvJarayoni",
        darslar: "oquvJarayoni",
        "dars vaqti": "oquvJarayoni",
        "necha soat": "oquvJarayoni",
        "necha daqiqa": "oquvJarayoni",
        sessiya: "oquvJarayoni",
        imtihonlar: "oquvJarayoni",

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
        xorijlik: "universitetHaqida",

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
        "dasturiy tillar": "bakalavriYonalishlari",
      },
      russian: {
        // Цена и оплата
        цена: "kontraktNarxlari",
        стоимость: "kontraktNarxlari",
        "стоимость контракта": "kontraktNarxlari",
        "стоимость обучения": "kontraktNarxlari",
        оплата: "moliyaviyShartlar",
        "способы оплаты": "moliyaviyShartlar",
        рассрочка: "moliyaviyShartlar",

        // Грант и стипендия
        грант: "grantVaStipendiyalar",
        "грантовые места": "grantVaStipendiyalar",
        стипендия: "grantVaStipendiyalar",
        "стипендия ректора": "grantVaStipendiyalar",
        "президентская стипендия": "grantVaStipendiyalar",
        "государственный грант": "grantVaStipendiyalar",

        // Поступление
        поступление: "qabulJarayoni",
        "сроки поступления": "qabulJarayoni",
        экзамен: "qabulJarayoni",
        тест: "qabulJarayoni",
        "вступительные экзамены": "qabulJarayoni",
        "минимальный балл": "qabulJarayoni",
        документы: "qabulJarayoni",
        "подача документов": "qabulJarayoni",

        // Местоположение
        адрес: "joylashuvManzili",
        "где находится": "joylashuvManzili",
        "адрес университета": "joylashuvManzili",

        // Общежитие
        общежитие: "infratuzilmaVaQulayliklar",
        "общежитие для студентов": "infratuzilmaVaQulayliklar",
        "условия проживания": "infratuzilmaVaQulayliklar",

        // Контакты
        телефон: "boglanishUchun",
        контакты: "boglanishUchun",
        "номер телефона": "boglanishUchun",
        сайт: "boglanishUchun",
        "веб-сайт": "boglanishUchun",

        // Форма обучения
        "форма обучения": "oquvJarayoni",
        дневная: "oquvJarayoni",
        вечерняя: "oquvJarayoni",
        заочная: "oquvJarayoni",
        дистанционная: "oquvJarayoni",
        "язык обучения": "oquvJarayoni",
        "срок обучения": "oquvJarayoni",

        // Магистратура
        магистратура: "oquvJarayoni",
        "есть ли магистратура": "oquvJarayoni",

        // Диплом
        диплом: "oquvJarayoni",
        "признается ли диплом": "oquvJarayoni",
        "государственный диплом": "oquvJarayoni",

        // Сертификаты
        "сертификат IELTS": "chetTiliSertifikatiImtiyozlari",
        сертификат: "chetTiliSertifikatiImtiyozlari",
        "языковой сертификат": "chetTiliSertifikatiImtiyozlari",

        // Трудоустройство
        работа: "oquvJarayoni",
        "поиск работы": "oquvJarayoni",
        трудоустройство: "oquvJarayoni",
        "помощь выпускникам": "oquvJarayoni",

        // Спорт и деятельность
        спорт: "infratuzilmaVaQulayliklar",
        "спортивные секции": "fanKlublar",
        "научные клубы": "fanKlublar",
        деятельность: "fanKlublar",
        мероприятия: "tadbirlar",

        // Факультеты и направления
        факультет: "oquvJarayoni",
        "сколько факультетов": "oquvJarayoni",
        направление: "oquvJarayoni",
        "количество направлений": "oquvJarayoni",
        специальность: "oquvJarayoni",

        // Занятия
        занятия: "oquvJarayoni",
        "время занятий": "oquvJarayoni",
        "сколько часов": "oquvJarayoni",
        сессия: "oquvJarayoni",
        экзамены: "oquvJarayoni",

        // Льготы и скидки
        льготы: "moliyaviyShartlar",
        скидка: "moliyaviyShartlar",
        "социальные льготы": "moliyaviyShartlar",

        // Практика
        практика: "oquvJarayoni",
        "программы практики": "oquvJarayoni",

        // Международное сотрудничество
        международное: "universitetHaqida",
        "международный обмен": "universitetHaqida",
        зарубежные: "universitetHaqida",

        // Перевод
        перевод: "perevod",
        "перевод из другого вуза": "perevod",

        // Инфраструктура
        библиотека: "infratuzilmaVaQulayliklar",
        лаборатория: "infratuzilmaVaQulayliklar",
        "информационный центр": "infratuzilmaVaQulayliklar",
        столовая: "infratuzilmaVaQulayliklar",
        интернет: "infratuzilmaVaQulayliklar",

        // Лицензия
        лицензия: "universitetHaqida",
        аккредитация: "universitetHaqida",
        "государственная лицензия": "universitetHaqida",
      },
      english: {
        // Price and payment
        price: "kontraktNarxlari",
        cost: "kontraktNarxlari",
        "contract price": "kontraktNarxlari",
        "tuition fee": "kontraktNarxlari",
        payment: "moliyaviyShartlar",
        "payment methods": "moliyaviyShartlar",
        installment: "moliyaviyShartlar",

        // Grant and scholarship
        grant: "grantVaStipendiyalar",
        "grant places": "grantVaStipendiyalar",
        scholarship: "grantVaStipendiyalar",
        "rector scholarship": "grantVaStipendiyalar",
        "presidential scholarship": "grantVaStipendiyalar",
        "state grant": "grantVaStipendiyalar",

        // Admission
        admission: "qabulJarayoni",
        "admission period": "qabulJarayoni",
        exam: "qabulJarayoni",
        test: "qabulJarayoni",
        "entrance exam": "qabulJarayoni",
        "minimum score": "qabulJarayoni",
        documents: "qabulJarayoni",
        "document submission": "qabulJarayoni",

        // Location
        address: "joylashuvManzili",
        location: "joylashuvManzili",
        "where is located": "joylashuvManzili",
        "university address": "joylashuvManzili",

        // Dormitory
        dormitory: "infratuzilmaVaQulayliklar",
        "student dormitory": "infratuzilmaVaQulayliklar",
        "living conditions": "infratuzilmaVaQulayliklar",
        accommodation: "infratuzilmaVaQulayliklar",

        // Contacts
        phone: "boglanishUchun",
        contact: "boglanishUchun",
        "phone number": "boglanishUchun",
        website: "boglanishUchun",

        // Form of education
        "form of education": "oquvJarayoni",
        "full-time": "oquvJarayoni",
        "part-time": "oquvJarayoni",
        evening: "oquvJarayoni",
        "distance learning": "oquvJarayoni",
        "language of instruction": "oquvJarayoni",
        "duration of study": "oquvJarayoni",

        // Master's degree
        "master's": "oquvJarayoni",
        "master's degree": "oquvJarayoni",
        "is there master's": "oquvJarayoni",

        // Diploma
        diploma: "oquvJarayoni",
        "is diploma recognized": "oquvJarayoni",
        "state diploma": "oquvJarayoni",

        // Certificates
        "IELTS certificate": "chetTiliSertifikatiImtiyozlari",
        certificate: "chetTiliSertifikatiImtiyozlari",
        "language certificate": "chetTiliSertifikatiImtiyozlari",

        // Employment
        job: "oquvJarayoni",
        work: "oquvJarayoni",
        employment: "oquvJarayoni",
        "job placement": "oquvJarayoni",
        "career support": "oquvJarayoni",

        // Sports and activities
        sport: "infratuzilmaVaQulayliklar",
        "sports clubs": "fanKlublar",
        "science clubs": "fanKlublar",
        activities: "fanKlublar",
        events: "tadbirlar",

        // Faculties and directions
        faculty: "oquvJarayoni",
        "how many faculties": "oquvJarayoni",
        direction: "oquvJarayoni",
        "number of directions": "oquvJarayoni",
        major: "oquvJarayoni",
        specialty: "oquvJarayoni",

        // Classes
        classes: "oquvJarayoni",
        "class time": "oquvJarayoni",
        "how many hours": "oquvJarayoni",
        session: "oquvJarayoni",
        exams: "oquvJarayoni",

        // Benefits and discounts
        benefits: "moliyaviyShartlar",
        discount: "moliyaviyShartlar",
        "social benefits": "moliyaviyShartlar",

        // Practice
        practice: "oquvJarayoni",
        internship: "oquvJarayoni",
        "practice programs": "oquvJarayoni",

        // International cooperation
        international: "universitetHaqida",
        "international exchange": "universitetHaqida",
        foreign: "universitetHaqida",

        // Transfer
        transfer: "perevod",
        "transfer from another university": "perevod",

        // Infrastructure
        library: "infratuzilmaVaQulayliklar",
        laboratory: "infratuzilmaVaQulayliklar",
        "information center": "infratuzilmaVaQulayliklar",
        cafeteria: "infratuzilmaVaQulayliklar",
        internet: "infratuzilmaVaQulayliklar",

        // License
        license: "universitetHaqida",
        accreditation: "universitetHaqida",
        "state license": "universitetHaqida",
      },
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
          const response1 = await usatGenerator.generateInLanguage(question1, "uzbek")
          console.log(`Savol: ${question1}\nJavob: ${response1}`)

          console.log("\n--- Test Case 2: Yana bir tegishli savol ---")
          const question2 = "USAT kompaniyasining aloqa ma'lumotlari qanday?"
          const response2 = await usatGenerator.generateInLanguage(question2, "uzbek")
          console.log(`Savol: ${question2}\nJavob: ${response2}`)

          console.log("\n--- Test Case 3: Aloqasi yo'q savol ---")
          const question3 = "Eng yaxshi mashina qaysi?"
          const response3 = await usatGenerator.generateInLanguage(question3, "uzbek")
          console.log(`Savol: ${question3}\nJavob: ${response3}`)
        } catch (error) {
          console.log(`\nIshga tushirish xatosi: ${error.message}`)
        }
      })
  })
}
