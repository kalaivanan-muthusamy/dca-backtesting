const { parse, differenceInDays, format } = require("date-fns");
const testData = require("../btc-data.json");

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
  maximumSupportOrdersCount,
  supportOrderAmountScale,
  // take profit settings
  takeProfitPercentage,
  // advanced settings
  enableCustomSupportOrders,
  enableCallback,
  customSupportOrderDeviation,
  customerSupportOrderAmountScale,
}) {
  console.log({
    baseOrderAmount,
    startDate,
    endDate,
    supportOrderAmount,
    supportOrderPriceDeviationPercentage,
    supportOrderAmountScale,
    takeProfitPercentage,
    enableCallback,
  });

  const backtestStartDate = parse(startDate, "yyyy-MM-dd", new Date());
  const backtestEndDate = parse(endDate, "yyyy-MM-dd", new Date());
  const totalDays = differenceInDays(backtestEndDate, backtestStartDate);

  // GET KLINE DATA
  const backTestData = testData;

  // START TESTING
  const allOrders = [];
  let currentDCAOrders = [];
  let supportingOrderCount = 0;
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
  };
  const priceDeviationPercentage = parseFloat(supportOrderPriceDeviationPercentage) / 100;
  takeProfitPercentage = parseFloat(takeProfitPercentage) / 100;
  baseOrderAmount = parseFloat(baseOrderAmount);
  supportOrderAmount = parseFloat(supportOrderAmount);
  supportOrderAmountScale = parseFloat(supportOrderAmountScale);

  // LOOP THROUGH ALL THE KLINE FOR BUY & SELL
  let takeProfitTarget;
  let supportOrderTarget;
  const callbackPercentage = 0.3;
  let lastCallbackPrice;
  let triggerPrice;
  backTestData.map((klineData) => {
    const orderTime = format(new Date(klineData[0]), "dd-MM-yyyy HH:mm:ss");
    const openPrice = parseFloat(klineData[1]);
    const priceHigh = parseFloat(klineData[2]);
    const priceLow = parseFloat(klineData[3]);
    const closePrice = parseFloat(klineData[4]);

    if (currentDCAOrders.length === 0) {
      // Set the order price as last profit taking order price or the current kline open price
      const orderPirce = takeProfitTarget || openPrice;
      takeProfitTarget = orderPirce * (1 + takeProfitPercentage);
      // Set the next support order target
      supportOrderTarget = orderPirce * (1 - priceDeviationPercentage);
      const order = {
        type: "buy",
        price: orderPirce,
        amount: baseOrderAmount,
        quantity: baseOrderAmount / orderPirce,
        orderTime,
        takeProfitTarget,
        supportOrderTarget,
      };
      allOrders.push(order);
      currentDCAOrders.push(order);
    } else {
      // Place sell order if price matches the take profit percentage
      if (priceHigh >= takeProfitTarget) {
        const { totalInvestment, totalQuantity } = getOrdersInfo(currentDCAOrders);
        const sellOrderValue = totalQuantity * takeProfitTarget;
        const profit = sellOrderValue - totalInvestment;
        const takeProfitOrder = {
          type: "sell",
          price: takeProfitTarget,
          orderTime,
          quantity: totalQuantity,
          profit,
        };
        allOrders.push(takeProfitOrder);

        // Update the metrics
        overallMetrics = getUpdatedMetricsForTP({
          overallMetrics,
          takeProfitOrder,
          currentDCAOrders,
          supportingOrderCount,
        });

        // Reset for next DCA
        supportingOrderCount = 0;
        currentDCAOrders = [];
      }
      // Identity the next averaging order target and wait for the callback to be executed
      else if (enableCallback && supportingOrderCount > 2) {
        if (!lastCallbackPrice && priceLow <= supportOrderTarget) {
          lastCallbackPrice = supportOrderTarget;
          triggerPrice = lastCallbackPrice * (1 + callbackPercentage / 100);
        } else if (priceHigh >= triggerPrice) {
          const { soCount, tpTarget, soTarget } = createSupportOrder({
            supportingOrderCount,
            supportOrderTarget,
            priceDeviationPercentage,
            supportOrderAmount,
            currentDCAOrders,
            takeProfitPercentage,
            orderTime,
            allOrders,
            enableCustomSupportOrders,
            customSupportOrderDeviation,
            customerSupportOrderAmountScale,
            supportOrderAmountScale,
          });

          supportingOrderCount = soCount;
          takeProfitTarget = tpTarget;
          supportOrderTarget = soTarget;

          lastCallbackPrice = null;
          triggerPrice = null;
        } else {
          lastCallbackPrice = priceLow;
          triggerPrice = lastCallbackPrice * (1 + callbackPercentage / 100);
        }

        // Check if this is a conflicting order
        if (priceLow <= supportOrderTarget && priceHigh >= triggerPrice) {
          overallMetrics.conflictingOrders += 1;
        }
      }
      // Place support order if price matches the deviation percentage
      else if (priceLow <= supportOrderTarget) {
        const { soCount, tpTarget, soTarget } = createSupportOrder({
          supportingOrderCount,
          supportOrderTarget,
          priceDeviationPercentage,
          supportOrderAmount,
          currentDCAOrders,
          takeProfitPercentage,
          orderTime,
          allOrders,
          enableCustomSupportOrders,
          customSupportOrderDeviation,
          customerSupportOrderAmountScale,
          supportOrderAmountScale,
        });

        supportingOrderCount = soCount;
        takeProfitTarget = tpTarget;
        supportOrderTarget = soTarget;
      }

      // Check if this is a conflicting order
      if (priceLow <= supportOrderTarget && priceHigh >= takeProfitTarget) {
        overallMetrics.conflictingOrders += 1;
      }
    }
  });

  overallMetrics.totalOrders = allOrders.length;
  overallMetrics.averageDailyProfit = overallMetrics.totalProfit / totalDays;
  overallMetrics.averageMonthlyProfit = (overallMetrics.totalProfit / totalDays) * 30;
  overallMetrics.avergaeDailyProfitPercentage =
    (overallMetrics.averageDailyProfit / overallMetrics.maxCapitalInvested) * 100;
  overallMetrics.averageMonthlyProfitPercentage =
    (overallMetrics.averageMonthlyProfit / overallMetrics.maxCapitalInvested) * 100;

  return {
    // allOrders,
    overallMetrics,
  };
}

