require("dotenv").config();
const express = require("express");
const compression = require("compression");
const cors = require("cors");
const bodyParser = require("body-parser");
// const { dcaBacktest } = require("./backtesting");
const { loadKlineData } = require("./backtesting/load-kline");
const { default: mongoose } = require("mongoose");
const { dcaBacktest } = require("./backtesting/backtest");
const tulind = require("tulind");

const app = express();
const port = 4000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(compression());

// Connect to database
mongoose.connect(process.env.MONGO_URL);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/backtest", async (req, res) => {
  const backtestResponse = await dcaBacktest({
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    asset: req.body.asset,
    baseOrderAmount: parseFloat(req.body.baseOrderAmount),
    supportOrderAmount: parseFloat(req.body.supportOrderAmount),
    supportOrderPriceDeviationPercentage: parseFloat(req.body.supportOrderPriceDeviationPercentage),
    enableTrailingBuy: req.body.enableTrailingBuy,
    trailingBuyDeviation: parseFloat(req.body.trailingBuyDeviation),
    maximumSupportOrdersCount: parseInt(req.body.maximumSupportOrdersCount),
    supportOrderAmountScale: parseFloat(req.body.supportOrderAmountScale),
    supportOrderPriceDeviationScale: parseFloat(req.body.supportOrderPriceDeviationScale),
    takeProfitPercentage: parseFloat(req.body.takeProfitPercentage),
    enableTrailingTakeProfit: req.body.enableTrailingTakeProfit,
    trailingTakeProfitDeviation: parseFloat(req.body.trailingTakeProfitDeviation),
    enableCustomSupportOrders: req.body.enableCustomSupportOrders,
    customSupportOrderAmountScale: req.body.customSupportOrderAmountScale,
    customSupportOrderDeviation: req.body.customSupportOrderDeviation,
    customTrailingBuyDeviation: req.body.customTrailingBuyDeviation,
  });
  res.json(backtestResponse);
});

app.get("/kline", async (req, res) => {
  const data = await loadKlineData({
    symbol: req.query.symbol || "BTCUSDT",
    startDate: req.query.startDate || "2020-07-01",
    endDate: req.query.endDate || "2022-07-01",
    interval: req.query.interval || "15m",
  });
  return res.json(data);
});

app.get("/rsi-test", async (req, res) => {
  console.log(tulind.indicators.rsi);
  const [result] = await tulind.indicators.rsi.indicator(
    [[2, 4, 6, 12, 24, 15, 62, 10, 20, 45, 15, 14, 78, 45, 45]],
    [14]
  );
  console.log(result);
  res.json("hello");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
