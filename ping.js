const axios = require('axios');
const chalk = require('chalk');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    URL: "https://aman-ai.onrender.com",
    PING_INTERVAL: 5 * 60 * 1000,        // 5 minutes
    TIMEOUT: 30000,                       // 30 seconds
    MAX_RETRIES: 3,                       // Retry attempts
    RETRY_DELAY: 10000,                   // 10 seconds between retries
    HEALTH_CHECK_ENDPOINTS: [
        "/health",
        "/stats", 
        "/",
        "/chat?prompt=ping"
    ]
};

// ============================================
// STATS & MONITORING
// ============================================
const stats = {
    totalPings: 0,
    successfulPings: 0,
    failedPings: 0,
    consecutiveFailures: 0,
    lastSuccessTime: null,
    lastFailureTime: null,
    avgResponseTime: 0,
    totalResponseTime: 0,
    startTime: new Date(),
    uptimePercentage: 100
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getUptime() {
    const uptime = Date.now() - stats.startTime.getTime();
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

function getCurrentTime() {
    return new Date().toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour12: true 
    });
}

function formatResponseTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

function updateStats(success, responseTime) {
    stats.totalPings++;
    
    if (success) {
        stats.successfulPings++;
        stats.consecutiveFailures = 0;
        stats.lastSuccessTime = new Date();
        
        if (responseTime) {
            stats.totalResponseTime += responseTime;
            stats.avgResponseTime = Math.round(stats.totalResponseTime / stats.successfulPings);
        }
    } else {
        stats.failedPings++;
        stats.consecutiveFailures++;
        stats.lastFailureTime = new Date();
    }
    
    stats.uptimePercentage = ((stats.successfulPings / stats.totalPings) * 100).toFixed(2);
}

function displayStats() {
    console.log(chalk.cyan('\n' + '═'.repeat(60)));
    console.log(chalk.cyan.bold('📊 PING STATISTICS'));
    console.log(chalk.cyan('═'.repeat(60)));
    console.log(chalk.white(`Total Pings:        ${stats.totalPings}`));
    console.log(chalk.green(`✓ Successful:       ${stats.successfulPings}`));
    console.log(chalk.red(`✗ Failed:           ${stats.failedPings}`));
    console.log(chalk.yellow(`⚠ Consecutive Fails: ${stats.consecutiveFailures}`));
    console.log(chalk.blue(`⚡ Avg Response:     ${formatResponseTime(stats.avgResponseTime)}`));
    console.log(chalk.magenta(`📈 Uptime:          ${stats.uptimePercentage}%`));
    console.log(chalk.white(`⏱ Running Since:    ${getUptime()}`));
    
    if (stats.lastSuccessTime) {
        console.log(chalk.green(`✓ Last Success:     ${stats.lastSuccessTime.toLocaleTimeString()}`));
    }
    if (stats.lastFailureTime) {
        console.log(chalk.red(`✗ Last Failure:     ${stats.lastFailureTime.toLocaleTimeString()}`));
    }
    console.log(chalk.cyan('═'.repeat(60) + '\n'));
}

// ============================================
// PING FUNCTIONS
// ============================================

