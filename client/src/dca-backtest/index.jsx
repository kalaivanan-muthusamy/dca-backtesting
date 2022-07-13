import axios from 'axios';
import { differenceInDays, differenceInMinutes, parse } from 'date-fns';
import React, { useState } from 'react';
import { Tabs, Tab, Form, Button, Row, Col } from 'react-bootstrap';

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

function DCABackTest() {
  const [formInputs, setFormInputs] = useState({
    exchange: 'BINANCE',
    asset: 'BTCUSDT',
    baseOrderAmount: 10,
    averagingOrderAmount: 10,
    priceDeviationPercentage: 2,
    maximumAveragingOrderCount: 20,
    averagingOrderVolumeScale: 1.5,
    takeProfitPercentage: 1,
    startDate: '2021-07-01',
    endDate: '2022-07-01',
    enableCustomAveragingOverVolume: true,
    customAveragingOrderVolumeScale: getDefultVolumeScale(1.5),
    customAveragingOrderDeviation: getDefultDeviation(2),
  });
  const [allOrders, setAllOrders] = useState([]);
  const [overallMetrics, setOverallMetrics] = useState({});

  function onFormInputChange(key, event, index) {
    if (key === 'customAveragingOrderVolumeScale') {
      const customValue = formInputs.customAveragingOrderVolumeScale;
      customValue[index] = parseFloat(event.target.value);
      setFormInputs({
        ...formInputs,
        customAveragingOrderVolumeScale: customValue,
      });
    } else {
      setFormInputs((formInputs) => ({
        ...formInputs,
        [key]: event?.target?.value,
      }));
    }
  }

  async function startBackTest() {
    const startDate = parse(formInputs.startDate, 'yyyy-MM-dd', new Date());
    const endDate = parse(formInputs.endDate, 'yyyy-MM-dd', new Date());
    const totalDays = differenceInDays(endDate, startDate);
    const allData = await getKlineData({
      symbol: formInputs.asset,
      interval: '30m',
      startTime: startDate.getTime(),
      endTime: endDate.getTime(),
    });
    console.log(allData);

    // Start Testing
    const allOrders = [];
    let currentDCAOrders = [];
    let newBaseOrder = true;
    let isOpenBuyOrder = false;
    let sellTarget;
    let nextBuyTarget;
    let averagingOrderCount = 0;
    let overallMetrics = {
      totalOrders: 0,
      totalCompletedSellOrders: 0,
      maxAveragingOrdersCount: 0,
      maxCapitalInvested: 0,
      totalDuration: totalDays,
      totalProfit: 0,
      averageDailyProfit: 0,
      averageMonthlyProfit: 0,
      dcaCombinations: {},
    };
    const priceDeviationPercentage =
      parseFloat(formInputs.priceDeviationPercentage) / 100;
    const takeProfitPercentage =
      parseFloat(formInputs.takeProfitPercentage) / 100;
    const baseOrderAmount = parseFloat(formInputs.baseOrderAmount);
    const averagingOrderAmount = parseFloat(formInputs.averagingOrderAmount);
    const averagingOrderVolumeScale = parseFloat(
      formInputs.averagingOrderVolumeScale
    );
    allData.map((d) => {
      const orderTime = d[0];
      const openPrice = parseFloat(d[1]);
      const highPrice = parseFloat(d[2]);
      const lowPrice = parseFloat(d[3]);
      const closePrice = parseFloat(d[4]);
      if (newBaseOrder) {
        const orderPirce = sellTarget || openPrice;
        sellTarget = orderPirce * (1 + takeProfitPercentage);
        nextBuyTarget = orderPirce * (1 - priceDeviationPercentage);
        const order = {
          newBaseOrder: true,
          type: 'buy',
          price: orderPirce,
          amount: baseOrderAmount,
          quantity: baseOrderAmount / orderPirce,
          time: orderTime,
          sellTarget,
          nextBuyTarget,
        };
        allOrders.push(order);
        currentDCAOrders.push(order);
        isOpenBuyOrder = true;
        newBaseOrder = false;
      } else if (isOpenBuyOrder) {
        // Place sell order if price matches the profit percentage
        if (highPrice >= sellTarget) {
          const { totalInvestment, totalQuantity } =
            getOrdersInfo(currentDCAOrders);
          const sellOrderValue = totalQuantity * sellTarget;
          const profit = sellOrderValue - totalInvestment;
          allOrders.push({
            type: 'sell',
            price: sellTarget,
            time: orderTime,
            quantity: totalQuantity,
            profit,
          });

          const totalCapitalInvested = currentDCAOrders.reduce((acc, curr) => {
            return acc + curr.amount;
          }, 0);
          overallMetrics.totalProfit += profit;
          overallMetrics.totalCompletedSellOrders += 1;
          overallMetrics.maxCapitalInvested =
            totalCapitalInvested > overallMetrics.maxCapitalInvested
              ? totalCapitalInvested
              : overallMetrics.maxCapitalInvested;
          overallMetrics.maxAveragingOrdersCount =
            averagingOrderCount > overallMetrics.maxAveragingOrdersCount
              ? averagingOrderCount
              : overallMetrics.maxAveragingOrdersCount;
          if (overallMetrics.dcaCombinations[averagingOrderCount]) {
            overallMetrics.dcaCombinations[averagingOrderCount] =
              overallMetrics.dcaCombinations[averagingOrderCount] + 1;
          } else {
            overallMetrics.dcaCombinations[averagingOrderCount] = 1;
          }
          averagingOrderCount = 0;
          isOpenBuyOrder = false;
          newBaseOrder = true;
          currentDCAOrders = [];
        }
        // Place averaging order if price matches the deviation percentage
        else if (lowPrice <= nextBuyTarget) {
          averagingOrderCount++;
          let orderPrice = nextBuyTarget;

          // Find new sell target and next buy target
          nextBuyTarget = nextBuyTarget * (1 - priceDeviationPercentage);
          let orderAmout = averagingOrderAmount;
          if (formInputs?.enableCustomAveragingOverVolume) {
            orderAmout =
              averagingOrderAmount *
              formInputs.customAveragingOrderVolumeScale[averagingOrderCount];
          } else if (averagingOrderCount > 1) {
            orderAmout =
              currentDCAOrders[currentDCAOrders.length - 1].amount *
              averagingOrderVolumeScale;
          }

          const { averagePrice } = getOrdersInfo([
            ...currentDCAOrders,
            {
              amount: averagingOrderAmount,
              quantity: averagingOrderAmount / nextBuyTarget,
            },
          ]);
          sellTarget = averagePrice * (1 + takeProfitPercentage);

          const order = {
            type: 'buy',
            price: orderPrice,
            amount: orderAmout,
            quantity: orderAmout / orderPrice,
            averagingOrderCount,
            sellTarget,
            nextBuyTarget,
            time: orderTime,
          };

          allOrders.push(order);
          currentDCAOrders.push(order);
        }
      }
    });

    overallMetrics.totalOrders = allOrders.length;
    overallMetrics.averageDailyProfit = overallMetrics.totalProfit / totalDays;
    overallMetrics.averageMonthlyProfit =
      (overallMetrics.totalProfit / totalDays) * 30;

    // console.table(overallMetrics);
    // console.table(allOrders);
    setAllOrders(allOrders);
    setOverallMetrics(overallMetrics);
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

  async function getKlineData({ symbol, interval, startTime, endTime }) {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/kline`, {
      params: {
        symbol,
        interval,
        startTime,
        endTime,
      },
    });
    return res.data;
  }

  return (
    <div>
      <Form>
        <Tabs defaultActiveKey="base-settings" className="mb-3 mt-5">
          <Tab eventKey="base-settings" title="Base Settings">
            <Form.Group className="mb-3">
              <Form.Label>Exchange</Form.Label>
              <Form.Select
                aria-label="Exchange"
                onChange={(e) => onFormInputChange('exchange', e)}
              >
                <option value="BINANCE">Binance</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Asset</Form.Label>
              <Form.Select
                aria-label="Asset"
                onChange={(e) => onFormInputChange('asset', e)}
              >
                <option value="BTCUSDT">BTC/USDT</option>
                <option value="ETHUSDT">ETH/USDT</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Base Order Amount</Form.Label>
              <Form.Control
                onChange={(e) => onFormInputChange('baseOrderAmount', e)}
                value={formInputs?.baseOrderAmount}
                type="number"
                placeholder="Base Order Amount"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Backtest Start Date</Form.Label>
              <Form.Control
                type="date"
                placeholder="Start Date"
                value={formInputs?.startDate}
                onChange={(e) => onFormInputChange('startDate', e)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Backtest End Date</Form.Label>
              <Form.Control
                type="date"
                placeholder="End Date"
                value={formInputs?.endDate}
                onChange={(e) => onFormInputChange('endDate', e)}
              />
            </Form.Group>
          </Tab>
          <Tab eventKey="averaging-orders" title="Averaging Orders">
            <Form.Group className="mb-3">
              <Form.Label>Averaging Order Amount</Form.Label>
              <Form.Control
                onChange={(e) => onFormInputChange('averagingOrderAmount', e)}
                value={formInputs?.averagingOrderAmount}
                type="number"
                placeholder="Averaging Order Amount"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Price Deviation to Open Averaging Order</Form.Label>
              <Form.Control
                onChange={(e) =>
                  onFormInputChange('priceDeviationPercentage', e)
                }
                value={formInputs?.priceDeviationPercentage}
                type="number"
                placeholder="Price Deviation"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Maximum Averaging Order Count</Form.Label>
              <Form.Control
                onChange={(e) =>
                  onFormInputChange('maximumAveragingOrderCount', e)
                }
                value={formInputs?.maximumAveragingOrderCount}
                type="number"
                placeholder="Maximum Averaging Order"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Averaging Order Volume Scale</Form.Label>
              <Form.Control
                onChange={(e) =>
                  onFormInputChange('averagingOrderVolumeScale', e)
                }
                value={formInputs?.averagingOrderVolumeScale}
                type="number"
                placeholder="Avergaing Order Volume Scale"
              />
            </Form.Group>
          </Tab>
          <Tab eventKey="take-profit" title="Take Profit">
            <Form.Group className="mb-3">
              <Form.Label>Target profit (%)</Form.Label>
              <Form.Control
                onChange={(e) => onFormInputChange('takeProfitPercentage', e)}
                value={formInputs?.takeProfitPercentage}
                type="number"
                placeholder="Target profit (%)"
              />
            </Form.Group>
          </Tab>
          <Tab eventKey="advanced-settings" title="Advanced Settings">
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                checked={formInputs?.customAveragingOrderVolumeScale}
                onChange={() =>
                  setFormInputs({
                    ...formInputs,
                    customAveragingOrderVolumeScale:
                      !formInputs.customAveragingOrderVolumeScale,
                  })
                }
                label="Enable Custom Averaging Order Volume!"
              />
            </Form.Group>
            {[
              ...new Array(parseInt(formInputs?.maximumAveragingOrderCount)),
            ].map((o, index) => {
              return (
                <Row>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        {index + 1} Averaging Order Volume Scale
                      </Form.Label>
                      <Form.Control
                        onChange={(e) =>
                          onFormInputChange(
                            'customAveragingOrderVolumeScale',
                            e,
                            index + 1
                          )
                        }
                        value={
                          formInputs?.customAveragingOrderVolumeScale?.[
                            index + 1
                          ]
                        }
                        type="number"
                        placeholder="Averaging Order Volume Scale"
                      />
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        {index + 1} Averaging Order Deviation
                      </Form.Label>
                      <Form.Control
                        onChange={(e) =>
                          onFormInputChange(
                            'customAveragingOrderDeviation',
                            e,
                            index + 1
                          )
                        }
                        value={
                          formInputs?.customAveragingOrderDeviation?.[index + 1]
                        }
                        type="number"
                        placeholder="Averaging Order Volume Scale"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              );
            })}
          </Tab>
        </Tabs>
        <Button onClick={startBackTest}>Start Backtesting</Button>
        {/* <pre className="pt-3">{JSON.stringify(formInputs, null, 2)}</pre> */}
      </Form>

      <Row className="mt-4">
        <Col>
          <h2>Results</h2>
          <pre>{JSON.stringify(overallMetrics, null, 2)}</pre>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Time</th>
                <th>Order Type</th>
                <th>Price</th>
                <th>Amount</th>
                <th>Quantity</th>
                <th>Sell Target</th>
                <th>Buy Target</th>
                <th>Profit</th>
                <th>DCA Count</th>
              </tr>
            </thead>
            <tbody>
              {allOrders?.map((order, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{order.time}</td>
                  <td>
                    <span
                      className={
                        order.type === 'sell' ? 'text-success fw-bold' : ''
                      }
                    >
                      {order.type}
                    </span>
                  </td>
                  <td>{(order.price || 0).toFixed(2)}</td>
                  <td>{order.amount}</td>
                  <td>{order.quantity}</td>
                  <td>{(order.sellTarget || 0).toFixed(2)}</td>
                  <td>{(order.nextBuyTarget || 0).toFixed(2)}</td>
                  <td>{(order.profit || 0).toFixed(2)}</td>
                  <td>{order.averagingOrderCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Col>
      </Row>
    </div>
  );
}

export default DCABackTest;
