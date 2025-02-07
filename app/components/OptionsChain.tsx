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
  const [showOnlyHundreds, setShowOnlyHundreds] = useState(true);
  const [hideZeroVolumeOI, setHideZeroVolumeOI] = useState(true);
  const [strikeFilter, setStrikeFilter] = useState<'none' | '100' | '500'>('100');

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

  // Filter data when expiry or filter settings change
  useEffect(() => {
    if (selectedExpiry && allOptionsData.length > 0) {
      let filtered = allOptionsData
        .filter(item => item.expiryDate === selectedExpiry);

      // Apply volume/OI filter if enabled
      if (hideZeroVolumeOI) {
        filtered = filtered.filter(item => 
          (item.calls.volume > 0 && item.calls.openInterest > 0) ||
          (item.puts.volume > 0 && item.puts.openInterest > 0)
        );
      }

      // Apply strike multiple filter if enabled
      if (strikeFilter !== 'none') {
        const multiple = strikeFilter === '100' ? 100 : 500;
        filtered = filtered.filter(item => item.strikePrice % multiple === 0);
      }

      setFilteredOptionsData(filtered);
    }
  }, [selectedExpiry, allOptionsData, strikeFilter, hideZeroVolumeOI]);

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

  // Function to calculate straddle change
  const calculateStraddleChange = (callChange: number, putChange: number) => {
    return callChange + putChange;
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
      <div className="flex flex-col gap-2 mb-6">
        <div className="flex justify-between items-center">
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
        <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
              </svg>
              <span>Strike Filter:</span>
            </div>
            <div className="flex gap-2">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  className="form-radio text-blue-500"
                  name="strikeFilter"
                  checked={strikeFilter === 'none'}
                  onChange={() => setStrikeFilter('none')}
                />
                <span>All</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  className="form-radio text-blue-500"
                  name="strikeFilter"
                  checked={strikeFilter === '100'}
                  onChange={() => setStrikeFilter('100')}
                />
                <span>×100</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  className="form-radio text-blue-500"
                  name="strikeFilter"
                  checked={strikeFilter === '500'}
                  onChange={() => setStrikeFilter('500')}
                />
                <span>×500</span>
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative inline-block w-10 h-6 transition duration-200 ease-in-out">
              <input
                type="checkbox"
                className="hidden"
                checked={hideZeroVolumeOI}
                onChange={(e) => setHideZeroVolumeOI(e.target.checked)}
              />
              <div className={`w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                hideZeroVolumeOI ? 'bg-blue-500' : 'bg-gray-300'
              }`}>
                <div className={`w-4 h-4 mt-1 ml-1 bg-white rounded-full shadow transform duration-200 ease-in-out ${
                  hideZeroVolumeOI ? 'translate-x-4' : ''
                }`}></div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path>
              </svg>
              <span>Hide zero volume/OI</span>
            </div>
          </label>
        </div>
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
        <div className="w-80">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="p-2 border">Strike Price</th>
                <th className="p-2 border">Straddle</th>
                <th className="p-2 border">Change</th>
              </tr>
            </thead>
            <tbody>
              {filteredOptionsData.map((row) => {
                const straddlePrice = calculateStraddlePrice(
                  row.calls.lastPrice,
                  row.puts.lastPrice
                );
                const straddleChange = calculateStraddleChange(
                  row.calls.change,
                  row.puts.change
                );
                return (
                  <tr key={row.strikePrice} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="p-2 border text-center font-bold">
                      {row.strikePrice.toLocaleString()}
                    </td>
                    <td className="p-2 border text-right">
                      {straddlePrice.toFixed(2)}
                    </td>
                    <td className={`p-2 border text-right ${
                      straddleChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {straddleChange > 0 ? '+' : ''}
                      {straddleChange.toFixed(2)}
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