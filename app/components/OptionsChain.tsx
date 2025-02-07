'use client';

import { useEffect, useState } from 'react';
import { fetchOptionsData } from '../services/optionsService';

interface OptionData {
  strikePrice: number;
  expiryDate: string;
  calls: {
    lastPrice: number;
    change: number;
    openInterest: number;
    volume: number;
  };
  puts: {
    lastPrice: number;
    change: number;
    openInterest: number;
    volume: number;
  };
}

const OptionsChain = () => {
  const [allOptionsData, setAllOptionsData] = useState<OptionData[]>([]);
  const [filteredOptionsData, setFilteredOptionsData] = useState<OptionData[]>([]);
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data only once
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetchOptionsData();
        
        setExpiryDates(response.expiryDates);
        if (!selectedExpiry && response.expiryDates.length > 0) {
          setSelectedExpiry(response.expiryDates[0]);
        }

        // Transform and store all data
        const transformedData: OptionData[] = response.data
          .filter(item => item.CE || item.PE)
          .map(item => ({
            strikePrice: item.strikePrice,
            expiryDate: item.expiryDate,
            calls: {
              lastPrice: item.CE?.lastPrice || 0,
              change: item.CE?.change || 0,
              openInterest: item.CE?.openInterest || 0,
              volume: item.CE?.totalTradedVolume || 0
            },
            puts: {
              lastPrice: item.PE?.lastPrice || 0,
              change: item.PE?.change || 0,
              openInterest: item.PE?.openInterest || 0,
              volume: item.PE?.totalTradedVolume || 0
            }
          }));

        setAllOptionsData(transformedData);
        setError(null);
      } catch (err) {
        setError('Failed to fetch options data. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up auto-refresh every 1 hour
    const intervalId = setInterval(fetchData, 3600000);
    return () => clearInterval(intervalId);
  }, []);

  // Filter data when expiry changes
  useEffect(() => {
    if (selectedExpiry && allOptionsData.length > 0) {
      const filtered = allOptionsData
        .filter(item => item.expiryDate === selectedExpiry)
        // Filter out strikes where either calls or puts have 0 volume or 0 OI
        .filter(item => 
          (item.calls.volume > 0 && item.calls.openInterest > 0) ||
          (item.puts.volume > 0 && item.puts.openInterest > 0)
        );
      setFilteredOptionsData(filtered);
    }
  }, [selectedExpiry, allOptionsData]);

  // Function to calculate the relative width of OI bars
  const getOIBarWidth = (value: number, maxOI: number) => {
    return `${(value / maxOI) * 100}%`;
  };

  // Function to render OI cell with visualization
  const renderOICell = (value: number, isCall: boolean, maxOI: number) => {
    return (
      <td className="p-2 border text-right relative min-w-[120px]">
        <div className="relative z-10">{value.toLocaleString()}</div>
        <div 
          className={`absolute inset-0 opacity-20 ${isCall ? 'bg-blue-500' : 'bg-red-500'}`}
          style={{ 
            width: getOIBarWidth(value, maxOI),
            [isCall ? 'right' : 'left']: 0
          }}
        />
      </td>
    );
  };

  // Calculate max OI for scaling
  const maxOI = Math.max(
    ...filteredOptionsData.map(row => Math.max(row.calls.openInterest, row.puts.openInterest))
  );

  // Function to calculate straddle price
  const calculateStraddlePrice = (callPrice: number, putPrice: number) => {
    return callPrice + putPrice;
  };

  if (loading) {
    return (
      <div className="w-full text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4">Loading options data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full text-center py-8 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">NIFTY50 Options Chain</h2>
        <select
          className="px-4 py-2 border rounded-md bg-white dark:bg-gray-800"
          value={selectedExpiry}
          onChange={(e) => setSelectedExpiry(e.target.value)}
        >
          {expiryDates.map(date => (
            <option key={date} value={date}>
              {new Date(date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex gap-4">
        {/* Main Options Chain Table */}
        <div className="flex-1">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th colSpan={4} className="p-2 border">CALLS</th>
                <th className="p-2 border">Strike Price</th>
                <th colSpan={4} className="p-2 border">PUTS</th>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="p-2 border">LTP</th>
                <th className="p-2 border">Change</th>
                <th className="p-2 border">OI</th>
                <th className="p-2 border">Volume</th>
                <th className="p-2 border"></th>
                <th className="p-2 border">LTP</th>
                <th className="p-2 border">Change</th>
                <th className="p-2 border">OI</th>
                <th className="p-2 border">Volume</th>
              </tr>
            </thead>
            <tbody>
              {filteredOptionsData.map((row) => (
                <tr key={row.strikePrice} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="p-2 border text-right">{row.calls.lastPrice.toFixed(2)}</td>
                  <td className={`p-2 border text-right ${row.calls.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.calls.change > 0 ? '+' : ''}{row.calls.change.toFixed(2)}
                  </td>
                  {renderOICell(row.calls.openInterest, true, maxOI)}
                  <td className="p-2 border text-right">{row.calls.volume.toLocaleString()}</td>
                  <td className="p-2 border text-center font-bold">{row.strikePrice.toLocaleString()}</td>
                  <td className="p-2 border text-right">{row.puts.lastPrice.toFixed(2)}</td>
                  <td className={`p-2 border text-right ${row.puts.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.puts.change > 0 ? '+' : ''}{row.puts.change.toFixed(2)}
                  </td>
                  {renderOICell(row.puts.openInterest, false, maxOI)}
                  <td className="p-2 border text-right">{row.puts.volume.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Straddle Price Table */}
        <div className="w-64">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="p-2 border">Strike Price</th>
                <th className="p-2 border">Straddle</th>
              </tr>
            </thead>
            <tbody>
              {filteredOptionsData.map((row) => {
                const straddlePrice = calculateStraddlePrice(
                  row.calls.lastPrice,
                  row.puts.lastPrice
                );
                return (
                  <tr key={row.strikePrice} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="p-2 border text-center font-bold">
                      {row.strikePrice.toLocaleString()}
                    </td>
                    <td className="p-2 border text-right">
                      {straddlePrice.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-4 justify-end text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 opacity-20"></div>
          <span>Calls OI</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 opacity-20"></div>
          <span>Puts OI</span>
        </div>
      </div>
    </div>
  );
};

export default OptionsChain; 