// Not a pure function
function createSupportOrder({
  supportingOrderCount,
  supportOrderTarget,
  priceDeviationPercentage,
  supportOrderAmount,
  currentDCAOrders,
  orderTime,
  takeProfitPercentage,
  allOrders,
  enableCustomSupportOrders,
  customSupportOrderDeviation,
  customerSupportOrderAmountScale,
  supportOrderAmountScale,
}) {
  // Update the supporting order count first as index starts from 0
  supportingOrderCount++;

  let orderPrice = supportOrderTarget;

  // Find new support order target
  let supportOrderPriceDeviation = priceDeviationPercentage;
  if (enableCustomSupportOrders) {
    const supportOrderPriceDeviationVal = parseFloat(customSupportOrderDeviation[supportingOrderCount]);
    supportOrderPriceDeviation = supportOrderPriceDeviationVal / 100;
  }
  supportOrderTarget = orderPrice * (1 - supportOrderPriceDeviation);

  // Find order amount for current support order
  let orderAmout = supportOrderAmount;
  if (enableCustomSupportOrders) {
    orderAmout = supportOrderAmount * customerSupportOrderAmountScale[supportingOrderCount];
  } else if (supportingOrderCount > 1) {
    orderAmout = currentDCAOrders[currentDCAOrders.length - 1].amount * supportOrderAmountScale;
  }

  // Find take profit target
  const { averagePrice } = getOrdersInfo([
    ...currentDCAOrders,
    {
      amount: supportOrderAmount,
      quantity: supportOrderAmount / supportOrderTarget,
    },
  ]);
  const takeProfitTarget = averagePrice * (1 + takeProfitPercentage);

  const order = {
    type: "buy",
    price: orderPrice,
    amount: orderAmout,
    quantity: orderAmout / orderPrice,
    supportingOrderCount: `S${supportingOrderCount}`,
    takeProfitTarget,
    supportOrderTarget,
    orderTime,
  };

  allOrders.push(order);
  currentDCAOrders.push(order);

  return {
    tpTarget: takeProfitTarget,
    soCount: supportingOrderCount,
    soTarget: supportOrderTarget,
  };
}

function getUpdatedMetricsForTP({ overallMetrics, takeProfitOrder, currentDCAOrders, supportingOrderCount }) {
  const tempOverallMetrics = { ...overallMetrics };
  tempOverallMetrics.totalProfit += takeProfitOrder.profit;
  tempOverallMetrics.totalCompletedTakeProfitOrders += 1;

  // Get total investment of current DCA Orders
  const totakCapitalForCurrentOrders = currentDCAOrders.reduce((acc, curr) => {
    return acc + curr.amount;
  }, 0);

  // Calculate maximum capital invested
  tempOverallMetrics.maxCapitalInvested =
    totakCapitalForCurrentOrders > tempOverallMetrics.maxCapitalInvested
      ? totakCapitalForCurrentOrders
      : tempOverallMetrics.maxCapitalInvested;

  // Calculate maximum support orders count
  tempOverallMetrics.maxSupportOrdersCount =
    supportingOrderCount > tempOverallMetrics.maxSupportOrdersCount
      ? supportingOrderCount
      : tempOverallMetrics.maxSupportOrdersCount;

  // Update the DCA combinations count
  if (tempOverallMetrics.dcaCombinations[supportingOrderCount]) {
    tempOverallMetrics.dcaCombinations[supportingOrderCount] =
      tempOverallMetrics.dcaCombinations[supportingOrderCount] + 1;
  } else {
    tempOverallMetrics.dcaCombinations[supportingOrderCount] = 1;
  }

  return tempOverallMetrics;
}

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
