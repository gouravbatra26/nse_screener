'use client';

import React, { useState } from 'react';
import type { OptionData } from './OptionsChain';

type ViewType = 'ltp' | 'change' | 'oi';

interface StrikeFilter {
  multiple: 'none' | '100' | '500';
  showATM: boolean;
}

interface AllExpiryTableProps {
  optionsData: OptionData[];
  expiryDates: string[];
  atmStrike: number;
  strikeFilter: StrikeFilter;
}

const AllExpiryTable = ({ 
  optionsData, 
  expiryDates, 
  atmStrike, 
  strikeFilter
}: AllExpiryTableProps) => {
  const [viewType, setViewType] = useState<ViewType>('ltp');

  // Group data by strike price and calculate values
  const groupedData = optionsData.reduce((acc, curr) => {
    if (!acc[curr.strikePrice]) {
      acc[curr.strikePrice] = {};
    }
    acc[curr.strikePrice][curr.expiryDate] = {
      ltp: curr.calls.lastPrice + curr.puts.lastPrice,
      change: curr.calls.change + curr.puts.change,
      callOI: curr.calls.openInterest,
      putOI: curr.puts.openInterest,
      totalOI: curr.calls.openInterest + curr.puts.openInterest
    };
    return acc;
  }, {} as Record<number, Record<string, { 
    ltp: number; 
    change: number;
    callOI: number;
    putOI: number;
    totalOI: number;
  }>>);

  // Calculate max OI for scaling
  const maxOI = Math.max(
    ...Object.values(groupedData).flatMap(strikes => 
      Object.values(strikes).map(data => data.totalOI)
    )
  );

  // Function to calculate relative width for OI bars
  const getOIBarWidth = (value: number) => {
    return `${(value / maxOI) * 100}%`;
  };

  // Get unique strike prices and apply filters
  let strikesPrices = Object.keys(groupedData)
    .map(Number)
    .sort((a, b) => a - b);

  // Apply multiple filter
  if (strikeFilter.multiple !== 'none') {
    const multiple = parseInt(strikeFilter.multiple);
    strikesPrices = strikesPrices.filter(strike => strike % multiple === 0);
  }

  // Apply ATM filter
  if (strikeFilter.showATM) {
    strikesPrices = strikesPrices.filter(strike => {
      const strikeDiff = Math.abs(strike - atmStrike);
      const numStrikes = Math.floor(strikeDiff / 50);
      return numStrikes <= 10;
    });
  }

  return (
    <div className="w-full overflow-x-auto">
      {/* Updated view toggle */}
      <div className="mb-4 flex justify-start">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              viewType === 'ltp'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setViewType('ltp')}
          >
            LTP
          </button>
          <button
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              viewType === 'change'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setViewType('change')}
          >
            Change
          </button>
          <button
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              viewType === 'oi'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setViewType('oi')}
          >
            Total OI
          </button>
        </div>
      </div>

      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-1.5 border border-gray-200 text-sm sticky left-0 bg-gray-100">Strike</th>
            {expiryDates.map(date => (
              <th key={date} className="p-1.5 border border-gray-200 text-sm">
                {new Date(date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short'
                })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {strikesPrices.map(strike => (
            <tr 
              key={strike}
              className={`hover:bg-gray-50 ${strike === atmStrike ? 'bg-blue-50' : ''}`}
            >
              <td className={`p-1.5 border border-gray-200 text-center font-bold sticky left-0 bg-white ${
                strike === atmStrike ? 'text-blue-600' : ''
              }`}>
                {strike.toLocaleString()}
              </td>
              {expiryDates.map(date => {
                const data = groupedData[strike]?.[date];
                let displayValue: string | number = '-';
                let className = viewType === 'oi' 
                  ? 'p-1.5 border border-gray-200 text-right relative' 
                  : 'p-1.5 border border-gray-200 text-right';

                if (data) {
                  switch (viewType) {
                    case 'ltp':
                      displayValue = Math.round(data.ltp).toLocaleString();
                      break;
                    case 'change':
                      const roundedChange = Math.round(data.change);
                      displayValue = `${roundedChange > 0 ? '+' : ''}${roundedChange.toLocaleString()}`;
                      className += roundedChange >= 0 ? ' text-green-600' : ' text-red-600';
                      break;
                    case 'oi':
                      displayValue = data.totalOI.toLocaleString();
                      break;
                  }
                }

                return (
                  <td 
                    key={date} 
                    className={className}
                  >
                    {viewType === 'oi' && data && (
                      <div 
                        className="absolute inset-y-0 right-0 bg-purple-200 opacity-70"
                        style={{ width: getOIBarWidth(data.totalOI) }}
                      />
                    )}
                    <span className="relative z-10">{displayValue}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AllExpiryTable; 