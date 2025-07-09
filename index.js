import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { promises as fs } from "fs";
import multer from "multer";
import OpenAI from "openai";
import path from "path";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "-", // Your OpenAI API key here, I used "-" to avoid errors when the key is not set but you should not do that
});

const openaiTTSVoice = "nova"; // OpenAI TTS voices: alloy, echo, fable, onyx, nova, shimmer

// Configure multer for audio file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (Whisper API limit)
  }
});

const app = express();
app.use(express.json());
app.use(cors());
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/voices", async (req, res) => {
  const openaiVoices = [
    { voice_id: "alloy", name: "Alloy", category: "premade" },
    { voice_id: "echo", name: "Echo", category: "premade" },
    { voice_id: "fable", name: "Fable", category: "premade" },
    { voice_id: "onyx", name: "Onyx", category: "premade" },
    { voice_id: "nova", name: "Nova", category: "premade" },
    { voice_id: "shimmer", name: "Shimmer", category: "premade" }
  ];
  res.send({ voices: openaiVoices });
});

const generateOpenAITTS = async (text, outputPath, language = "auto") => {
  try {
    console.log(`Generating TTS for language: ${language}, text: ${text.substring(0, 50)}...`);

    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts", // or "tts-1-hd" for higher quality
      voice: openaiTTSVoice,
      input: text,
      // Note: OpenAI TTS automatically detects language from text content
      // No need for explicit language parameter as it's smart enough to detect Kazakh, Russian, etc.
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
    console.log(`TTS audio generated in detected language: ${outputPath}`);
  } catch (error) {
    console.error("Error generating TTS:", error);
    throw error;
  }
};

const generateOpenAISTT = async (audioFilePath, language = "auto") => {
  try {
    console.log(`Starting STT transcription for: ${audioFilePath}`);

    const transcription = await openai.audio.transcriptions.create({
      file: await fs.readFile(audioFilePath),
      model: "gpt-4o-transcribe",
      language: language === "auto" ? undefined : language, // Let Whisper auto-detect if "auto"
      response_format: "verbose_json", // Get detailed response with timestamps
      timestamp_granularities: ["word"], // Get word-level timestamps
    });

    console.log(`STT transcription completed: ${transcription.text}`);
    return {
      text: transcription.text,
      language: transcription.language,
      duration: transcription.duration,
      words: transcription.words || []
    };
  } catch (error) {
    console.error("Error generating STT:", error);
    throw error;
  }
};

