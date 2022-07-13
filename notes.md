# DCA Bot Backtesting Notes

This is based on the backtesting result of BTC/USDT pair in Binance from 01-07-2021 to 01-07-2022 range

- 80% of orders given profit without any averaging or one averaging order

## How DCA Can be improved

- Custom price deviation percentage option must be given for every averaging order
- When price reaches the target (buy/sell), order shouldn't executed instantly. Instead, order should be executed with callback percentage mode
