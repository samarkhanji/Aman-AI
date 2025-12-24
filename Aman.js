require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());

// Stats for Web View
let stats = { requests: 0, tokens: 0, lastModel: "None" };

const models = [
    "google/gemini-2.0-flash-exp:free",
    "xiaomi/mimo-v2-flash:free",
    "tng/deepseek-r1t2-chimera:free" // Mera suggested model (Roleplay/Roast specialist)
];

const systemPrompt = "Aapka naam Cheeku hai, Owner Aman Khan (A K) hain. Short, smart aur funny replies dein. Faltu explanation na dein. Zarurat padne par roast ya jokes ka use karein.";

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API for Bot to call
app.get('/chat', async (req, res) => {
    const prompt = req.query.prompt;
    if (!prompt) return res.json({ error: "Prompt missing" });

    const randomModel = models[Math.floor(Math.random() * models.length)];
    
    try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: randomModel,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ]
        }, {
            headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}` }
        });

        stats.requests++;
        stats.tokens += response.data.usage.total_tokens;
        stats.lastModel = randomModel;

        res.json({ reply: response.data.choices[0].message.content, model: randomModel });
    } catch (error) {
        res.json({ error: "API Error" });
    }
});

// Stats API for HTML
app.get('/stats', (req, res) => res.json(stats));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Aman-AI running on ${PORT}`));
