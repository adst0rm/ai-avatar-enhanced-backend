# Virtual Educator Backend

An AI-powered virtual educator backend that provides interactive learning experiences with speech synthesis, speech recognition, and lip-sync animation.

The frontend is [here](https://github.com/adst0rm/ai-avatar-enhanced).

## Features
- 🤖 AI-powered educational responses using OpenAI GPT
- 🎤 **Text-to-speech** with natural voice synthesis via OpenAI TTS
- 🎧 **Speech-to-text** recognition using OpenAI Whisper (NEW!)
- 🌍 **Multi-language support including Kazakh** (99+ languages supported)
- 💬 Interactive conversational learning with voice input
- 🎭 Animated responses with facial expressions
- 📚 Personalized educational content delivery

## Language Support
### Text-to-Speech (OpenAI TTS)
OpenAI TTS supports **57 languages** including:
- **Kazakh (Kazakhstan)** ✅
- English, Spanish, French, German, Russian
- Arabic, Chinese, Japanese, Korean
- And many more!

### Speech-to-Text (OpenAI Whisper)
OpenAI Whisper supports **99 languages** including:
- **Kazakh (kk)** ✅  
- English, Spanish, French, German, Russian
- Arabic, Chinese, Japanese, Korean
- And 90+ more languages!

## Setup
Create a `.env` file at the root of the repository to add your **OpenAI API Key**. Refer to `.env.example` for the environment variable names.

**Note:** Only OpenAI API key is required for both TTS and STT functionality.

Download the **RhubarbLibrary** binary for your **OS** [here](https://github.com/DanielSWolf/rhubarb-lip-sync/releases) and put it in your `bin` folder. `rhubarb` executable should be accessible through `bin/rhubarb`.

Start the development server with
```
npm install
npm run dev
```

## Voice Configuration
OpenAI TTS provides 6 preset voices:
- **alloy** - Neutral and balanced
- **echo** - Clear and expressive  
- **fable** - Warm and engaging
- **onyx** - Deep and authoritative
- **nova** - Bright and cheerful (default)
- **shimmer** - Gentle and soothing

You can change the voice by modifying the `openaiTTSVoice` variable in `index.js`.

## API Endpoints

### `GET /`
Basic health check endpoint
- Returns: "Hello World!"

### `GET /voices`
Get available OpenAI TTS voices
- Returns: List of available voices with their IDs and descriptions

### `POST /transcribe` ⭐ NEW!
Speech-to-text transcription endpoint
- **Content-Type**: `multipart/form-data`
- **Body**: 
  - `audio`: Audio file (mp3, wav, m4a, etc.) - Max 25MB
  - `language`: Language code (optional, defaults to "auto")
    - Use `"kk"` for Kazakh
    - Use `"auto"` for automatic language detection
- **Returns**: Transcribed text with language detection and word timestamps

**Example Request (Kazakh):**
```bash
curl -X POST http://localhost:3000/transcribe \
  -F "audio=@kazakh_speech.wav" \
  -F "language=kk"
```

**Example Response:**
```json
{
  "success": true,
  "transcription": "Сәлем! Мен бүгін математика туралы сұрағым бар.",
  "language": "kk",
  "duration": 3.2,
  "words": [
    {"word": "Сәлем!", "start": 0.0, "end": 0.8},
    {"word": "Мен", "start": 0.9, "end": 1.1}
  ],
  "detectedLanguage": "kk"
}
```

### `POST /chat`
Enhanced educational chat endpoint with multi-language support
- **Body**: `{ "message": "Your question here", "language": "kk" }`
- **Returns**: Educational response with audio, lip-sync data, and animations
- **Features**: 
  - AI-generated educational content
  - Text-to-speech audio (base64 encoded) supporting Kazakh and 56 other languages
  - Lip-sync animation data
  - Facial expressions and animations
  - Multi-language responses (English, Kazakh, Russian)

**Example Request (English):**
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Can you explain photosynthesis?", "language": "en"}'
```

**Example Request (Kazakh):**
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Фотосинтез туралы түсіндіре аласыз ба?", "language": "kk"}'
```

## Voice Recognition Workflow

1. **Record Audio**: User records voice message in Kazakh or any supported language
2. **Upload to `/transcribe`**: Send audio file to transcription endpoint
3. **Get Text**: Receive transcribed text with language detection
4. **Send to `/chat`**: Use transcribed text as message input with language hint
5. **Get Response**: Receive educational audio response in the same language

**Complete Example (JavaScript):**
```javascript
// Step 1: Transcribe audio
const formData = new FormData();
formData.append('audio', audioFile);
formData.append('language', 'kk'); // Kazakh

const transcribeResponse = await fetch('/transcribe', {
  method: 'POST',
  body: formData
});
const { transcription, detectedLanguage } = await transcribeResponse.json();

// Step 2: Get educational response
const chatResponse = await fetch('/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    message: transcription, 
    language: detectedLanguage 
  })
});
const { messages } = await chatResponse.json();
```

## Supported Audio Formats
- **WAV** (recommended for best quality)
- **MP3** 
- **M4A**
- **FLAC**
- **OGG**
- **WEBM**
- Maximum file size: **25MB**

## File Structure
```
├── audios/           # Pre-recorded audio files and generated responses
├── uploads/          # Temporary storage for uploaded audio files
├── index.js          # Main server file with TTS and STT endpoints
├── package.json      # Dependencies including multer for file uploads
└── README.md         # This file
```
