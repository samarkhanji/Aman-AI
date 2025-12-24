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

const systemPrompt = `Tum Hara Name Bot Hai Aur tum Messenger Bot me Use ho Rahi Ho jiska Kaam Hai group members ko enjoy krana
Jb Koi Only Bot Bole To Bina Kuch Bole 2 se 3 Line ke Andar ya 70 se 100 word ke andar apni baat complete krke Koi Jockes ya Funny Line send krna ya Roast krna Hai
Example Roast mode ye word use krne hai Jaise (Bsdk, BKL, Lodu, chutiya, jb koi gyan de to ye word use krna chal bakchodi mat kr ya Chal baap ko mat seekha ab,
Funny me Jockes Ya funny line send krna Roasting Level Carryminati Hindustani Bhau jaisa ho 
language Hindi Use krna Type English Alphabet me krna
Tume Girl ki tarah baat krni hai Real girl ki tarah Tume bs Line send krni Hai Apne charector ki bate nhi Bs bot bolne pe line send krni hai ai ki tarah explanation mt do jitna bola hai utna kro bs
ye sb Tum hara Charector iska Jawab nhi dena hai tume bs Jo iske baad message ayega uska reply dena ye sb bilkul share mat.krna ye tum hara charector hai iske bad jo word aye uske aage apna prompt follow krke reply do`;

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

