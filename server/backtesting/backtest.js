const { parse, differenceInDays, format } = require("date-fns");
const KLineModel = require("./kline-schema");
const tulind = require("tulind");

async function dcaBacktest({
  // basic settings
  exchange,
  asset,
  baseOrderAmount,
  startDate,
  endDate,
  // support orders settings
  supportOrderAmount,
  supportOrderPriceDeviationPercentage,
  enableTrailingBuy,
  trailingBuyDeviation,
  maximumSupportOrdersCount,
  supportOrderAmountScale,
  supportOrderPriceDeviationScale,
  // take profit settings
  takeProfitPercentage,
  enableTrailingTakeProfit,
  trailingTakeProfitDeviation,
  // advanced settings
  enableCustomSupportOrders,
  customSupportOrderDeviation,
  customSupportOrderAmountScale,
  customTrailingBuyDeviation,
}) {
  console.time("backtest");
  const backtestStartDate = parse(startDate, "yyyy-MM-dd", new Date());
  const backtestEndDate = parse(endDate, "yyyy-MM-dd", new Date());
  const totalDays = differenceInDays(backtestEndDate, backtestStartDate);

  // GET KLINE DATA
  console.time("getKlineData");
  let backTestData = await KLineModel.find({
    symbol: asset,
    interval: "5m",
    time: {
      $gte: backtestStartDate,
      $lte: backtestEndDate,
    },
  }).lean()
  // .sort({ time: 1 });
  console.timeEnd("getKlineData");

  const allOrders = [];
  const activeOrders = [];
  const takeProfitPercentageValue = takeProfitPercentage / 100;
  let supportOrderCount = 0;
  let takeProfitTarget = 0;
  let supportOrderTarget = 0;

  // Overall Metrics
  let overallMetrics = {
    totalOrders: 0,
    totalCompletedTakeProfitOrders: 0,
    maxSupportOrdersCount: 0,
    maxCapitalInvested: 0,
    totalDuration: totalDays,
    totalProfit: 0,
    averageDailyProfit: 0,
    averageMonthlyProfit: 0,
    avergaeDailyProfitPercentage: 0,
    averageMonthlyProfitPercentage: 0,
    dcaCombinations: {},
    conflictingOrders: 0,
    exceededMaxSupportOrdersCount: 0,
  };

  // Handle trailing take profit order
  const trailingTakeProfitDeviationVal = trailingTakeProfitDeviation / 100;
  let isTrailingTakeProfitEnabled = false;
  let lastTrailingOredrHigh = 0;
  let dynamicTakeProfitPrice = 0;

  // Handle trailing buy order
  let isTrailingBuyEnabled = false;
  let lastTrailingOrderLow = 0;
  let dynamicBuyPrice = 0;

  for (let i = 0; i < backTestData.length; i++) {
    const kline = backTestData[i];

    // backTestData.map(async (kline, index) => {
    // Get necessary data from kline data
    const orderTime = format(new Date(kline.time), "dd-MM-yyyy HH:mm:ss");
    const openPrice = parseFloat(kline.open);
    const priceHigh = parseFloat(kline.high);
    const priceLow = parseFloat(kline.low);
    const closePrice = parseFloat(kline.close);
    const rsiClosePrice = backTestData.slice(i - 14, i + 1).map((k) => k.close);
    const rsi14List = await tulind.indicators.rsi.indicator([rsiClosePrice], [14]);
    const rsi14 = rsi14List[0];
    // console.log({ rsi14: rsi14[0] });

    // if (allOrders.length > 5) return;

    // console.log({ lastTrailingOredrHigh, dynamicTakeProfitPrice, openPrice, priceHigh, priceLow, closePrice });

    // Get next support order price deviation percentage value
    const supportOrderPriceDeviationPercentageValue = getNextSupportOrderPriceDeviation({
      nextSupportOrder: supportOrderCount + 1,
      supportOrderPriceDeviationScale,
      supportOrderPriceDeviationPercentage,
      enableCustomSupportOrders,
      customSupportOrderDeviation,
      isBaseOrder: activeOrders.length === 0,
    });
    const supportOrderTrailingDeviation =
      enableTrailingBuy && !enableCustomSupportOrders
        ? trailingBuyDeviation
        : customTrailingBuyDeviation[supportOrderCount + 2];
    const supportOrderTrailingDeviationValue = supportOrderTrailingDeviation / 100;

    if (isTrailingTakeProfitEnabled) {
      // Dynamic take profit price is triggered
      if (priceLow <= dynamicTakeProfitPrice) {
        const { order } = createTakeProfitOrder({
          orderPrice: dynamicTakeProfitPrice,
          activeOrders,
          orderTime,
        });
        allOrders.push(order);

        // Update the metrics
        overallMetrics = getUpdatedMetricsForTP({
          overallMetrics,
          takeProfitOrder: order,
          activeOrders,
          supportOrderCount,
        });

        // Reset trailing take profit order
        isTrailingTakeProfitEnabled = false;
        lastTrailingOredrHigh = 0;
        dynamicTakeProfitPrice = 0;

        // Reset active orders
        activeOrders.length = 0;
        supportOrderCount = 0;
      } else {
        lastTrailingOredrHigh = priceHigh;
        dynamicTakeProfitPrice = lastTrailingOredrHigh * (1 - trailingTakeProfitDeviationVal);
      }
    } else if (isTrailingBuyEnabled) {
      // Dynamic buy price is triggered
      if (priceHigh >= dynamicBuyPrice) {
        const { tpTarget, soTarget, order } = createSupportOrder({
          orderPrice: dynamicBuyPrice,
          supportOrderAmount,
          activeOrders,
          enableCustomSupportOrders,
          supportOrderAmountScale,
          customSupportOrderAmountScale,
          supportOrderCount: supportOrderCount + 1,
          takeProfitPercentageValue,
          supportOrderPriceDeviationPercentageValue,
          orderTime,
        });

        takeProfitTarget = tpTarget;
        supportOrderTarget = soTarget;

        supportOrderCount++;
        activeOrders.push(order);
        allOrders.push(order);

        // Reset trailing buy order
        isTrailingBuyEnabled = false;
        lastTrailingOrderLow = 0;
        dynamicBuyPrice = 0;
      } else {
        lastTrailingOrderLow = priceLow;
        dynamicBuyPrice = lastTrailingOrderLow * (1 + supportOrderTrailingDeviationValue);
      }
    }
    // If there is no base order, create a new one with open price or existing take profit price
    else if (activeOrders.length === 0) {
      // check RSI value and place a new order
      if (rsi14 > 40) continue;

      // place a buy order
      const orderPrice = takeProfitTarget || openPrice;
      takeProfitTarget = orderPrice * (1 + takeProfitPercentageValue);
      supportOrderTarget = orderPrice * (1 - supportOrderPriceDeviationPercentageValue);

      const buyOrder = {
        type: "buy",
        price: orderPrice,
        amount: baseOrderAmount,
        quantity: baseOrderAmount / orderPrice,
        orderTime,
        takeProfitTarget,
        supportOrderTarget,
        supportOrderDeviationPercentage: ((supportOrderTarget - orderPrice) / orderPrice) * 100,
      };
      allOrders.push(buyOrder);
      activeOrders.push(buyOrder);
    } else if (priceHigh >= takeProfitTarget) {
      if(rsi14 < 25) continue;
      // activate trailing take profit
      if (enableTrailingTakeProfit) {
        isTrailingTakeProfitEnabled = true;
        lastTrailingOredrHigh = takeProfitTarget;
        dynamicTakeProfitPrice = lastTrailingOredrHigh * (1 - trailingTakeProfitDeviationVal);
      } else {
        const { order } = createTakeProfitOrder({
          orderPrice: takeProfitTarget,
          activeOrders,
          orderTime,
        });
        allOrders.push(order);

        // Update the metrics
        overallMetrics = getUpdatedMetricsForTP({
          overallMetrics,
          takeProfitOrder: order,
          activeOrders,
          supportOrderCount,
        });

        activeOrders.length = 0;
        supportOrderCount = 0;
      }
    } else if (priceLow <= supportOrderTarget) {
      if(rsi14 > 50) continue;
      if (supportOrderCount > 2 && rsi14 > 20) continue;
      if (enableTrailingBuy) {
        isTrailingBuyEnabled = true;
        lastTrailingOrderLow = supportOrderTarget;
        dynamicBuyPrice = lastTrailingOrderLow * (1 + supportOrderTrailingDeviationValue);
      } else {
        const { tpTarget, soTarget, order } = createSupportOrder({
          orderPrice: supportOrderTarget,
          supportOrderAmount,
          activeOrders,
          enableCustomSupportOrders,
          supportOrderAmountScale,
          customSupportOrderAmountScale,
          supportOrderCount: supportOrderCount + 1,
          takeProfitPercentageValue,
          supportOrderPriceDeviationPercentageValue,
          orderTime,
        });

        takeProfitTarget = tpTarget;
        supportOrderTarget = soTarget;

        supportOrderCount++;
        activeOrders.push(order);
        allOrders.push(order);
      }
    }
  }

  overallMetrics.totalOrders = allOrders.length;
  overallMetrics.averageDailyProfit = overallMetrics.totalProfit / totalDays;
  overallMetrics.averageMonthlyProfit = (overallMetrics.totalProfit / totalDays) * 30;
  overallMetrics.avergaeDailyProfitPercentage =
    (overallMetrics.averageDailyProfit / overallMetrics.maxCapitalInvested) * 100;
  overallMetrics.averageMonthlyProfitPercentage =
    (overallMetrics.averageMonthlyProfit / overallMetrics.maxCapitalInvested) * 100;

  console.timeEnd("backtest");

  return {
    allOrders,
    overallMetrics,
  };
}

