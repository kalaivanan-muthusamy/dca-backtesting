const { parse } = require("date-fns");
const { default: axios } = require("axios");
const KLineModel = require("./kline-schema");
const { zonedTimeToUtc } = require("date-fns-tz");

async function loadKlineData({ symbol = "BTCUSDT", startDate, endDate, interval = "15m" }) {
  try {
    // 1. GET KLINE DATA
    let isCompleted = false;
    let allKlineData = [];
    const startDateObj = startDate ? parse(startDate, "yyyy-MM-dd", new Date()) : new Date();
    const endDateObj = endDate ? parse(endDate, "yyyy-MM-dd", new Date()) : new Date();

    const endTime = endDateObj.getTime();
    let startTime = startDateObj.getTime();
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
        allKlineData = [...allKlineData, ...data];
        isCompleted = true;
      } else if (lastEndTime === resEndTime) {
        isCompleted = true;
      } else {
        allKlineData = [...allKlineData, ...data];
        lastEndTime = resEndTime;
        startTime = resEndTime;
      }
    }

    // 2. LOAD TO MONGO DATABASE
    const data = allKlineData.map((kline) => {
      return {
        exchange: "BINANCE",
        symbol,
        interval,
        timestamp: kline[0],
        time: zonedTimeToUtc(parse(kline[0], "T", new Date()), "UTC"),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
      };
    });
    // delete the existing data
    await KLineModel.deleteMany({ symbol, interval });
    await KLineModel.insertMany(data);
    return data;
  } catch (err) {
    console.error(err);
  }
}

module.exports = { loadKlineData };