// New endpoint for speech-to-text transcription
app.post("/transcribe", upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    if (openai.apiKey === "-") {
      return res.status(400).json({
        error: "OpenAI API key not configured. Please add your API key to the .env file."
      });
    }

    const audioFilePath = req.file.path;
    const language = req.body.language || "auto"; // Default to auto-detect, can specify "kk" for Kazakh

    console.log(`Received audio file: ${req.file.originalname}, language: ${language}`);

    // Transcribe the audio using OpenAI Whisper
    const transcriptionResult = await generateOpenAISTT(audioFilePath, language);

    // Clean up uploaded file
    await fs.unlink(audioFilePath);

    res.json({
      success: true,
      transcription: transcriptionResult.text,
      language: transcriptionResult.language,
      duration: transcriptionResult.duration,
      words: transcriptionResult.words,
      detectedLanguage: transcriptionResult.language
    });

  } catch (error) {
    console.error("Transcription error:", error);

    // Clean up uploaded file in case of error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error("Error cleaning up file:", unlinkError);
      }
    }

    res.status(500).json({
      error: "Failed to transcribe audio",
      details: error.message
    });
  }
});

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const lipSyncMessage = async (message) => {
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${message}`);
  await execCommand(
    `ffmpeg -y -i audios/message_${message}.mp3 audios/message_${message}.wav`
    // -y to overwrite the file
  );
  console.log(`Conversion done in ${new Date().getTime() - time}ms`);

  // Create mock lip sync data (temporary fix until Rhubarb is installed)
  const mockLipSync = {
    metadata: {
      soundFile: `audios/message_${message}.wav`,
      duration: 2.0
    },
    mouthCues: [
      { start: 0.0, end: 0.5, value: "X" },
      { start: 0.5, end: 1.0, value: "A" },
      { start: 1.0, end: 1.5, value: "B" },
      { start: 1.5, end: 2.0, value: "X" }
    ]
  };

  await fs.writeFile(`audios/message_${message}.json`, JSON.stringify(mockLipSync, null, 2));
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

// Enhanced chat endpoint with full Kazakh language support
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  const messageLanguage = req.body.language || "en"; // Language hint from transcription

  console.log(`Chat request - Language: ${messageLanguage}, Message: ${userMessage}`);

  if (!userMessage) {
    res.send({
      messages: [
        {
          text: "Hey dear... How was your day?",
          audio: await audioFileToBase64("audios/intro_0.wav"),
          lipsync: await readJsonTranscript("audios/intro_0.json"),
          facialExpression: "smile",
          animation: "Talking_1",
        },
        {
          text: "I missed you so much... Please don't go for so long!",
          audio: await audioFileToBase64("audios/intro_1.wav"),
          lipsync: await readJsonTranscript("audios/intro_1.json"),
          facialExpression: "sad",
          animation: "Crying",
        },
      ],
    });
    return;
  }

  if (openai.apiKey === "-") {
    res.send({
      messages: [
        {
          text: "Please my dear, don't forget to add your OpenAI API key!",
          audio: await audioFileToBase64("audios/api_0.wav"),
          lipsync: await readJsonTranscript("audios/api_0.json"),
          facialExpression: "angry",
          animation: "Angry",
        },
        {
          text: "You don't want to ruin your OpenAI API budget, right?",
          audio: await audioFileToBase64("audios/api_1.wav"),
          lipsync: await readJsonTranscript("audios/api_1.json"),
          facialExpression: "smile",
          animation: "Laughing",
        },
      ],
    });
    return;
  }

  // Enhanced system prompt with specific Kazakh language instructions
  let systemPrompt = `
        You are a virtual educator and teacher who provides comprehensive, detailed, and engaging educational responses.
        You will always reply with a JSON array of messages. With a maximum of 3 messages.
        Each message has a text, facialExpression, and animation property.
        The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
        The different animations are: Talking_0, Talking_1, Talking_2, Crying, Laughing, Rumba, Idle, Terrified, and Angry.
        
        IMPORTANT GUIDELINES:
        - Provide detailed explanations and comprehensive answers
        - Each message should be substantial and informative (aim for 3-5 sentences minimum)
        - Use examples, analogies, and practical applications when explaining concepts
        - Be thorough in your explanations while remaining engaging and conversational
        - Break complex topics into digestible parts across the 3 messages
        - Show enthusiasm for teaching and learning
        - Ask follow-up questions to encourage continued learning
        `;

  // Language-specific instructions for natural responses
  if (messageLanguage === "kk" || messageLanguage === "kazakh") {
    systemPrompt += `
        
        ВАЖНО: Отвечай ТОЛЬКО на казахском языке (қазақ тілінде жауап бер).
        Используй естественный казахский язык с правильной грамматикой.
        Будь образовательным и полезным учителем.
        Примеры фраз: "Сәлем!", "Түсіндің бе?", "Жақсы сұрақ!", "Қалай ойлайсың?"
        `;
  } else if (messageLanguage === "ru" || messageLanguage === "russian") {
    systemPrompt += `
        
        ВАЖНО: Отвечай ТОЛЬКО на русском языке.
        Используй естественный русский язык с правильной грамматикой.
        Будь образовательным и полезным учителем.
        `;
  } else {
    systemPrompt += `
        
        IMPORTANT: Respond ONLY in English language.
        Use natural English with proper grammar.
        Be educational, helpful, and engaging in your responses.
        `;
  }

  console.log(`Using language-specific system prompt for: ${messageLanguage}`);

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-1106",
    max_tokens: 1000,
    temperature: 0.6,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userMessage || "Hello",
      },
    ],
  });

  let messages = JSON.parse(completion.choices[0].message.content);
  if (messages.messages) {
    messages = messages.messages; // ChatGPT is not 100% reliable, sometimes it directly returns an array and sometimes a JSON object with a messages property
  }

  console.log(`Generated ${messages.length} messages in ${messageLanguage}`);

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const fileName = `audios/message_${i}.mp3`;
    const textInput = message.text;

    console.log(`Generating TTS for message ${i}: "${textInput.substring(0, 30)}..." in language: ${messageLanguage}`);

    // Generate audio with language information for better TTS quality
    await generateOpenAITTS(textInput, fileName, messageLanguage);

    // Generate lipsync
    await lipSyncMessage(i);

    message.audio = await audioFileToBase64(fileName);
    message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);

    // Add language metadata to response
    message.language = messageLanguage;
    message.detectedLanguage = messageLanguage;
  }

  console.log(`Chat response completed for language: ${messageLanguage}`);
  res.send({
    messages,
    detectedLanguage: messageLanguage,
    responseLanguage: messageLanguage
  });
});

const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

// New endpoint for seamless voice-to-voice interaction
app.post("/voice-chat", upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    if (openai.apiKey === "-") {
      return res.status(400).json({
        error: "OpenAI API key not configured. Please add your API key to the .env file."
      });
    }

    const audioFilePath = req.file.path;
    const preferredLanguage = req.body.language || "auto";

    console.log(`Voice chat request - Audio: ${req.file.originalname}, Preferred language: ${preferredLanguage}`);

    // Step 1: Transcribe the audio
    const transcriptionResult = await generateOpenAISTT(audioFilePath, preferredLanguage);

    console.log(`Transcribed (${transcriptionResult.language}): ${transcriptionResult.text}`);

    // Step 2: Generate educational response in the same language
    const chatResponse = await fetch(`http://localhost:${port}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: transcriptionResult.text,
        language: transcriptionResult.language
      })
    });

    const chatResult = await chatResponse.json();

    // Clean up uploaded file
    await fs.unlink(audioFilePath);

    // Return complete voice-to-voice response
    res.json({
      success: true,
      transcription: {
        text: transcriptionResult.text,
        language: transcriptionResult.language,
        duration: transcriptionResult.duration,
        words: transcriptionResult.words
      },
      response: chatResult,
      detectedLanguage: transcriptionResult.language,
      flow: "voice-to-voice"
    });

  } catch (error) {
    console.error("Voice chat error:", error);

    // Clean up uploaded file in case of error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error("Error cleaning up file:", unlinkError);
      }
    }

    res.status(500).json({
      error: "Failed to process voice chat",
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Virtual Educator listening on port ${port}`);
});
