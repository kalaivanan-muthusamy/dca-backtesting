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
  maximumAveragingOrderCount: 10,
  supportOrderAmountScale: 2,
  takeProfitPercentage: 1,
  enableCustomSupportOrders: true,
  enableSmartOrder: true,
  customerSupportOrderAmountScale: getDefultVolumeScale(1.5),
  customSupportOrderDeviation: getDefultDeviation(2, false),
};

export const BTC_12_4 = {
  baseOrderAmount: 10,
  supportOrderAmount: 10,
  supportOrderPriceDeviationPercentage: 2,
  maximumAveragingOrderCount: 10,
  supportOrderAmountScale: 2,
  takeProfitPercentage: 1.2,
  enableCustomSupportOrders: true,
  enableSmartOrder: true,
  customerSupportOrderAmountScale: {
    1: 1,
    2: 1.5,
    3: 2,
    4: 2.25,
    5: 2.5,
    6: 3,
    7: 3.5,
    8: 4,
    9: 4.5,
    10: 5,
  },
  customSupportOrderDeviation: {
    1: 1.3,
    2: 1.3,
    3: 1.3,
    4: 3,
    5: 3,
    6: 3,
    7: 3,
    8: 3,
    9: 3,
    10: 3,
  },
};

export const DCA_PRESET = {
  DEFAULT: DEFAULT,
  BTC_12_4: BTC_12_4,
};
