function getDefultVolumeScale(base) {
  const scale = {};
  for (let i = 1; i < 21; i++) {
    scale[i] = i === 1 ? 1 : Math.pow(base, i - 1);
  }
  return scale;
}

function getDefultDeviation(base, scale = false) {
  const deviation = {};
  for (let i = 1; i < 21; i++) {
    if (scale) {
      deviation[i] = i === 1 ? 1 : Math.pow(base, i - 1);
    } else {
      deviation[i] = base;
    }
  }
  return deviation;
}

export const DEFAULT = {
  baseOrderAmount: 10,
  supportOrderAmount: 10,
  supportOrderPriceDeviationPercentage: 2,
  enableTrailingBuy: false,
  trailingBuyDeviation: 0.3,
  maximumSupportOrdersCount: 10,
  supportOrderAmountScale: 1.2,
  supportOrderPriceDeviationScale: 1.2,
  takeProfitPercentage: 0.8,
  enableTrailingTakeProfit: true,
  trailingTakeProfitDeviation: 0.2,
  enableCustomSupportOrders: false,
  customSupportOrderAmountScale: getDefultVolumeScale(1.5),
  customSupportOrderDeviation: getDefultDeviation(2, false),
};

export const BTC_12_4 = {
  baseOrderAmount: 10,
  supportOrderAmount: 10,
  supportOrderPriceDeviationPercentage: 2,
  enableTrailingBuy: true,
  trailingBuyDeviation: 0.3,
  maximumSupportOrdersCount: 25,
  supportOrderAmountScale: 1.2,
  supportOrderPriceDeviationScale: 1.2,
  takeProfitPercentage: 0.6,
  enableTrailingTakeProfit: true,
  trailingTakeProfitDeviation: 0.2,
  enableCustomSupportOrders: false,
  customSupportOrderAmountScale: {
    1: 1,
    2: 1.5,
    3: 2,
    4: 2.5,
    5: 3,
    6: 4,
    7: 5,
    8: 6,
    9: 7,
    10: 8,
    11: 9,
    12: 10,
    13: 11,
    14: 12,
    15: 13,
    16: 14,
    17: 15,
    18: 16,
    19: 17,
    20: 18,
    21: 19,
    22: 20,
    23: 21,
    24: 22,
    25: 23,
  },
  customSupportOrderDeviation: {
    1: 1.3,
    2: 1.3,
    3: 3,
    4: 3.5,
    5: 4,
    6: 5,
    7: 6,
    8: 7,
    9: 8,
    10: 9,
    11: 10,
    12: 11,
    13: 12,
    14: 13,
    15: 14,
    16: 15,
    17: 16,
    18: 17,
    19: 18,
    20: 19,
    21: 20,
    22: 21,
    23: 22,
    24: 23,
    25: 24,
  },
  customTrailingBuyDeviation: {
    1: 0.3,
    2: 0.3,
    3: 0.3,
    4: 0.6,
    5: 0.6,
    6: 0.6,
    7: 0.6,
    8: 0.6,
    9: 0.6,
    10: 2,
    11: 2,
    12: 2,
    13: 2,
    14: 2,
    15: 2,
    16: 2,
    17: 2,
    18: 2,
    19: 2,
    20: 2,
    21: 2,
    22: 2,
    23: 2,
    24: 2,
    25: 2,
  },
};

export const DCA_PRESET = {
  DEFAULT: DEFAULT,
  BTC_12_4: BTC_12_4,
};
