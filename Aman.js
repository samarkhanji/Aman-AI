require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());

// Stats Monitoring
let stats = { requests: 0, tokens: 0, lastModel: "None" };

// Models from your images
const models = [
    "google/gemini-2.0-flash-exp:free", // 1.05M Context
];

const systemPrompt = "Aapka naam Bot Hai Jb Koi Bole to Short aur smart reply dena sirf 2 ya 3 line ka Funny ya Roast samne wale ko roast krna ya Hai funny message bhejna bina kuch bole agr bot ke baad kuch likha hai to fir uska reply dena roast mode roast krna hai Dark noughty funny type ai ki tarah faltu explanation nhi only 2 ya 3 line ka message aur real humans girl ki tarah reply krna  .";

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Main Chat API
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
                "HTTP-Referer": "https://aman-ai.onrender.com", // Required by some OpenRouter models
                "X-Title": "Aman-AI"
            },
            timeout: 30000 // 30 seconds timeout
        });

        // Fixing the "undefined" error by checking all possible response paths
        const reply = response.data.choices[0]?.message?.content || response.data.choices[0]?.text || "Maaf karna, main samajh nahi paaya.";
        
        // Update Stats
        stats.requests++;
        stats.tokens += response.data.usage?.total_tokens || 0;
        stats.lastModel = randomModel;

        res.json({ reply, model: randomModel });

    } catch (error) {
        console.error("Error Detail:", error.response ? error.response.data : error.message);
        res.json({ 
            error: "API Error", 
            details: error.response?.data?.error?.message || error.message 
        });
    }
});

// Stats API for Web View
app.get('/stats', (req, res) => res.json(stats));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`★ Aman-AI is Live on Port ${PORT} ★`);
});

