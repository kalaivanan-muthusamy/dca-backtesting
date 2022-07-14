import { format, parse } from "date-fns";
import React, { useEffect, useState } from "react";
import { Tabs, Tab, Tooltip as ReactTooltip, Popover } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const columns = [
  {
    name: "Order Time",
    selector: (row) => row.orderTime,
    width: "160px",
  },
  {
    name: "Type",
    selector: (row) => row.type,
    width: "60px",
  },
  {
    name: "Price",
    selector: (row) => row.price,
    format: (row) => row.price?.toFixed(2),
    width: "100px",
  },
  {
    name: "Amount",
    selector: (row) => row.amount,
    format: (row) => row.amount?.toFixed(2),
    width: "100px",
  },
  {
    name: "Quantity",
    selector: (row) => row.quantity,
    width: "200px",
  },
  {
    name: "TP Target",
    selector: (row) => row.takeProfitTarget,
    format: (row) => row.takeProfitTarget?.toFixed(2),
  },
  {
    name: "SO Target",
    selector: (row) => row.supportOrderTarget,
    format: (row) => row.supportOrderTarget?.toFixed(2),
  },
  {
    name: "Profit",
    selector: (row) => row.profit,
    format: (row) => row.profit?.toFixed(2),
  },
  {
    name: "SO",
    selector: (row) => row.supportingOrderCount,
  },
];

function BacktestResults({ overallMetrics = {}, allOrders = [] }) {
  const [profitDetails, setProfitDetails] = useState([]);
  console.log("Component changed");

  useEffect(() => {
    getProfitDetails();
  }, [allOrders]);

  function getProfitDetails() {
    const monthlyProfit = {};
    const investment = overallMetrics.maxCapitalInvested;
    allOrders.map((order) => {
      if (order.type === "sell") {
        const month = format(parse(order.orderTime, "dd-MM-yyyy HH:mm:ss", new Date()), "MM-yyyy");
        if (monthlyProfit[month]) {
          monthlyProfit[month] = {
            profit: monthlyProfit[month].profit + order.profit,
            totalCompletedOrders: monthlyProfit[month].totalCompletedOrders + 1,
          };
        } else {
          monthlyProfit[month] = {
            profit: order.profit,
            totalCompletedOrders: 1,
          };
        }
      }
    });
    const profitDetails = Object.keys(monthlyProfit).map((key) => {
      const profit = monthlyProfit[key].profit;
      const totalCompletedOrders = monthlyProfit[key].totalCompletedOrders;
      const profitPercentage = parseFloat(((profit / investment) * 100).toFixed(2));
      return { month: key, profit, profitPercentage, totalCompletedOrders };
    });
    setProfitDetails(profitDetails);
  }

  return (
    <Tabs mountOnEnter defaultActiveKey="overview" id="result" className="mb-3">
      <Tab eventKey="overview" title="Overview">
        <>
          <pre>{JSON.stringify(overallMetrics, null, 2)}</pre>
        </>
      </Tab>
      <Tab eventKey="orders" title="Orders">
        <DataTable columns={columns} data={allOrders} pagination dense highlightOnHover pointerOnHover />
      </Tab>
      <Tab eventKey="profitDetails" title="Profit Details">
        <ResponsiveContainer width="100%" height={500}>
          <BarChart
            width={500}
            height={300}
            data={profitDetails}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip content={renderTooltip} />
            <Legend />
            <Bar dataKey="profit" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </Tab>
    </Tabs>
  );
}

const renderTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload?.[0]?.payload;
    return (
      <div className="tooltip-inner text-start">
        <div>Month: {data.month}</div>
        <div>Completed Orders: {data.totalCompletedOrders}</div>
        <div>Profit: {data.profit}</div>
        <div>Profit Percentage: {data.profitPercentage}%</div>
      </div>
    );
  }
};

export default React.memo(BacktestResults);
