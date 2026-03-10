# Adam Project - YOUR AI PERSONAL TEACHER

An AI-powered talking avatar built with Google Gemini, Three.js, and React. Adam can hold conversations, express emotions, speak in multiple languages, and now supports real user authentication backed by MongoDB.

## Key Features

- 🤖 **Natural AI Conversations** — powered by Google Gemini
- 🎭 **Expressive 3D Avatar** — realistic facial expressions, body animations, and lip-sync
- 🎙️ **Voice & Text Input** — speech-to-text and text-to-speech in English, Hindi, and Telugu
- 🌐 **Multilingual TTS** — Google Cloud TTS for Hindi & Telugu, with proper script validation
- 📄 **Document Upload** — upload PDF/DOCX/TXT and let Adam summarize and explain them
- 🧠 **Retention Tests** — AI-generated quizzes from conversation history with personalized feedback
- 🔐 **Real Authentication** — register/login with MongoDB + bcrypt + JWT tokens
- 🔒 **Protected Routes** — `/avatar` is accessible only to authenticated users

---

## How it Works

### Text Input Workflow
1. User types a message in the chat interface
2. Text is sent to the Gemini API for processing
3. Gemini generates a response with facial expression/animation metadata
4. Response is converted to speech (Google Cloud TTS for Hindi/Telugu, local TTS for English)
5. Audio is processed by Rhubarb Lip Sync to generate viseme data
6. Avatar animates with synchronized lip movements and expressions

### Voice Input Workflow
1. User speaks into the microphone
2. Audio is converted to text via Google Cloud STT
3. Same pipeline as text input from step 2 onwards

### Authentication Flow
1. User registers (name, email, password) → password hashed with bcrypt → stored in MongoDB
2. On login, credentials verified → JWT token returned and stored in `localStorage`
3. All visits to `/avatar` are protected — unauthenticated users are redirected to landing page
4. Logout clears token and redirects back to the landing page

---

## Getting Started

### Requirements

1. **Node.js** (v18+)
2. **MongoDB** — install locally or use [MongoDB Atlas](https://www.mongodb.com/atlas). [MongoDB Compass](https://www.mongodb.com/products/compass) recommended for visual management.
3. **Google Cloud Account** — for Gemini API and Google Cloud TTS/STT
   - Gemini API key: [Google AI Studio](https://aistudio.google.com/)
   - Service Account JSON: [Google Cloud Console](https://console.cloud.google.com/) (enable Cloud TTS & STT APIs)
4. **Rhubarb Lip-Sync** — download from [Rhubarb Lip-Sync releases](https://github.com/DanielSWolf/rhubarb-lip-sync/releases). Create a `/bin` directory in `apps/backend` and extract contents there.
5. **ffmpeg** — [Mac](https://formulae.brew.sh/formula/ffmpeg) | [Linux/Windows](https://ffmpeg.org/download.html)

---

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/AbhiramValmeekam/adam-project.git
cd adam-project
```

2. **Install all dependencies:**
```bash
# Root monorepo
yarn

# Backend
cd apps/backend
npm install

# Frontend
cd apps/frontend
npm install
```

3. **Create the `.env` file** in `apps/backend/`:
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/adam-project

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=7d

# Google Gemini AI
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>

# Google Cloud TTS/STT (for Hindi and Telugu)
GOOGLE_APPLICATION_CREDENTIALS=<ABSOLUTE_PATH_TO_YOUR_SERVICE_ACCOUNT_JSON>
```

4. **Start MongoDB** — make sure your local MongoDB server is running (or use Atlas connection string in `MONGODB_URI`).

5. **Run the servers:**

```bash
# Terminal 1 - Backend (port 3002)
cd apps/backend
npm run dev

# Terminal 2 - Frontend (port 5173)
cd apps/frontend
npm run dev
```

6. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Structure

```
adam-project/
├── apps/
│   ├── backend/               # Node.js Express server
│   │   ├── modules/           # Gemini, TTS, STT, lip-sync modules
│   │   ├── utils/             # Audio and file utilities
│   │   ├── audios/            # Generated audio cache
│   │   └── server.js          # Main server (auth routes + AI endpoints)
│   └── frontend/              # React + Vite app
│       └── src/
│           ├── components/    # Avatar, ChatInterface, LandingPage, RetentionTest
│           ├── hooks/         # useSpeech hook
│           ├── constants/     # Viseme mappings, morph targets
│           └── App.jsx        # Router with ProtectedRoute
└── resources/                 # Architecture diagrams
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register new user (name, email, password) |
| `POST` | `/auth/login` | Login and receive JWT token |
| `GET` | `/auth/verify` | Verify JWT token validity |
| `POST` | `/tts` | Generate avatar response from text |
| `POST` | `/sts` | Speech-to-avatar (audio → text → response) |
| `POST` | `/summary` | Generate a summary of chat history |
| `POST` | `/retention-test/generate` | Generate quiz from conversation |
| `POST` | `/retention-test/feedback` | Get personalized feedback on quiz results |
| `POST` | `/api/documents/upload` | Upload & summarize a document (PDF/DOCX/TXT) |

---

## Customization

- **Avatar personality & responses:** Edit the prompt in `apps/backend/modules/gemini.mjs`
- **Supported languages:** English, Hindi (`hi-IN`), Telugu (`te-IN`)
- **Voice config:** Adjust voice names/gender in `apps/backend/modules/google-tts.mjs`
- **JWT expiry:** Change `JWT_EXPIRES_IN` in `.env` (e.g. `7d`, `24h`, `30d`)

---

## References

- [Google Gemini](https://ai.google.dev/)
- [Google Cloud TTS](https://cloud.google.com/text-to-speech)
- [MongoDB](https://www.mongodb.com/)
- [Rhubarb Lip-Sync](https://github.com/DanielSWolf/rhubarb-lip-sync)
- [Three.js](https://threejs.org/)
- [React](https://reactjs.org/)
- [Ready Player Me](https://readyplayer.me/)
- [Mixamo](https://www.mixamo.com/)