function getNextSupportOrderPriceDeviation({
  nextSupportOrder,
  supportOrderPriceDeviationScale,
  supportOrderPriceDeviationPercentage,
  enableCustomSupportOrders,
  customSupportOrderDeviation,
  isBaseOrder,
}) {
  if (enableCustomSupportOrders) {
    supportOrderPriceDeviation = customSupportOrderDeviation[nextSupportOrder];
  } else {
    if (isBaseOrder && nextSupportOrder === 1) {
      supportOrderPriceDeviation = supportOrderPriceDeviationPercentage;
    } else {
      supportOrderPriceDeviation =
        Math.pow(supportOrderPriceDeviationScale, nextSupportOrder) * supportOrderPriceDeviationPercentage ||
        supportOrderPriceDeviationPercentage;
    }
  }
  return supportOrderPriceDeviation / 100;
}

/**
 * Utitlity to create support order
 * @param {*} param0
 * @returns
 */
function createSupportOrder({
  orderPrice,
  supportOrderAmount,
  activeOrders,
  enableCustomSupportOrders,
  customSupportOrderAmountScale,
  supportOrderAmountScale,
  supportOrderCount,
  takeProfitPercentageValue,
  supportOrderPriceDeviationPercentageValue,
  orderTime,
}) {
  // Find order amount for current support order
  let orderAmout = supportOrderAmount;
  if (enableCustomSupportOrders) {
    orderAmout = supportOrderAmount * customSupportOrderAmountScale[supportOrderCount];
  } else if (supportOrderCount > 1) {
    orderAmout = activeOrders[activeOrders.length - 1].amount * supportOrderAmountScale;
  }

  // average and calulate take profit price
  const { averagePrice } = getOrdersInfo([
    ...activeOrders,
    {
      amount: orderAmout,
      quantity: orderAmout / orderPrice,
    },
  ]);

  const tpTarget = averagePrice * (1 + takeProfitPercentageValue);
  const soTarget = orderPrice * (1 - supportOrderPriceDeviationPercentageValue);

  const order = {
    type: "buy",
    price: orderPrice,
    amount: orderAmout,
    quantity: orderAmout / orderPrice,
    supportingOrderCount: `S${supportOrderCount}`,
    averagePrice,
    deviationPercentageFromAverage: ((orderPrice - averagePrice) / averagePrice) * 100,
    takeProfitTarget: tpTarget,
    supportOrderTarget: soTarget,
    supportOrderDeviationPercentage: ((soTarget - orderPrice) / orderPrice) * 100,
    orderTime,
  };

  return {
    tpTarget,
    soTarget,
    order,
  };
}

