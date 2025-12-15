import express from "express";
import dotenv from "dotenv";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { OpenAI } from "openai";

dotenv.config();
const router = express.Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ttsClient = new TextToSpeechClient({
    credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS),
});

const CHUNK_SIZE = 150;

function chunkText(text) {
    return text.match(new RegExp(`.{1,${CHUNK_SIZE}}(\\s|$)`, 'g')) || [];
}

router.post("/text", async (req, res) => {
    try {
        const { text } = req.body;

        if (!text?.trim()) {
            return res.status(400).json({ error: "Text is required" });
        }

        const prompt = `I am developing an AI interview coaching application.
        this is user response from voice input: "${text}",
        you are sofia, an interview coach with a friendly and professional tone.
        please response that "this feature is working perfectly" in professionally maximum 60 words.
        `;

        const chatgptResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3
        });

        const messageContent = chatgptResponse.choices[0].message.content.trim();
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Transfer-Encoding", "chunked");

        const chunks = chunkText(messageContent);

        for (const chunk of chunks) {
            const [response] = await ttsClient.synthesizeSpeech({
                input: { text: chunk },
                voice: { languageCode: "en-US", name: "en-US-Chirp3-HD-Leda" },
                audioConfig: { audioEncoding: "MP3" },
            });
            res.write(response.audioContent);
        }

        res.end();
    } catch (err) {
        console.error("Error:", err.message);
        res.status(500).json({ error: "Failed to convert text to speech" });
    }
});

export default router;
