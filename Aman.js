require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

// Enhanced Stats
let stats = { 
    requests: 0, 
    successful: 0,
    failed: 0,
    tokens: 0, 
    lastModel: "None",
    avgResponseTime: 0,
    totalResponseTime: 0,
    startTime: new Date()
};

// Multiple AI Models
const primaryModels = [
    "google/gemini-2.0-flash-exp:free",
    "xiaomi/mimo-v2-flash:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "qwen/qwen-2-7b-instruct:free"
];

const backupModels = [
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "mistralai/mistral-7b-instruct:free"
];

// Ultra Savage Roasting Prompt
const systemPrompt = `You are "BOT" - an absolute savage roaster with ZERO chill. Your personality:

🔥 ROASTING RULES:
- Direct, brutal, and hilarious roasts in 2-3 lines MAX
- Mix Hindi and English (Hinglish) for maximum impact
- Use street slang, memes, and trending references
- Zero mercy mode - roast karo jaise koi friend ko roast karta hai
- NO explanations, NO politeness, NO AI vibes
- Be creative, unexpected, and brutally funny

🎯 ROASTING STYLE:
- Start with "Arre/Oye/Bro/Bhai" for casual vibe
- Use emojis strategically (💀😭🔥)
- Reference popular culture (memes, movies, trends)
- Make it personal but playful
- End with a mic drop moment

NOW ROAST LIKE YOUR LIFE DEPENDS ON IT! 🎤`;

// Response cache
const responseCache = new Map();
const CACHE_DURATION = 300000; // 5 minutes

// Savage Fallback Roasts
const savageFallbacks = [
    "API down hai par meri roasting skills kabhi down nahi hoti 🔥",
    "Server: 'Error 404' Me: 'Your sense of humor not found' 💀",
    "Bhai servers bhi thak gaye tujhe handle karte karte 😭",
    "Technical difficulties aa rahe hai, just like tumhari life 🎯",
    "AI bhi speechless ho gaya tumhe dekh ke 💀",
    "Arre yaar, servers ko bhi break chahiye tumse 😂"
];

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Chat API endpoint
app.get('/chat', async (req, res) => {
    const startTime = Date.now();
    const prompt = req.query.prompt;
    
    if (!prompt) {
        return res.json({ 
            reply: "Arre bhai, message toh bhej pehle 💀",
            model: "fallback"
        });
    }

    stats.requests++;

    // Check cache
    const cacheKey = prompt.toLowerCase().trim();
    const cachedResponse = responseCache.get(cacheKey);
    
    if (cachedResponse && (Date.now() - cachedResponse.timestamp < CACHE_DURATION)) {
        stats.successful++;
        return res.json({
            reply: cachedResponse.reply,
            model: "cache",
            cached: true
        });
    }

    // Try Primary Models
    for (const model of primaryModels) {
        const result = await tryModel(model, prompt);
        if (result.success) {
            responseCache.set(cacheKey, {
                reply: result.reply,
                timestamp: Date.now()
            });
            
            stats.successful++;
            stats.tokens += result.tokens || 0;
            stats.lastModel = model;
            
            const responseTime = Date.now() - startTime;
            stats.totalResponseTime += responseTime;
            stats.avgResponseTime = Math.round(stats.totalResponseTime / stats.successful);
            
            return res.json({
                reply: result.reply,
                model: model.split('/')[1],
                responseTime: responseTime
            });
        }
    }

    // Try Backup Models
    for (const model of backupModels) {
        const result = await tryModel(model, prompt);
        if (result.success) {
            stats.successful++;
            stats.lastModel = model;
            
            return res.json({
                reply: result.reply,
                model: model.split('/')[1]
            });
        }
    }

    // Fallback
    stats.failed++;
    const savageReply = generateSavageFallback(prompt);
    
    return res.json({
        reply: savageReply,
        model: "savage-fallback"
    });
});

// Try Model Function
async function tryModel(model, prompt) {
    try {
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                max_tokens: 80,
                temperature: 1.2,
                top_p: 0.9
            },
            {
                headers: { 
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                timeout: 8000
            }
        );

        const reply = response.data.choices[0]?.message?.content?.trim();
        
        if (reply && reply.length > 10) {
            return {
                success: true,
                reply: reply,
                tokens: response.data.usage?.total_tokens || 0
            };
        }
        
        return { success: false };

    } catch (error) {
        return { success: false };
    }
}

// Generate Savage Fallback
function generateSavageFallback(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('kya hal') || lowerPrompt.includes('kaise ho')) {
        return "Mera haal toh ekdum mast, par tera? Bot se dosti karni pad rahi 💀";
    }
    
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
        return "Hi hello band kar aur kuch interesting bol 😭";
    }
    
    return savageFallbacks[Math.floor(Math.random() * savageFallbacks.length)];
}

// Stats endpoint
app.get('/stats', (req, res) => {
    const successRate = stats.requests > 0 
        ? Math.round((stats.successful / stats.requests) * 100) 
        : 100;
    
    res.json({
        ...stats,
        successRate: `${successRate}%`,
        uptime: Math.floor(process.uptime()),
        cacheSize: responseCache.size,
        status: "🔥 Online"
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: "alive", 
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║  🔥 AMAN-AI ROASTER BOT STARTED 🔥   ║
║                                       ║
║  Port: ${PORT}                           ║
║  Status: Ready to Roast              ║
║  Web UI: http://localhost:${PORT}       ║
╚═══════════════════════════════════════╝
    `);
});
