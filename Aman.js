require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// Stats
let stats = { requests: 0, successful: 0, failed: 0, tokens: 0, lastModel: "None" };

// Keys Setup (Aapke logic ke hisaab se)
const tier1_Keys = [process.env.OR_KEY_1, process.env.OR_KEY_2, process.env.OR_KEY_3, process.env.OR_KEY_4];
const tier2_Keys = [process.env.OR_KEY_5, process.env.OR_KEY_6]; // Backup Keys

const systemPrompt = `Aapka name Bot Hai. Jb Koi Bot Bole To use Roast Krna hai Direct 2 ya 3 line me bas reply short aur smart hona Chahiye... (Savage Character Build)`;

// Helper Function for Parallel Call
const callAPI = (key, model, prompt) => {
    return axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model: model,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 1.1
    }, {
        headers: { "Authorization": `Bearer ${key}` },
        timeout: 10000
    });
};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// --- AAPKA NAYA ENDPOINT: /aman ---
app.get('/aman', async (req, res) => {
    const prompt = req.query.prompt;
    if (!prompt) return res.json({ reply: "Oye, message toh bhej pehle 💀" });

    stats.requests++;

    try {
        // --- TIER 1: THE RACE (4 Keys Parallel) ---
        // 2 Gemini + 2 MiMo models racing together
        const raceTasks = [
            callAPI(tier1_Keys[0], "google/gemini-2.0-flash-exp:free", prompt),
            callAPI(tier1_Keys[1], "google/gemini-2.0-flash-exp:free", prompt),
            callAPI(tier1_Keys[2], "xiaomi/mimo-v2-flash:free", prompt),
            callAPI(tier1_Keys[3], "xiaomi/mimo-v2-flash:free", prompt)
        ];

        // Promise.any takes the FIRST successful response
        const winner = await Promise.any(raceTasks);
        
        const reply = winner.data.choices[0].message.content;
        updateStats(winner.data, winner.config.data);
        return res.json({ reply, model: JSON.parse(winner.config.data).model, status: "Tier 1 Winner" });

    } catch (error) {
        console.log("Tier 1 Failed, moving to Tier 2 Backup...");

        // --- TIER 2: BACKUP (2 Keys) ---
        try {
            const backupTasks = [
                callAPI(tier2_Keys[0], "openai/gpt-oss-120b:free", prompt),
                callAPI(tier2_Keys[1], "google/gemini-2.0-flash-exp:free", prompt)
            ];

            const backupWinner = await Promise.any(backupTasks);
            const reply = backupWinner.data.choices[0].message.content;
            updateStats(backupWinner.data, backupWinner.config.data);
            return res.json({ reply, model: JSON.parse(backupWinner.config.data).model, status: "Tier 2 Backup" });

        } catch (backupError) {
            stats.failed++;
            res.json({ reply: "Bhai mera system hi phat gaya tera face dekh ke! 💀 (All keys failed)", model: "error" });
        }
    }
});

function updateStats(data, configData) {
    stats.successful++;
    stats.tokens += data.usage?.total_tokens || 0;
    stats.lastModel = JSON.parse(configData).model;
}

app.get('/stats', (req, res) => res.json(stats));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 Aman-AI Roaster Live on /aman`));

