const { default: axios } = require("axios");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const data = require("./data.json");
const { dcaBacktest } = require("./backtesting");
const { parse } = require("date-fns");

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
    enableSmartOrder: req.body.enableSmartOrder,
    customerSupportOrderAmountScale: req.body.customerSupportOrderAmountScale,
    customSupportOrderDeviation: req.body.customSupportOrderDeviation,
  });
  res.json(backtestResponse);
});

app.get("/kline", async (req, res) => {
  try {
    let isCompleted = false;
    let allData = [];
    const startDate = req.query.startDate ? parse(req.query.startDate, "yyyy-MM-dd", new Date()) : new Date();
    const endDate = req.query.endDate ? parse(req.query.endDate, "yyyy-MM-dd", new Date()) : new Date();
    const symbol = req.query.symbol || "BTCUSDT";
    const interval = req.query.interval || "1h";

    const endTime = endDate.getTime();
    let startTime = startDate.getTime();
    let lastEndTime;
    while (!isCompleted) {
      console.log(startTime, endTime);
      const response = await axios.get("https://api.binance.com/api/v3/klines", {
        params: {
          symbol,
          interval,
          startTime,
          endTime,
          limit: 1000,
        },
      });
      const data = response.data;
      const lastData = data[data?.length - 1];
      const resEndTime = lastData[0];
      if (resEndTime >= endTime) {
        allData = [...allData, ...data];
        isCompleted = true;
      } else if (lastEndTime === resEndTime) {
        isCompleted = true;
      } else {
        allData = [...allData, ...data];
        lastEndTime = resEndTime;
        startTime = resEndTime;
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
