const mongoose = require("mongoose");
const { Schema } = mongoose;

const klineSchema = new Schema({
  exchange: String,
  symbol: String,
  interval: String,
  time: Date,
  timestamp: Number,
  open: Number,
  high: Number,
  low: Number,
  close: Number,
});

klineSchema.index({ symbol: 1, time: 1 })

const KLineModel = mongoose.model('kline', klineSchema);

module.exports = KLineModel;