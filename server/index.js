const { default: axios } = require("axios");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const data = require("./btc-data.json");
const { dcaBacktest } = require("./backtesting");

const app = express();
const port = 4000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/backtest", async (req, res) => {
  console.log(req.body);
  const backtestResponse = await dcaBacktest({
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    baseOrderAmount: parseFloat(req.body.baseOrderAmount),
    supportOrderAmount: parseFloat(req.body.supportOrderAmount),
    supportOrderPriceDeviationPercentage: parseFloat(req.body.supportOrderPriceDeviationPercentage),
    maximumSupportOrdersCount: parseFloat(req.body.maximumSupportOrdersCount),
    supportOrderAmountScale: parseFloat(req.body.supportOrderAmountScale),
    takeProfitPercentage: parseFloat(req.body.takeProfitPercentage),
    enableCustomSupportOrders: req.body.enableCustomSupportOrders,
    enableCallback: req.body.enableCallback,
    customerSupportOrderAmountScale: req.body.customerSupportOrderAmountScale,
    customSupportOrderDeviation: req.body.customSupportOrderDeviation,
  });
  res.json(backtestResponse);
});

app.get("/kline", async (req, res) => {
  try {
    let isCompleted = false;
    let allData = [];
    const endTime = req.query.endTime;
    let startTime = req.query.startTime;
    while (!isCompleted) {
      console.log({
        startTime,
        endTime,
      });
      const response = await axios.get("https://api.binance.com/api/v3/klines", {
        params: {
          ...req.query,
          startTime,
          limit: 1000,
        },
      });
      const data = response.data;
      allData = [...allData, ...data];
      if (data[data?.length - 1][0] >= endTime) {
        isCompleted = true;
      } else {
        startTime = data[data?.length - 1][0];
      }
    }
    return res.json(allData);
  } catch (err) {
    console.error(err);
  }
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
