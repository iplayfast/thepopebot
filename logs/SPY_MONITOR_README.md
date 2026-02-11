# SPY Price Monitor README

## What it does

This system monitors the price of the SPDR S&P 500 ETF Trust (SPY) by scraping data from Yahoo Finance. If the price of SPY reaches exactly 696.80 and an alert for this specific price has not yet been sent (as indicated by the `logs/SPY_ALERT_STATUS.md` file), a Telegram alert will be triggered. This ensures that alerts are sent only once per notification cycle for the target price.

## How to stop or monitor the system

*   **To stop the monitor**: Edit the `operating_system/CRONS.json` file. Find the entry with `"name": "spy-price-monitor"` and set its `"enabled"` field to `false`. Commit and push the changes to your repository.
*   **To monitor its execution**: The `spy-monitor.js` script runs as a command. Its output (logs and errors) will be directed to the event handler's logging system. You may need to access these logs to troubleshoot or confirm its operation.

## How to reset tracking

If you wish for the monitor to send another alert the next time SPY hits 696.80 (e.g., after the price has moved away and then back), you need to reset the notification status. To do this, delete the file `/job/logs/SPY_ALERT_STATUS.md`. Once deleted, the system will consider itself 'not notified' for the target price and will send an alert the next time the condition is met.
