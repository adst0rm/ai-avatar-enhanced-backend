

# Virtual Educator Backend

An AI-powered virtual educator backend that provides interactive learning experiences with speech synthesis and lip-sync animation.

![Video Thumbnail](https://img.youtube.com/vi/EzzcEL_1o9o/maxresdefault.jpg)

[Video tutorial](https://youtu.be/EzzcEL_1o9o)

The frontend is [here](https://github.com/wass08/r3f-virtual-girlfriend-frontend).

## Features
- 🤖 AI-powered educational responses using OpenAI GPT
- 🎤 Text-to-speech with natural voice synthesis via ElevenLabs
- 💬 Interactive conversational learning
- 🎭 Animated responses with facial expressions
- 📚 Personalized educational content delivery

## Setup
Create a `.env` file at the root of the repository to add your **OpenAI** and **ElevenLabs API Keys**. Refer to `.env.example` for the environment variable names.

Download the **RhubarbLibrary** binary for your **OS** [here](https://github.com/DanielSWolf/rhubarb-lip-sync/releases) and put it in your `bin` folder. `rhubarb` executable should be accessible through `bin/rhubarb`.

Start the development server with
```
yarn
yarn dev
```

## API Endpoints

### `GET /`
Basic health check endpoint
- Returns: "Hello World!"

### `GET /voices`
Get available ElevenLabs voices
- Returns: List of available voices with their IDs and descriptions

### `POST /chat`
Main educational chat endpoint
- **Body**: `{ "message": "Your question here" }`
- **Returns**: Educational response with audio, lip-sync data, and animations
- **Features**: 
  - AI-generated educational content
  - Text-to-speech audio (base64 encoded)
  - Lip-sync animation data
  - Facial expressions and animations

**Example Request:**
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Can you explain photosynthesis?"}'
```
