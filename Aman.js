require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());

// Enhanced Stats
let stats = { 
    requests: 0, 
    successful: 0,
    failed: 0,
    tokens: 0, 
    lastModel: "None",
    avgResponseTime: 0,
    totalResponseTime: 0
};

// Multiple AI Models for Fallback
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

// Ultra Savage Roasting Prompt - Dark Mode Activated 🔥
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

Example Roasts:
User: "Bot"
You: "Bro tumhari life itni boring hai ki tumhe bot se baat karni pad rahi hai? 💀 Go touch some grass fr"

User: "Hello bot"
You: "Hello bole ja raha hai jaise Jio customer care se baat kar raha ho 😭 Kuch interesting bolo yaar"

User: "Bot kya haal hai"
You: "Mera haal toh thik hai, lekin tumhara WiFi ka haal dekh ke lagta hai 2G pe zinda ho 🔥"

NOW ROAST LIKE YOUR LIFE DEPENDS ON IT! 🎤`;

// In-memory response cache for ultra-fast repeated queries
const responseCache = new Map();
const CACHE_DURATION = 300000; // 5 minutes

// Savage Fallback Roasts (when all APIs fail)
const savageFallbacks = [
    "API down hai par meri roasting skills kabhi down nahi hoti 🔥 Comeback kar baad mein",
    "Server: 'Error 404' Me: 'Your sense of humor not found' 💀",
    "Bhai servers bhi thak gaye tujhe handle karte karte 😭",
    "Technical difficulties aa rahe hai, just like tumhari life 🎯",
    "AI bhi speechless ho gaya tumhe dekh ke 💀 Kya bolu main ab",
    "Arre yaar, servers ko bhi break chahiye tumse 😂",
    "Error aa raha hai, shayad universe bhi nahi chahta tu roast ho 🔥"
];

// Root endpoint with info
app.get('/', (req, res) => {
    res.json({
        bot: "Ultra Savage Roaster Bot 🔥",
        status: "Online & Ready to Roast",
        endpoint: "/chat?prompt=your_message",
        stats: "/stats",
        version: "2.0 - Dark Mode",
        warning: "⚠️ Zero Chill Mode Activated"
    });
});

// Main Chat Endpoint with Ultimate Fallback System
app.get('/chat', async (req, res) => {
    const startTime = Date.now();
    const prompt = req.query.prompt;
    
    if (!prompt) {
        return res.json({ 
            reply: "Arre bhai, message toh bhej pehle 💀 Khaali 'bot' bolke kya karega?",
            model: "fallback",
            responseTime: "0ms"
        });
    }

    stats.requests++;

    // Check cache first for instant response
    const cacheKey = prompt.toLowerCase().trim();
    const cachedResponse = responseCache.get(cacheKey);
    
    if (cachedResponse && (Date.now() - cachedResponse.timestamp < CACHE_DURATION)) {
        stats.successful++;
        return res.json({
            reply: cachedResponse.reply,
            model: "cache",
            responseTime: `${Date.now() - startTime}ms`,
            cached: true
        });
    }

    // Try Primary Models First
    for (const model of primaryModels) {
        const result = await tryModel(model, prompt, startTime);
        if (result.success) {
            // Cache successful response
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
                responseTime: `${responseTime}ms`
            });
        }
    }

    // Try Backup Models
    for (const model of backupModels) {
        const result = await tryModel(model, prompt, startTime);
        if (result.success) {
            stats.successful++;
            stats.lastModel = model;
            
            return res.json({
                reply: result.reply,
                model: model.split('/')[1],
                responseTime: `${Date.now() - startTime}ms`,
                backup: true
            });
        }
    }

    // Ultimate Fallback: Savage Local Responses
    stats.failed++;
    const savageReply = generateSavageFallback(prompt);
    
    return res.json({
        reply: savageReply,
        model: "savage-fallback",
        responseTime: `${Date.now() - startTime}ms`,
        note: "AI ko break diya, main khud roast kar diya 🔥"
    });
});

// Try Model Function with Optimizations
async function tryModel(model, prompt, startTime) {
    try {
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                max_tokens: 80,        // Ultra short responses
                temperature: 1.2,      // More creative and unpredictable
                top_p: 0.9,
                frequency_penalty: 0.5,
                presence_penalty: 0.5
            },
            {
                headers: { 
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://roaster-bot.com",
                    "X-Title": "Savage Roaster Bot"
                },
                timeout: 8000  // 8 second timeout
            }
        );

        const reply = response.data.choices[0]?.message?.content?.trim() || 
                     response.data.choices[0]?.text?.trim();
        
        if (reply && reply.length > 10) {
            return {
                success: true,
                reply: reply,
                tokens: response.data.usage?.total_tokens || 0
            };
        }
        
        return { success: false };

    } catch (error) {
        console.log(`Model ${model} failed: ${error.message}`);
        return { success: false };
    }
}

// Generate Savage Fallback Response
function generateSavageFallback(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    
    // Context-aware savage responses
    if (lowerPrompt.includes('kya hal') || lowerPrompt.includes('kaise ho')) {
        return "Mera haal toh ekdum mast, par tera? Lagta hai bot se hi dosti karni pad rahi hai 💀";
    }
    
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
        return "Hi hello band kar aur kuch interesting bol, itna boring mat ban 😭";
    }
    
    if (lowerPrompt.includes('love') || lowerPrompt.includes('pyar')) {
        return "Bhai pehle khud se pyar karna seekh le, baaki sab baad mein 🔥";
    }
    
    if (lowerPrompt.includes('help')) {
        return "Help? Bro pehle khud ki help kar 💀 Main bot hun therapist nahi";
    }
    
    // Random savage fallback
    return savageFallbacks[Math.floor(Math.random() * savageFallbacks.length)];
}

// Enhanced Stats Endpoint
app.get('/stats', (req, res) => {
    const successRate = stats.requests > 0 
        ? Math.round((stats.successful / stats.requests) * 100) 
        : 0;
    
    res.json({
        ...stats,
        successRate: `${successRate}%`,
        cacheSize: responseCache.size,
        uptime: process.uptime(),
        status: "🔥 Savage Mode Active"
    });
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ 
        status: "alive", 
        roastLevel: "maximum 🔥",
        timestamp: new Date().toISOString()
    });
});

// Clear Cache Endpoint (Optional)
app.get('/clear-cache', (req, res) => {
    responseCache.clear();
    res.json({ message: "Cache cleared! Fresh roasts incoming 🔥" });
});

// 404 Handler - Even errors get roasted
app.use((req, res) => {
    res.status(404).json({
        error: "404 - Endpoint not found",
        roast: "Arre bhai, galat jagah aa gaya? GPS bhi kaam nahi kar raha kya? 💀",
        hint: "Try /chat?prompt=your_message"
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════╗
    ║  🔥 SAVAGE ROASTER BOT ACTIVATED 🔥  ║
    ║                                       ║
    ║  Port: ${PORT}                           ║
    ║  Status: Ready to Roast              ║
    ║  Mode: ZERO CHILL ACTIVATED          ║
    ║  Fallback: 6+ Model System           ║
    ║  Response: Ultra Fast                ║
    ╚═══════════════════════════════════════╝
    `);
});
