Create a stock monitoring system for SPY using Yahoo Finance.

TASKS:
1. Create script at event_handler/spy-monitor.js that:
   - Fetches current SPY price from Yahoo Finance web scraping (url: https://finance.yahoo.com/quote/SPY)
   - Parses the current price from the HTML
   - Compares price to target 696.80
   - If price == 696.80:
     * Send Telegram alert with current price and timestamp
     * Mark as notified in logs/SPY_ALERT_STATUS.md (write "notified-696.80")
   - If price has been marked as notified, skip alerting

2. Add cron entry to operating_system/CRONS.json:
   - Schedule: "*/30 * * * * *" (every 30 seconds)
   - Type: "command"
   - Command: "node event_handler/spy-monitor.js"
   - Enabled: true

3. Document the setup by writing a brief README at logs/SPY_MONITOR_README.md explaining:
   - What the monitor does
   - How to stop/monitor it
   - How to reset tracking (remove logs/SPY_ALERT_STATUS.md)