async function pingWithRetry(url, retries = CONFIG.MAX_RETRIES) {
    const startTime = Date.now();
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(url, {
                timeout: CONFIG.TIMEOUT,
                headers: {
                    'User-Agent': 'Render-Keep-Alive-Bot/2.0',
                    'Accept': 'application/json, text/html'
                },
                validateStatus: (status) => status >= 200 && status < 500
            });
            
            const responseTime = Date.now() - startTime;
            
            console.log(chalk.green('✓') + ' ' + 
                       chalk.white(`[${getCurrentTime()}]`) + ' ' +
                       chalk.green.bold('Ping Success!') + ' ' +
                       chalk.gray(`(${formatResponseTime(responseTime)})`) + ' ' +
                       chalk.yellow(`[Attempt ${attempt}/${retries}]`)
            );
            
            updateStats(true, responseTime);
            return { success: true, responseTime, attempt };
            
        } catch (error) {
            const errorType = error.code || error.message;
            
            console.log(chalk.red('✗') + ' ' +
                       chalk.white(`[${getCurrentTime()}]`) + ' ' +
                       chalk.red.bold('Ping Failed!') + ' ' +
                       chalk.gray(`(${errorType})`) + ' ' +
                       chalk.yellow(`[Attempt ${attempt}/${retries}]`)
            );
            
            if (attempt < retries) {
                console.log(chalk.yellow(`⏳ Retrying in ${CONFIG.RETRY_DELAY / 1000}s...`));
                await sleep(CONFIG.RETRY_DELAY);
            }
        }
    }
    
    updateStats(false);
    return { success: false, attempt: retries };
}

async function smartHealthCheck() {
    console.log(chalk.blue('\n🔍 Running Smart Health Check...'));
    
    for (const endpoint of CONFIG.HEALTH_CHECK_ENDPOINTS) {
        try {
            const fullUrl = CONFIG.URL + endpoint;
            const response = await axios.get(fullUrl, { 
                timeout: 10000,
                validateStatus: (status) => status >= 200 && status < 500
            });
            
            console.log(chalk.green(`✓ ${endpoint} - OK (${response.status})`));
            return true;
            
        } catch (error) {
            console.log(chalk.red(`✗ ${endpoint} - Failed`));
        }
    }
    
    console.log(chalk.red('⚠ All health checks failed!'));
    return false;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// ALERT SYSTEM
// ============================================

function checkAlerts() {
    if (stats.consecutiveFailures >= 3) {
        console.log(chalk.red.bold('\n⚠️  ALERT: 3+ Consecutive Failures!'));
        console.log(chalk.yellow('🔄 Running emergency health check...\n'));
        smartHealthCheck();
    }
    
    if (stats.uptimePercentage < 90 && stats.totalPings > 10) {
        console.log(chalk.red.bold('\n⚠️  ALERT: Uptime below 90%!'));
        console.log(chalk.yellow(`Current: ${stats.uptimePercentage}%\n`));
    }
}

// ============================================
// MAIN PING LOOP
// ============================================

async function mainPingLoop() {
    console.log(chalk.green.bold('\n🚀 Premium Render Ping System Started!'));
    console.log(chalk.white(`📍 Target: ${CONFIG.URL}`));
    console.log(chalk.white(`⏰ Interval: ${CONFIG.PING_INTERVAL / 1000}s (${CONFIG.PING_INTERVAL / 60000} mins)`));
    console.log(chalk.white(`🔄 Max Retries: ${CONFIG.MAX_RETRIES}`));
    console.log(chalk.cyan('═'.repeat(60) + '\n'));
    
    // Initial ping
    await pingWithRetry(CONFIG.URL);
    
    // Regular interval pings
    setInterval(async () => {
        await pingWithRetry(CONFIG.URL);
        checkAlerts();
        
        // Show stats every 10 pings
        if (stats.totalPings % 10 === 0) {
            displayStats();
        }
    }, CONFIG.PING_INTERVAL);
    
    // Stats display every 30 minutes
    setInterval(() => {
        displayStats();
    }, 30 * 60 * 1000);
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n⏸️  Shutting down gracefully...'));
    displayStats();
    console.log(chalk.green('✓ Goodbye!\n'));
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n\n⏸️  Received SIGTERM...'));
    displayStats();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error(chalk.red('\n❌ Uncaught Exception:'), error);
    console.log(chalk.yellow('🔄 Continuing ping service...\n'));
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('\n❌ Unhandled Rejection:'), reason);
    console.log(chalk.yellow('🔄 Continuing ping service...\n'));
});

// ============================================
// START THE SERVICE
// ============================================

mainPingLoop().catch(error => {
    console.error(chalk.red('❌ Fatal Error:'), error);
    process.exit(1);
});
