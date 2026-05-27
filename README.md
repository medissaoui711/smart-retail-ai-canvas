# 🧠 Smart Retail AI Canvas – نظام إدارة المخزون الذكي بالمحاكاة الفيزيائية

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E)](https://supabase.com)
[![OpenAI](https://img.shields.io/badge/AI-GPT--4o%20Mini-412991)](https://openai.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)](https://docker.com)

## 📋 نظرة عامة

**Smart Retail AI Canvas** هو نظام **توأم رقمي (Digital Twin)** لمتجر تجزئة ذكي، يحول مفاهيم المحاكاة الفيزيائية إلى نظام أتمتة تجاري مغلق الحلقة. صُمم كمشروع تخرج أكاديمي ومنتج SaaS قابل للتسويق.

### 🔄 التحويل الفيزيائي-التجاري

| المفهوم الفيزيائي | المفهوم التجاري |
|-------------------|-----------------|
| 🟡 الجسيمات | وحدات المنتجات (علب، زجاجات) |
| ⬇️ الجاذبية | معدل الطلب وسرعة البيع |
| 📏 أرضية الشاشة | نقطة البيع POS |
| 🏭 المذبذب | خط الإمداد والتوريد الآلي |

## ✨ الميزات الرئيسية

- 🎨 **محاكاة فيزيائية حية** للمخزون باستخدام HTML5 Canvas
- 📊 **Dashboard تفاعلي** مع Charts.js وعدادات لحظية
- 🤖 **وكيل ذكي مستقل** يعمل 24/7 للتنبؤ بالطلب
- 🧠 **تكامل GPT-4o Mini** للتنبؤات الدقيقة
- 🔄 **تحديثات Real-time** عبر Supabase WebSockets
- 🐳 **جاهز للنشر** باستخدام Docker
- 📱 **تصميم متجاوب** يعمل على جميع الشاشات

## 🚀 التشغيل السريع

### المتطلبات الأساسية
- Node.js 18+
- حساب [Supabase](https://supabase.com) مجاني
- مفتاح [OpenAI API](https://platform.openai.com) (اختياري)

### التثبيت خطوة بخطوة

```bash
# 1. استنساخ المشروع
git clone https://github.com/medissaoui711/smart-retail-ai-canvas.git
cd smart-retail-ai-canvas

# 2. إعداد قاعدة البيانات
# افتح Supabase SQL Editor ونفذ محتويات database/schema.sql

# 3. تشغيل الوكيل الذكي
cd agent
cp .env.example .env
# عدل الملف .env بمفاتيح Supabase و OpenAI
npm install
node agent.js

# 4. تشغيل الواجهة الأمامية
cd ../frontend
npm install
npx serve .
```

### أو استخدم Docker

```bash
docker-compose -f docker/docker-compose.yml up --build
```

## 📊 لقطات الشاشة

![Dashboard](docs/screenshots/dashboard.png)
![Canvas Simulation](docs/screenshots/canvas.png)

## 🏗️ معمارية النظام

```
┌─────────────────────────────────────────────────────────────┐
│                        المتصفح                              │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │   Canvas Simulation  │  │   Dashboard + Charts         │ │
│  │   • Product Fall     │  │   • Real-time Metrics        │ │
│  │   • Checkout Line    │  │   • Agent Status             │ │
│  │   • Restock Visual   │  │   • Activity Logs            │ │
│  └──────────┬───────────┘  └──────────────┬───────────────┘ │
└─────────────┼──────────────────────────────┼─────────────────┘
              │                              │
              │  Supabase Realtime (WebSocket)│
              │                              │
┌─────────────┼──────────────────────────────┼─────────────────┐
│             ▼                              ▼                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Supabase (PostgreSQL)                    │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │   │
│  │  │ Products │ │Inventory │ │  Sales   │ │Agent    │ │   │
│  │  │          │ │          │ │          │ │Logs     │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ WebSocket Listener
┌─────────────────────────────┼───────────────────────────────┐
│                             │                                │
│  ┌──────────────────────────┴───────────────────────────┐   │
│  │              AI Agent (Node.js)                       │   │
│  │  • مراقبة المخزون 24/7                               │   │
│  │  • تنبؤ GPT-4o Mini بالطلب                           │   │
│  │  • أوامر شراء تلقائية                                │   │
│  │  • Heartbeat كل 30 ثانية                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│              Smart Store AI Agent v3.0                       │
└──────────────────────────────────────────────────────────────┘
```

## 🎓 الاستخدام الأكاديمي

هذا المشروع صُمم ليكون مشروع تخرج متكاملاً. يحتوي على:

- **سيناريو مناقشة جاهز**: `docs/PITCH_SCRIPT.md`
- **توثيق تقني كامل**: تعليقات في الكود + شرح المعمارية
- **محاكاة فيزيائية**: تطبيق عملي لمفاهيم الفيزياء في التجارة
- **ذكاء اصطناعي**: استخدام LLM للتنبؤ بالطلب
- **نظام خلفي مستقل**: Agent يعمل كخدمة منفصلة

## 💼 الاستخدام التجاري

قابل للتسويق كمنتج SaaS:
- **السعر المقترح**: 500-1500 ريال/شهر للمتجر
- **القيمة المضافة**: تقليل الفاقد، منع النفاد، أتمتة الطلبات
- **قابل للتوسع**: دعم متعدد المتاجر، تطبيق جوال، تنبؤات موسمية

## 💼 الميزات المؤسسية (Enterprise Features)

### 🧾 التقارير الإدارية
- **تصدير PDF بنقرة واحدة**: تقرير كامل عن حالة المخزون
- **تنسيق احترافي**: رأسية، جدول منتجات، مؤشرات، تذييل
- **جاهز للطباعة**: يمكن تقديمه للإدارة أو المستثمرين

### 🏢 دعم متعدد المتاجر (Multi-Tenant)
- **نفس الكود، آلاف المتاجر**: معمارية tenant-ready
- **عزل البيانات**: كل متجر يرى مخزونه فقط
- **تبديل فوري**: التنقل بين المتاجر من لوحة التحكم

### ⚖️ ترخيص تجاري
- **ملكية فكرية محمية**: $100,000 قيمة تقديرية
- **جاهز للاستثمار**: أصل غير ملموس مُسجل
- **تراخيص مرنة**: Academic | Commercial | Enterprise

## 📈 خارطة الطريق

- [x] v1.0: المحاكاة + Dashboard + الوكيل الذكي
- [ ] v1.1: دعم متعدد المستخدمين والمتاجر
- [ ] v1.2: لوحة تحكم المالك (متاجر متعددة)
- [ ] v1.3: تطبيق PWA للموبايل
- [ ] v2.0: تنبؤات موسمية + تقارير متقدمة

## 🛠️ التقنيات المستخدمة

- **Frontend**: HTML5 Canvas, Chart.js, Vanilla JavaScript
- **Backend**: Node.js, Supabase Realtime
- **Database**: PostgreSQL (Supabase)
- **AI/ML**: OpenAI GPT-4o Mini API
- **DevOps**: Docker, Docker Compose
- **Monitoring**: Heartbeat System

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT - انظر ملف [LICENSE](LICENSE) للتفاصيل.

## 👨‍💻 المطور

**Mohamed Issaoui** - طالب ريادة أعمال وتقنية

[![GitHub](https://img.shields.io/badge/GitHub-Follow-black)](https://github.com/medissaoui711)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue)](https://linkedin.com/in/YOUR_USERNAME)

---

⭐ **إذا أعجبك المشروع، لا تنسى وضع نجمة!** ⭐

> "تحويل الفيزياء إلى تجارة، والجاذبية إلى مبيعات"
# smart-retail-ai-canvas
