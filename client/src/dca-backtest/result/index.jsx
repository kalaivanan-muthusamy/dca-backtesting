import { format, parse } from "date-fns";
import React, { useEffect, useState } from "react";
import { Tabs, Tab } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const data = [
  {
    name: "Page A",
    uv: 4000,
    pv: 2400,
    amt: 2400,
  },
  {
    name: "Page B",
    uv: 3000,
    pv: 1398,
    amt: 2210,
  },
  {
    name: "Page C",
    uv: 2000,
    pv: 9800,
    amt: 2290,
  },
  {
    name: "Page D",
    uv: 2780,
    pv: 3908,
    amt: 2000,
  },
  {
    name: "Page E",
    uv: 1890,
    pv: 4800,
    amt: 2181,
  },
  {
    name: "Page F",
    uv: 2390,
    pv: 3800,
    amt: 2500,
  },
  {
    name: "Page G",
    uv: 3490,
    pv: 4300,
    amt: 2100,
  },
];

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
    allOrders.map((order) => {
      if (order.type === "sell") {
        const month = format(parse(order.orderTime, "dd-MM-yyyy HH:mm:ss", new Date()), "MM-yyyy");
        if (monthlyProfit[month]) {
          monthlyProfit[month] = monthlyProfit[month] + order.profit;
        } else {
          monthlyProfit[month] = order.profit;
        }
      }
    });
    console.log(monthlyProfit);
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
        {/* {allOrders.length > 0 && (
          <table className="table table-striped">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Order Time</th>
                <th>Order Type</th>
                <th>Price</th>
                <th>Amount</th>
                <th>Quantity</th>
                <th>TP Target</th>
                <th>SO Target</th>
                <th>Profit</th>
                <th>DCA Count</th>
              </tr>
            </thead>
            <tbody>
              {allOrders?.map((order, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{order.orderTime}</td>
                  <td>
                    <span className={order.type === "sell" ? "text-success fw-bold" : ""}>{order.type}</span>
                  </td>
                  <td>{(order.price || 0).toFixed(2)}</td>
                  <td>{order.amount}</td>
                  <td>{order.quantity}</td>
                  <td>{(order.takeProfitTarget || 0).toFixed(2)}</td>
                  <td>{(order.supportOrderTarget || 0).toFixed(2)}</td>
                  <td>{(order.profit || 0).toFixed(2)}</td>
                  <td>{order.supportingOrderCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )} */}
      </Tab>
      <Tab eventKey="profitDetails" title="Profit Details">
        <ResponsiveContainer width="100%" height={500}>
          <BarChart
            width={500}
            height={300}
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="pv" fill="#8884d8" />
            <Bar dataKey="uv" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </Tab>
    </Tabs>
  );
}

export default React.memo(BacktestResults);
