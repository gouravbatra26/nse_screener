'use client';

import { useState, useEffect } from 'react';
import HeatMap from './HeatMap';
import { fetchNSEStocks } from '../services/stockService';

interface Stock {
  symbol: string;
  name: string;
  lastPrice: number;
  change: number;
  totalTradedValue: number;
  marketCap: number;
}

type SortField = 'lastPrice' | 'change' | 'totalTradedValue';
type SortDirection = 'asc' | 'desc';

const StockTable = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [sortField, setSortField] = useState<SortField>('totalTradedValue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStockData();
  }, []);

  const fetchStockData = async () => {
    try {
      const nseData = await fetchNSEStocks();
      const formattedData: Stock[] = nseData.map(stock => ({
        symbol: stock.symbol,
        name: stock.symbol,
        lastPrice: stock.lastPrice || 0,
        change: stock.pChange,
        totalTradedValue: stock.totalTradedValue || 0,
        marketCap: stock.marketCap || stock.lastPrice * 1000000000
      }));
      setStocks(formattedData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedStocks = [...stocks].sort((a, b) => {
    // Always keep NIFTY 50 at top
    if (a.symbol === 'NIFTY 50') return -1;
    if (b.symbol === 'NIFTY 50') return 1;
    
    // Normal sorting for other stocks
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return (a[sortField] - b[sortField]) * multiplier;
  });

  const formatTradedValue = (value: number) => {
    if (value >= 10000000) return `${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(2)}L`;
    return value.toLocaleString();
  };

  if (loading) {
    return (
      <div className="w-full text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4">Loading stock data...</p>
      </div>
    );
  }

  const renderTable = () => (
    <div className="overflow-x-auto w-[500px]">
      <table className="w-full border-collapse border border-gray-200 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-1.5 text-left border border-gray-200 w-24">Symbol</th>
            <th className="p-1.5 text-right border border-gray-200 w-20">
              <div className="flex items-center justify-end gap-0.5">
                LTP
              </div>
            </th>
            <th 
              className="p-1.5 text-right border border-gray-200 w-20 cursor-pointer hover:bg-gray-200"
              onClick={() => handleSort('change')}
            >
              <div className="flex items-center justify-end gap-0.5">
                Chg%
                {sortField === 'change' && (
                  <span className="ml-0.5">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
            </th>
            <th 
              className="p-1.5 text-right border border-gray-200 w-24 cursor-pointer hover:bg-gray-200"
              onClick={() => handleSort('totalTradedValue')}
            >
              <div className="flex items-center justify-end gap-0.5">
                Value
                {sortField === 'totalTradedValue' && (
                  <span className="ml-0.5">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedStocks.map((stock) => (
            <tr 
              key={stock.symbol} 
              className={`hover:bg-gray-50 ${
                stock.symbol === 'NIFTY 50' ? 'font-bold bg-gray-50' : ''
              }`}
            >
              <td className="p-1.5 border border-gray-200">{stock.symbol}</td>
              <td className="p-1.5 border border-gray-200 text-right">{stock.lastPrice.toFixed(2)}</td>
              <td className={`p-1.5 border border-gray-200 text-right ${
                stock.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)}%
              </td>
              <td className="p-1.5 border border-gray-200 text-right">
                {formatTradedValue(stock.totalTradedValue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderHeatMap = () => (
    <HeatMap 
      stocks={sortedStocks.map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        marketCap: stock.marketCap,
        change: stock.change
      }))} 
    />
  );

  return (
    <div className="flex gap-8">
      {renderTable()}
      <div className="flex-1 max-w-[800px]">
        {renderHeatMap()}
      </div>
    </div>
  );
};

export default StockTable; 