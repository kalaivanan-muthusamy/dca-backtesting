const { default: axios } = require('axios');
const express = require('express');
const cors = require('cors');
const data = require('./data.json');

const app = express();
const port = 4000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/kline', async (req, res) => {
  return res.json(data);
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
      const response = await axios.get(
        'https://api.binance.com/api/v3/klines',
        {
          params: {
            ...req.query,
            startTime,
            limit: 1000,
          },
        }
      );
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
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
