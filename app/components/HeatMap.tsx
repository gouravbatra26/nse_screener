'use client';

import { useMemo } from 'react';

interface HeatMapProps {
  stocks: {
    symbol: string;
    name: string;
    marketCap: number;
    change: number;
  }[];
}

const HeatMap = ({ stocks }: HeatMapProps) => {
  // Calculate total market cap for relative sizing
  const totalMarketCap = useMemo(() => 
    stocks.reduce((sum, stock) => sum + stock.marketCap, 0)
  , [stocks]);

  // Get color based on change percentage
  const getColor = (change: number) => {
    if (change > 2) return 'bg-green-600';
    if (change > 0) return 'bg-green-500';
    if (change > -2) return 'bg-red-500';
    return 'bg-red-600';
  };

  // Calculate relative size based on market cap
  const getSize = (marketCap: number) => {
    const percentage = (marketCap / totalMarketCap) * 100;
    if (percentage > 10) return 'col-span-3 row-span-3';
    if (percentage > 5) return 'col-span-2 row-span-2';
    return 'col-span-1 row-span-1';
  };

  // Filter out NIFTY 50 from heat map
  const filteredStocks = stocks.filter(stock => stock.symbol !== 'NIFTY 50');

  return (
    <div className="h-full">
      <div className="aspect-square w-full">
        <div className="grid grid-cols-8 gap-1 h-full">
          {filteredStocks.map((stock) => (
            <div
              key={stock.symbol}
              className={`${getSize(stock.marketCap)} ${getColor(stock.change)} 
                p-2 rounded transition-colors relative group cursor-pointer
                flex items-center justify-center text-center`}
            >
              <div className="flex flex-col items-center">
                <span className="font-bold text-white text-sm">{stock.symbol}</span>
                <span className="text-white text-xs">
                  {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)}%
                </span>
              </div>
              {/* Tooltip */}
              <div className="absolute hidden group-hover:block bg-gray-800 text-white p-2 rounded shadow-lg z-10 top-full left-0 mt-1 whitespace-nowrap">
                <p className="font-bold">{stock.name}</p>
                <p>Market Cap: {(stock.marketCap / 1000).toFixed(2)}K Cr</p>
                <p>Change: {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeatMap; 