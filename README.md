# 🩺 HealthAI — Agentic AI Health Platform

[![CI](https://github.com/jhaashutosh07/ai-health-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/jhaashutosh07/ai-health-tracker/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?logo=prisma)
![OpenAI](https://img.shields.io/badge/AI-GPT--4o-412991?logo=openai)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)

An all-in-one, AI‑powered health platform for the Indian context — symptom triage, real verified‑doctor discovery & booking, medicine intelligence, medical records, chronic‑care tools, and one‑tap emergency help. Built with GPT‑4o (chat + vision + voice), RAG, and a suite of real‑world integrations.

**🔗 Live demo:** https://ai-health-tracker-lac.vercel.app

> ⚠️ **Medical disclaimer:** HealthAI provides AI‑generated information and guidance, **not** a medical diagnosis. It is not a substitute for a qualified doctor. For emergencies, call **112**.

---

## ✨ Features

### For patients
- **AI Symptom Checker** — conversational (chat or **voice**) assessment returning likely conditions, OTC suggestions (Indian brands), red flags and a recommendation, with a deterministic emergency safety layer.
- **Hands‑free Voice Assistant** — talk and hear replies, with natural cloud TTS for **Hindi, Bengali & regional languages**. Includes a **Cough & Breathing Check**.
- **AI Image Diagnosis** — analyze a skin/wound/rash photo or a lab report with GPT‑4o vision.
- **AI Second‑Opinion Panel** — a virtual panel of specialist personas that each weigh in, then synthesize a consensus.
- **Ask HealthAI** — RAG‑grounded Q&A over the user's **own records** with cited sources; plus a **global floating assistant** on every page.
- **Find & Book Doctors** — real nearby clinics via **Google Places API (New)** merged with the platform's verified doctors, per‑doctor **AI insight**, ratings and phone numbers, nearest‑first.
- **Appointments** — booking with **real‑time** status updates (Pusher) + email confirmations.
- **Medicine Checker & Pill Identifier** — snap a tablet/strip to identify it, and AI checks interactions across your medications.
- **Prescription Scanner** — photograph an Rx → auto‑adds medicines to your tracker.
- **Medications** — schedules, dose logging, adherence, reminders (email cron).
- **Vitals & Lab Trends** — log vitals; upload lab reports → AI extracts values and charts them over time.
- **Chronic Care Programs**, **Diet Planner**, **Risk Calculators** (Diabetes IDRS / BMI / Heart), **PHQ‑9 & GAD‑7 screenings**, **Mood Tracker** + **Wellbeing Companion**.
- **Health Report (PDF)**, **QR Health Passport**, **Achievements/gamification**, **Command Palette (⌘/Ctrl+K)**.
- **Emergency** — one‑tap **SOS** (live location + medical card over WhatsApp / SMS), a scannable **Emergency Card**, and in‑card nearest hospital/pharmacy lookup.
- **Multilingual** (English, Hindi, Bengali, Tamil, Telugu, Marathi) with AI responses in the selected language.

### For doctors
- **Verified‑doctor portal** — access gated by **NMC / Indian Medical Register** verification.
- **Real‑time appointment dashboard**, **AI pre‑consultation patient briefs** (scoped to booked patients), **digital prescriptions**, and an **AI SOAP‑note scribe** (transcribe a consult → structured notes + Rx draft).

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 14** (Pages Router) · **TypeScript** |
| Database | **PostgreSQL** (Neon) via **Prisma ORM** |
| Auth | **NextAuth** — credentials + Google OAuth |
| AI | **OpenAI GPT‑4o** (chat, vision, RAG) · `gpt-4o-mini-tts` (voice) |
| Doctor data | **Google Places API (New)** |
| Verification | **NMC Indian Medical Register** lookup |
| Realtime | **Pusher** |
| Messaging | **WhatsApp Cloud API** (SOS) · **Nodemailer/Gmail** · **Twilio** (fallback) |
| UI | **Tailwind CSS** · lucide‑react · Recharts · Plus Jakarta Sans |
| Testing | **Jest** · node‑mocks‑http |
| Hosting | **Vercel** (CI/CD from `main`) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- A PostgreSQL database (e.g. [Neon](https://neon.tech))
- An OpenAI API key (required); Google/Pusher/WhatsApp keys are optional per feature

### Install & run
```bash
git clone https://github.com/jhaashutosh07/ai-health-tracker.git
cd ai-health-tracker
npm install

cp .env.example .env.local   # then fill in your values

npm run db:push              # apply the Prisma schema
npm run db:seed              # (optional) demo data

npm run dev                  # http://localhost:3000
```

### Environment variables
See [`.env.example`](.env.example) for the full list. Key ones:

| Variable | Purpose |
|---|---|
| `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` | Database (pooled + direct) |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | Auth |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign‑in |
| `OPENAI_API_KEY` | All AI features (**required**) |
| `OPENAI_CHAT_MODEL`, `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE` | Model overrides |
| `GOOGLE_PLACES_API_KEY` | Real nearby doctors/hospitals (server‑side key) |
| `EMAIL_FROM`, `EMAIL_PASSWORD` | Transactional email (Gmail app password) |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` | WhatsApp SOS + bot |
| `PUSHER_*`, `NEXT_PUBLIC_PUSHER_*` | Real‑time updates |
| `DEMO_VERIFIED_DOCTORS` | Emails auto‑verified as doctors (demo) |
| `NEXT_PUBLIC_DEMO_VIDEO_URL` | "Watch demo" popup video (optional) |

---

## 🗂️ Project Structure
```
pages/            Next.js pages + API routes (pages/api/**)
components/       Shared UI (AppShell, SymptomChat, FloatingAssistant, …)
lib/              openai, prisma, rag, i18n, whatsapp, nmcVerify, auth helpers
prisma/           schema.prisma + seed
data/             curated medical knowledge corpus (RAG)
__tests__/        Jest tests
scripts/          seeding / ingest / evaluation utilities
```

---

## 🧪 Testing & CI
```bash
npm test          # Jest suite
npm run build     # production build
```
Every push / PR to `main` runs the **CI workflow** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): install → Prisma generate → tests → build.

---

## ☁️ Deployment
Deployed on **Vercel**, auto‑building from `main`. The Vercel build command runs `prisma generate && prisma db push && next build` so schema changes apply on deploy.

---

## 🔒 Security & Privacy
- Doctors are verified against the real medical register before accessing patient data; patient records are access‑scoped.
- Medical documents are stored privately and served through an authenticated, ownership‑checked route.
- Passwords are bcrypt‑hashed; auth endpoints are rate‑limited; the emergency card is shared via an unguessable token.

---

## 📄 License
For educational / demonstration purposes.

<sub>Built with Next.js, Prisma & OpenAI. AI output is informational only and not a substitute for professional medical advice.</sub>
