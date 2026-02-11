
const fs = require('fs').promises; // For async file operations
const path = require('path');

const TARGET_PRICE = 696.80;
const PRICE_LOG_FILE = '/job/logs/SPY_ALERT_STATUS.md';
const YAHOO_FINANCE_URL = 'https://finance.yahoo.com/quote/SPY';
// Placeholder for Telegram alert mechanism.
// This assumes the event handler can be reached locally for alerts.
// The actual URL and method might need to be determined if this were a real deployment.
// For this exercise, we'll log that an alert *would* be sent and simulate the POST.
const TELEGRAM_ALERT_ENDPOINT = '/send_spy_alert'; // This is a hypothetical endpoint on the event handler
const EVENT_HANDLER_URL = 'http://localhost:3000'; // Assuming event handler runs on localhost:3000

async function getSpyPrice() {
    try {
        // Use global fetch (available in Node.js v18+)
        const response = await fetch(YAHOO_FINANCE_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();

        // Regex to find the SPY price. This is fragile and might need adjustment.
        // It looks for a <fin-streamer> tag with data-symbol="SPY" and extracts the data-value attribute.
        // Example: <fin-streamer ... data-symbol="SPY" ... data-value="495.50" ...>
        const priceMatch = html.match(/<fin-streamer[^>]*data-symbol="SPY"[^>]*data-value="([^"]+)"/);

        if (priceMatch && priceMatch[1]) {
            return parseFloat(priceMatch[1]);
        } else {
            console.error('Could not parse SPY price from HTML.');
            return null;
        }
    } catch (error) {
        console.error('Error fetching SPY price:', error);
        return null;
    }
}

async function sendTelegramAlert(price, timestamp) {
    const alertMessage = `SPY Price Alert: ${price} at ${timestamp.toISOString()}`;
    console.log('Simulating Telegram alert POST request:', alertMessage);

    // Placeholder for actual Telegram sending mechanism.
    // In a real scenario, this would likely involve making an HTTP POST request
    // to the event handler's internal API or a dedicated Telegram sending service.
    try {
         // Example: Post to a hypothetical internal event handler endpoint.
         // This assumes the event handler has an endpoint like /send_alert or similar
         // that can receive a message and send it via Telegram.
        const response = await fetch(`${EVENT_HANDLER_URL}${TELEGRAM_ALERT_ENDPOINT}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: alertMessage, timestamp: timestamp.toISOString() })
        });
        if (response.ok) {
            console.log('Telegram alert POST request successful.');
        } else {
            console.error(`Failed to send Telegram alert POST request. Status: ${response.status}. Response body:`, await response.text());
        }
    } catch (error) {
        console.error('Error making POST request for Telegram alert:', error);
    }
}

async function getAlertStatus() {
    try {
        // Ensure the directory for the log file exists
        await fs.mkdir(path.dirname(PRICE_LOG_FILE), { recursive: true });
        const status = await fs.readFile(PRICE_LOG_FILE, 'utf8');
        return status.trim();
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null; // File doesn't exist yet, which is fine.
        }
        console.error('Error reading alert status file:', error);
        return null;
    }
}

async function updateAlertStatus() {
    try {
        // Ensure the directory for the log file exists
        await fs.mkdir(path.dirname(PRICE_LOG_FILE), { recursive: true });
        await fs.writeFile(PRICE_LOG_FILE, 'notified-696.80', 'utf8');
        console.log('Updated alert status to notified-696.80');
    } catch (error) {
        console.error('Error writing alert status file:', error);
    }
}

async function main() {
    const currentPrice = await getSpyPrice();
    const timestamp = new Date();

    if (currentPrice === null) {
        console.log('Skipping check: Could not retrieve current SPY price.');
        return;
    }

    console.log(`Current SPY price: ${currentPrice}`);

    const notifiedStatus = await getAlertStatus();

    if (currentPrice === TARGET_PRICE) {
        if (notifiedStatus !== 'notified-696.80') {
            await sendTelegramAlert(currentPrice, timestamp);
            await updateAlertStatus();
        } else {
            console.log('Price matches target, but status already marked as "notified-696.80". Skipping alert.');
        }
    } else {
        console.log(`Price ${currentPrice} does not match target ${TARGET_PRICE}.`);
        // No action needed if price deviates. The 'notified-696.80' status persists
        // until manually reset, ensuring we don't alert repeatedly if the price
        // fluctuates around the target without a reset.
    }
}

main().catch(console.error);
