# 🤟 Kiri — Real-Time Indian Sign Language (ISL) Translator

**Kiri** is a modern, privacy-first web application that translates Indian Sign Language (ISL) hand gestures into text and spoken audio in real time. Built with React 18, TypeScript, MediaPipe Tasks Vision, 21-point hand coordinate recognition, and Supabase.

---

## ✨ Features

- 📷 **Real-Time ISL Hand Landmark Detection**: Powered by Google MediaPipe (`@mediapipe/tasks-vision`), tracking 21 3D hand keypoints directly inside the browser using GPU/WASM acceleration with dual-handed and single-handed ISL recognition.
- 📐 **21-Point Spatial Coordinate Recognition**: Mathematical landmark normalizer, RMSE evaluation, and canonical 3D topology matching across the complete ISL Alphabet (A–Z).
- 🗣️ **Bilingual Text-to-Speech (TTS)**: Spoken voice synthesis in both Hindi and English powered by the Web Speech API (`SpeechSynthesis`).
- ✍️ **Interactive Message Builder**: Real-time gesture letter accumulation into complete words and phrases, complete with **Space**, **Delete**, and **Clear** toolbar controls.
- 🎓 **Interactive ISL Academy**: 12 guided ISL lessons, multiple-choice skill quizzes, live webcam sign verification, and progress tracking with Supabase `learning_progress` sync.
- 📖 **Comprehensive ISL Dictionary**: Searchable ISL vocabulary with Hindi translations, devanagari phonetic notations, category filters, and bookmarking.
- 👥 **Community Message Board**: Share stories, feedback, and experiences with other learners and signers (powered by Supabase Database and Row Level Security).
- 🔒 **Privacy First**: Video frames stay on your device canvas and are processed entirely client-side. No camera streams are recorded or uploaded.
- 🛡️ **Error Boundary & Robust Architecture**: Built with React Error Boundaries to prevent unexpected runtime UI crashes and full TypeScript strict checking.

---

## 🛠️ Technology Stack

| Technology | Purpose |
| :--- | :--- |
| **React 18** | UI component architecture and state management |
| **TypeScript 5** | Strict type safety and environment variable interfaces |
| **Vite 5** | Fast development server and production bundler |
| **Tailwind CSS 3** | Modern responsive styling, custom animations, and glassmorphism UI |
| **MediaPipe Vision** | 3D hand landmark recognition (`HandLandmarker`) |
| **Supabase** | Authentication, Postgres database, and Row Level Security (RLS) |
| **Lucide React** | Modern vector UI icons |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Webcam**: Required for live gesture translation features

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/kiri.git
cd kiri
npm install
```

### 2. Environment Setup

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **Note**: A database migration file is located in `supabase/migrations/` to set up required database tables and Row Level Security (RLS) policies.

### 3. Development Server

Start the local development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

---

## 📜 Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Start Vite development server with local network host binding |
| `npm run build` | Build optimized production bundle to `dist/` |
| `npm run typecheck` | Run TypeScript compiler type checking without emitting files |
| `npm run lint` | Run ESLint across all `.ts` and `.tsx` files |
| `npm run preview` | Preview production build locally |

---

## 🗄️ Database Schema & Security

The database schema (`supabase/migrations/20260824094241_create_sign_language_translator_schema.sql`) includes:

- **`profiles`**: User display names and avatar metadata linked to `auth.users`.
- **`translation_history`**: Stores saved gesture sequences translated by logged-in users.
- **`community_posts`**: Public discussion board messages with owner-scoped edit/delete policies.
- **`learning_progress`**: Tracks per-user completed sign language lessons.

All tables are protected by Row Level Security (RLS) policies allowing public read access for community posts while enforcing user-scoped mutation rules.

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit Pull Requests to add new sign gesture classifications or enhance the UI.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
