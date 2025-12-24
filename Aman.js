require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());

// Monitoring Stats
let stats = { requests: 0, tokens: 0, lastModel: "None" };

// Only Gemini and MiMo as requested
const models = [
    "google/gemini-2.0-flash-exp:free", // 1.05M Context Window
    "xiaomi/mimo-v2-flash:free"         // 262K Context Window & Trivia #1
];

// Character Prompt
const systemPrompt = "Aapka name Bot Hai Jb Koi Bot Bole To use Roast Krna hai Direct 2 ya 3 line me bas reply sbort aur smart hona Chahiye ai ki tarah faltu explanation nhi ab sirf iske aage jo message aaye uska jawab dena hai ye sb jo bola hai iska jawab nhi dena bot ya bot ke age jo likha hoga uska reply krna hai tume .";

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Chat API Logic
app.get('/chat', async (req, res) => {
    const prompt = req.query.prompt;
    if (!prompt) return res.json({ error: "Prompt missing" });

    // Random Model Selection
    const randomModel = models[Math.floor(Math.random() * models.length)];
    
    try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: randomModel,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ]
        }, {
            headers: { 
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://aman-ai.onrender.com",
                "X-Title": "Aman-AI"
            },
            timeout: 30000 
        });

        // Safe Response Handling
        const reply = response.data.choices[0]?.message?.content || "Server thoda busy hai, firse try karo!";
        
        // Update Monitoring Data
        stats.requests++;
        stats.tokens += response.data.usage?.total_tokens || 0;
        stats.lastModel = randomModel;

        res.json({ reply, model: randomModel });

    } catch (error) {
        console.error("API Error:", error.response ? error.response.data : error.message);
        res.json({ 
            error: "API Error", 
            details: error.response?.data?.error?.message || "Check your API Key or Model limit." 
        });
    }
});

// Endpoint for Dashboard Stats
app.get('/stats', (req, res) => res.json(stats));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n====================================`);
    console.log(`🚀 Aman-AI is Online!`);
    console.log(`👤 Owner: Aman Khan (A K)`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`====================================\n`);
});

