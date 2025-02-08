'use client';

import StockTable from '../components/StockTable';

export default function ScreenerPage() {
  return (
    <div className="w-full">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <StockTable />
      </div>
    </div>
  );
} 