const mongoose = require("mongoose");
const { Schema } = mongoose;

const klineSchema = new Schema({
  exchange: String,
  symbol: String,
  interval: String,
  time: Date,
  open: Number,
  high: Number,
  low: Number,
  close: Number,
});

const KLineModel = mongoose.model('kline', klineSchema);

module.exports = KLineModel;