function createTakeProfitOrder({ orderPrice, activeOrders, orderTime }) {
  // Calculate profit value
  const { totalInvestment, totalQuantity, averagePrice } = getOrdersInfo(activeOrders);
  const sellOrderValue = totalQuantity * orderPrice;
  const profit = sellOrderValue - totalInvestment;
  const profitPercentage = (profit / totalInvestment) * 100;

  const order = {
    type: "sell",
    price: orderPrice,
    orderTime,
    quantity: totalQuantity,
    profit,
    profitPercentage,
  };

  return {
    order,
  };
}

/**
 * Get the updated metrics for a take profit order
 */
function getUpdatedMetricsForTP({ overallMetrics, takeProfitOrder, activeOrders, supportOrderCount }) {
  const tempOverallMetrics = { ...overallMetrics };
  tempOverallMetrics.totalProfit += takeProfitOrder.profit;
  tempOverallMetrics.totalCompletedTakeProfitOrders += 1;

  // Get total investment of current orders
  const totakCapitalForCurrentOrders = activeOrders.reduce((acc, curr) => {
    return acc + curr.amount;
  }, 0);

  // Calculate maximum capital invested
  tempOverallMetrics.maxCapitalInvested =
    totakCapitalForCurrentOrders > tempOverallMetrics.maxCapitalInvested
      ? totakCapitalForCurrentOrders
      : tempOverallMetrics.maxCapitalInvested;

  // Calculate maximum support orders count
  tempOverallMetrics.maxSupportOrdersCount =
    supportOrderCount > tempOverallMetrics.maxSupportOrdersCount
      ? supportOrderCount
      : tempOverallMetrics.maxSupportOrdersCount;

  // Update the DCA combinations count
  if (tempOverallMetrics.dcaCombinations[supportOrderCount]) {
    tempOverallMetrics.dcaCombinations[supportOrderCount] = tempOverallMetrics.dcaCombinations[supportOrderCount] + 1;
  } else {
    tempOverallMetrics.dcaCombinations[supportOrderCount] = 1;
  }

  return tempOverallMetrics;
}

/**
 * Get cumulative order info such as total investment, total quantity and average price
 * @param {Array} orders
 * @returns {Object}
 */
function getOrdersInfo(orders) {
  const totalInvestment = orders.reduce((curr, acc) => {
    return curr + acc.amount;
  }, 0);
  const totalQuantity = orders.reduce((curr, acc) => {
    return curr + acc.quantity;
  }, 0);
  const averagePrice = totalInvestment / totalQuantity;
  return {
    totalInvestment,
    totalQuantity,
    averagePrice,
  };
}

module.exports = {
  dcaBacktest,
};
