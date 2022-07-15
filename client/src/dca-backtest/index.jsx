import axios from "axios";
import { differenceInDays, format, parse } from "date-fns";
import React, { useMemo, useState, useCallback } from "react";
import { Tabs, Tab, Form, Button, Row, Col, Spinner } from "react-bootstrap";
import { DCA_PRESET } from "./config";
import BacktestResults from "./result";

function DCABackTest() {
  const [loading, setLoading] = useState(false);
  const [formInputs, setFormInputs] = useState({
    exchange: "BINANCE",
    asset: "BTCUSDT",
    startDate: "2020-07-01",
    endDate: "2022-07-01",
    ...DCA_PRESET.BTC_12_4,
  });
  const [allOrders, setAllOrders] = useState([]);
  const [overallMetrics, setOverallMetrics] = useState({});

  function onFormInputChange(key, event, index) {
    if (key === "customerSupportOrderAmountScale" || key === "customSupportOrderDeviation") {
      const customValue = formInputs[key];
      customValue[index] = parseFloat(event.target.value);
      setFormInputs({
        ...formInputs,
        [key]: customValue,
      });
    } else {
      setFormInputs((formInputs) => ({
        ...formInputs,
        [key]: event?.target?.value,
      }));
    }
  }

  async function getBackestDetails() {
    setLoading(true);
    // setOverallMetrics({});
    // setAllOrders([]);
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/backtest`, {
      ...formInputs,
    });
    setOverallMetrics(res?.data?.overallMetrics);
    setAllOrders(res?.data?.allOrders);
    setLoading(false);
  }

  return (
    <div>
      <Form>
        <Tabs defaultActiveKey="base-settings" className="mb-3 mt-5">
          <Tab eventKey="base-settings" title="Base Settings">
            <Form.Group className="mb-3">
              <Form.Label>Exchange</Form.Label>
              <Form.Select aria-label="Exchange" onChange={(e) => onFormInputChange("exchange", e)}>
                <option value="BINANCE">Binance</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Asset</Form.Label>
              <Form.Select aria-label="Asset" onChange={(e) => onFormInputChange("asset", e)}>
                <option value="BTCUSDT">BTC/USDT</option>
                <option value="ETHUSDT">ETH/USDT</option>
                <option value="DOGEUSDT">DOGE/USDT</option>
                <option value="BNBUSDT">BNB/USDT</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Base Order Amount</Form.Label>
              <Form.Control
                onChange={(e) => onFormInputChange("baseOrderAmount", e)}
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
                onChange={(e) => onFormInputChange("startDate", e)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Backtest End Date</Form.Label>
              <Form.Control
                type="date"
                placeholder="End Date"
                value={formInputs?.endDate}
                onChange={(e) => onFormInputChange("endDate", e)}
              />
            </Form.Group>
          </Tab>
          <Tab eventKey="averaging-orders" title="Support Orders">
            <Form.Group className="mb-3">
              <Form.Label>Support Orders Amount</Form.Label>
              <Form.Control
                onChange={(e) => onFormInputChange("supportOrderAmount", e)}
                value={formInputs?.supportOrderAmount}
                type="number"
                placeholder="Support Orders Amount"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Price Deviation to Open Support Orders</Form.Label>
              <Form.Control
                onChange={(e) => onFormInputChange("supportOrderPriceDeviationPercentage", e)}
                value={formInputs?.supportOrderPriceDeviationPercentage}
                type="number"
                placeholder="Price Deviation"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Maximum Support Orders Count</Form.Label>
              <Form.Control
                onChange={(e) => onFormInputChange("maximumAveragingOrderCount", e)}
                value={formInputs?.maximumAveragingOrderCount}
                type="number"
                placeholder="Maximum Support Order"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Support Orders Amount Scale</Form.Label>
              <Form.Control
                onChange={(e) => onFormInputChange("supportOrderAmountScale", e)}
                value={formInputs?.supportOrderAmountScale}
                type="number"
                placeholder="Support Orders Amount Scale"
              />
            </Form.Group>
          </Tab>
          <Tab eventKey="take-profit" title="Take Profit">
            <Form.Group className="mb-3">
              <Form.Label>Target profit (%)</Form.Label>
              <Form.Control
                onChange={(e) => onFormInputChange("takeProfitPercentage", e)}
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
                checked={formInputs?.enableCustomSupportOrders}
                onChange={() =>
                  setFormInputs({
                    ...formInputs,
                    enableCustomSupportOrders: !formInputs.enableCustomSupportOrders,
                  })
                }
                label="Enable Custom Support Orders Config"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                checked={formInputs?.enableSmartOrder}
                onChange={() =>
                  setFormInputs({
                    ...formInputs,
                    enableSmartOrder: !formInputs.enableSmartOrder,
                  })
                }
                label="Enable Smart Order"
              />
            </Form.Group>
            {[...new Array(parseInt(formInputs?.maximumAveragingOrderCount))].map((o, index) => {
              return (
                <Row>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>{index + 1} Support Order Amount Scale</Form.Label>
                      <Form.Control
                        onChange={(e) => onFormInputChange("customerSupportOrderAmountScale", e, index + 1)}
                        value={formInputs?.customerSupportOrderAmountScale?.[index + 1]}
                        type="number"
                        placeholder="Support Order Amount Scale"
                      />
                    </Form.Group>
                  </Col>
                  <Col>
                    <Form.Group className="mb-3">
                      <Form.Label>{index + 1} Support Order Price Deviation</Form.Label>
                      <Form.Control
                        onChange={(e) => onFormInputChange("customSupportOrderDeviation", e, index + 1)}
                        value={formInputs?.customSupportOrderDeviation?.[index + 1]}
                        type="number"
                        placeholder="Support Order Price Deviation"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              );
            })}
          </Tab>
        </Tabs>
        <Button onClick={getBackestDetails}>
          {loading ? (
            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
          ) : (
            "Start Backtesting"
          )}
        </Button>
      </Form>

      <Row className="mt-4">
        <Col>
          {Object.keys(overallMetrics || {}).length > 0 && (
            <>
              <h2>Results</h2>
              <BacktestResults overallMetrics={overallMetrics} allOrders={allOrders} />
            </>
          )}
        </Col>
      </Row>
    </div>
  );
}

export default DCABackTest;
