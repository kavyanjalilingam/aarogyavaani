Project Structure
AarogyaVaani/
├── server.ts              # Backend (Express APIs)
├── src/
│   ├── App.tsx            # Main React UI
│   ├── main.tsx           # Entry point
│   └── index.css          # Styling
├── package.json
├── vite.config.ts
└── .env
⚙️ Setup Instructions
1️⃣ Clone Repository
git clone https://github.com/kavyanjalilingam/aarogyavaani.git
cd aarogyavaani
2️⃣ Install Dependencies
npm install
3️⃣ Setup Ollama (IMPORTANT)

Make sure you have Ollama installed and running:

ollama run mistral

or

ollama run phi3

Ensure Ollama is running on:

http://localhost:11434
4️⃣ Run Backend
npm run server
5️⃣ Run Frontend
npm run dev
6️⃣ Open App
http://localhost:3000
🔌 API Endpoints
✅ Working
Endpoint	Method	Description
/api/health	GET	Server status
/api/chat-enhanced	POST	Main AI chat
/api/search-facilities	POST	Hospital search
/api/ocr	POST	Prescription OCR
/api/translate	POST	Translation
/api/detect-language	POST	Language detection
❌ Missing (Phase 2)
Endpoint	Purpose
/api/transcribe	Speech-to-Text
/api/tts	Text-to-Speech
/api/specialist	Doctor recommendation
