import { useState } from 'react';
import DCABackTest from './dca-backtest';

function App() {
  return (
    <div className="container p-4">
      <h1>DCA Backtesting</h1>
      <DCABackTest />
    </div>
  );
}

export default App;
