require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { dcaBacktest } = require("./backtesting");
const { loadKlineData } = require("./backtesting/load-kline");
const { default: mongoose } = require("mongoose");

const app = express();
const port = 4000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

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
    maximumSupportOrdersCount: parseFloat(req.body.maximumSupportOrdersCount),
    supportOrderAmountScale: parseFloat(req.body.supportOrderAmountScale),
    takeProfitPercentage: parseFloat(req.body.takeProfitPercentage),
    enableCustomSupportOrders: req.body.enableCustomSupportOrders,
    enableSmartOrder: req.body.enableSmartOrder,
    customerSupportOrderAmountScale: req.body.customerSupportOrderAmountScale,
    customSupportOrderDeviation: req.body.customSupportOrderDeviation,
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

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
