'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchOptionsData } from '../services/optionsService';
import AllExpiryTable from './AllExpiryTable';

// At the top of the file, add export to the interface
export interface OptionData {
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

// Update the interface for strike filter to handle both stages
interface StrikeFilter {
  multiple: 'none' | '100' | '500';
  showATM: boolean;
}

// Update the symbol type to include the correct format
// type IndexSymbol = 'NIFTY' | 'BANKNIFTY';

// Add new interfaces and state
interface StraddleAction {
  strikePrice: number;
  position: 'buy' | 'sell' | null;
  x: number;  // Mouse click X coordinate
  y: number;  // Mouse click Y coordinate
  straddlePrice: number;  // Add this
}

// Remove the index selector from the component
// Update the component to accept a defaultIndex prop
interface OptionsChainProps {
  defaultIndex: 'NIFTY' | 'BANKNIFTY';
}

// Add new type for view mode
type ViewMode = 'normal' | 'allExpiry';

const OptionsChain = ({ defaultIndex }: OptionsChainProps) => {
  const [allOptionsData, setAllOptionsData] = useState<OptionData[]>([]);
  const [filteredOptionsData, setFilteredOptionsData] = useState<OptionData[]>([]);
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [strikeFilter, setStrikeFilter] = useState<StrikeFilter>({
    multiple: 'none',
    showATM: true
  });
  const [spotPrice, setSpotPrice] = useState<number>(0);
  const [selectedStraddle, setSelectedStraddle] = useState<StraddleAction | null>(null);
  // Add view mode state
  const [viewMode, setViewMode] = useState<ViewMode>('normal');

  // Wrap findATMStrike in useCallback
  const findATMStrike = useCallback((data: OptionData[]) => {
    if (data.length === 0 || spotPrice === 0) return 0;
    
    const sortedStrikes = [...data].sort((a, b) => 
      Math.abs(a.strikePrice - spotPrice) - Math.abs(b.strikePrice - spotPrice)
    );

    return sortedStrikes[0].strikePrice;
  }, [spotPrice]);

  // Fetch data only once
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetchOptionsData(defaultIndex);
        
        setExpiryDates(response.expiryDates);
        setSpotPrice(response.underlyingValue);
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
        console.error('Error in fetchData:', err);
        setError('Failed to fetch options data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up auto-refresh every 1 hour
    const intervalId = setInterval(fetchData, 3600000);
    return () => clearInterval(intervalId);
  }, [defaultIndex, selectedExpiry]);

  // Update the filtering logic in useEffect
  useEffect(() => {
    if (selectedExpiry && allOptionsData.length > 0) {
      let filtered = allOptionsData
        .filter(item => item.expiryDate === selectedExpiry);

      // First stage: Filter by multiples
      if (strikeFilter.multiple !== 'none') {
        const multiple = parseInt(strikeFilter.multiple);
        filtered = filtered.filter(item => item.strikePrice % multiple === 0);
      }

      // Second stage: Filter by ATM range if enabled
      if (strikeFilter.showATM) {
        const atmStrike = findATMStrike(filtered);
        filtered = filtered
          .filter(item => {
            const strikeDiff = Math.abs(item.strikePrice - atmStrike);
            const numStrikes = Math.floor(strikeDiff / 50);
            return numStrikes <= 10;
          });
      }

      // Sort by strike price
      filtered = filtered.sort((a, b) => a.strikePrice - b.strikePrice);
      
      setFilteredOptionsData(filtered);
    }
  }, [selectedExpiry, allOptionsData, strikeFilter, spotPrice, findATMStrike]);

  // Function to calculate the relative width of OI bars
  const getOIBarWidth = (value: number, maxOI: number) => {
    return `${(value / maxOI) * 100}%`;
  };

  // Function to render OI cell with visualization
  const renderOICell = (value: number, isCall: boolean, maxOI: number) => {
    return (
      <td className="p-1.5 border text-right relative min-w-[100px]">
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

  // Get ATM strike for current filtered data
  const atmStrike = findATMStrike(filteredOptionsData);

  // Add the Overlay component
  const StraddleOverlay = ({ straddle, onClose }: { 
    straddle: StraddleAction, 
    onClose: () => void 
  }) => {
    return (
      <>
        <div 
          className="fixed inset-0 z-40" 
          onClick={onClose}
        />
        <div 
          className="fixed z-50 bg-white/95 rounded-lg shadow-xl w-48 border border-gray-200/50 backdrop-blur-sm ring-1 ring-black/5"
          style={{
            left: `${straddle.x}px`,
            top: `${straddle.y}px`,
            transform: 'translate(-50%, 10px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div className="p-2 border-b border-gray-200/70 text-center bg-gray-50/50">
            <div className="text-sm font-semibold">
              {straddle.strikePrice.toLocaleString()} @ ₹{straddle.straddlePrice.toFixed(2)}
            </div>
          </div>
          <div className="p-2 space-y-2 bg-white/80">
            <button
              onClick={() => {
                console.log('Buy Straddle at', straddle.strikePrice, 'Price:', straddle.straddlePrice);
                onClose();
              }}
              className="w-full py-1.5 px-3 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors shadow-sm"
            >
              Buy Straddle
            </button>
            <button
              onClick={() => {
                console.log('Sell Straddle at', straddle.strikePrice, 'Price:', straddle.straddlePrice);
                onClose();
              }}
              className="w-full py-1.5 px-3 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors shadow-sm"
            >
              Sell Straddle
            </button>
          </div>
        </div>
      </>
    );
  };

  // Add this helper function back
  const filterOptions = ({ defaultIndex }: { defaultIndex: 'NIFTY' | 'BANKNIFTY' }) => {
    if (defaultIndex === 'NIFTY') {
      return [
        { value: 'none', label: 'All' },
        { value: '100', label: '×100' },
        { value: '500', label: '×500' },
      ];
    }
    return [
      { value: 'none', label: 'All' },
      { value: '500', label: '×500' },
    ];
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
    <div className="w-full">
      <div className="flex flex-col gap-4 mb-4">
        {/* Header with all controls in one row */}
        <div className="flex items-center gap-4">
          <select
            value={selectedExpiry}
            onChange={(e) => setSelectedExpiry(e.target.value)}
            className="border p-2 rounded"
          >
            {expiryDates.map((date) => (
              <option key={date} value={date}>
                {new Date(date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              // Implement refresh logic
            }}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>

          {/* View Toggle moved here */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                viewMode === 'normal'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setViewMode('normal')}
            >
              Normal View
            </button>
            <button
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                viewMode === 'allExpiry'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setViewMode('allExpiry')}
            >
              All Expiry
            </button>
          </div>
        </div>

        {/* Add Strike Filter UI */}
        <div className="flex flex-wrap gap-6 bg-gray-50 p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
              </svg>
              <span className="font-medium">Strike Filter:</span>
            </div>
            <div className="flex gap-3 bg-white p-1 rounded-lg shadow-sm">
              {filterOptions({ defaultIndex }).map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer transition-colors ${
                    strikeFilter.multiple === option.value
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="radio"
                    className="hidden"
                    name="strikeMultiple"
                    checked={strikeFilter.multiple === option.value}
                    onChange={() => setStrikeFilter(prev => ({ ...prev, multiple: option.value as 'none' | '100' | '500' }))}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            <label
              className={`flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer transition-colors ${
                strikeFilter.showATM
                  ? 'bg-blue-500 text-white'
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              <input
                type="checkbox"
                className="hidden"
                checked={strikeFilter.showATM}
                onChange={(e) => setStrikeFilter(prev => ({ ...prev, showATM: e.target.checked }))}
              />
              <span>ATM ±10</span>
            </label>
          </div>
        </div>
      </div>

      {/* Rest of the component */}
      {viewMode === 'normal' ? (
        <div className="flex gap-4">
          {/* Main Options Chain Table */}
          <div className="flex-1 max-w-5xl">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th colSpan={4} className="p-1.5 border border-gray-200 text-sm">CALLS</th>
                  <th className="p-1.5 border border-gray-200 text-sm">Strike Price</th>
                  <th colSpan={4} className="p-1.5 border border-gray-200 text-sm">PUTS</th>
                </tr>
                <tr className="bg-gray-50">
                  <th className="p-1.5 border border-gray-200 text-sm w-20">LTP</th>
                  <th className="p-1.5 border border-gray-200 text-sm w-20">Change</th>
                  <th className="p-1.5 border border-gray-200 text-sm w-24">OI</th>
                  <th className="p-1.5 border border-gray-200 text-sm w-20">Volume</th>
                  <th className="p-1.5 border border-gray-200 text-sm w-24"></th>
                  <th className="p-1.5 border border-gray-200 text-sm w-20">LTP</th>
                  <th className="p-1.5 border border-gray-200 text-sm w-20">Change</th>
                  <th className="p-1.5 border border-gray-200 text-sm w-24">OI</th>
                  <th className="p-1.5 border border-gray-200 text-sm w-20">Volume</th>
                </tr>
              </thead>
              <tbody>
                {filteredOptionsData.map((row) => (
                  <tr 
                    key={row.strikePrice} 
                    className={`hover:bg-gray-50 cursor-pointer ${
                      row.strikePrice === atmStrike 
                        ? 'bg-blue-50' 
                        : ''
                    }`}
                    onClick={(e) => {
                      const straddlePrice = calculateStraddlePrice(
                        row.calls.lastPrice,
                        row.puts.lastPrice
                      );
                      setSelectedStraddle({ 
                        strikePrice: row.strikePrice, 
                        position: null,
                        x: e.clientX,
                        y: e.clientY,
                        straddlePrice
                      });
                    }}
                  >
                    <td className="p-1.5 border border-gray-200 text-right">{row.calls.lastPrice.toFixed(2)}</td>
                    <td className={`p-1.5 border border-gray-200 text-right ${
                      row.calls.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {row.calls.change > 0 ? '+' : ''}{row.calls.change.toFixed(2)}
                    </td>
                    {renderOICell(row.calls.openInterest, true, maxOI)}
                    <td className="p-1.5 border border-gray-200 text-right">{row.calls.volume.toLocaleString()}</td>
                    <td className={`p-1.5 border border-gray-200 text-center font-bold ${
                      row.strikePrice === atmStrike 
                        ? 'text-blue-600'
                        : ''
                    }`}>
                      {row.strikePrice === atmStrike && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-6">
                          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      {row.strikePrice.toLocaleString()}
                    </td>
                    <td className="p-1.5 border border-gray-200 text-right">{row.puts.lastPrice.toFixed(2)}</td>
                    <td className={`p-1.5 border border-gray-200 text-right ${
                      row.puts.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {row.puts.change > 0 ? '+' : ''}{row.puts.change.toFixed(2)}
                    </td>
                    {renderOICell(row.puts.openInterest, false, maxOI)}
                    <td className="p-1.5 border border-gray-200 text-right">{row.puts.volume.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Straddle Price Table */}
          <div className="w-64">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border border-gray-200">Strike Price</th>
                  <th className="p-2 border border-gray-200">Straddle</th>
                  <th className="p-2 border border-gray-200">Change</th>
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
                    <tr 
                      key={row.strikePrice} 
                      className={`hover:bg-gray-50 cursor-pointer ${
                        row.strikePrice === atmStrike 
                          ? 'bg-blue-50' 
                          : ''
                      }`}
                      onClick={(e) => {
                        const straddlePrice = calculateStraddlePrice(
                          row.calls.lastPrice,
                          row.puts.lastPrice
                        );
                        setSelectedStraddle({ 
                          strikePrice: row.strikePrice, 
                          position: null,
                          x: e.clientX,
                          y: e.clientY,
                          straddlePrice
                        });
                      }}
                    >
                      <td className={`p-2 border border-gray-200 text-center font-bold ${
                        row.strikePrice === atmStrike 
                          ? 'text-blue-600'
                          : ''
                      }`}>
                        {row.strikePrice.toLocaleString()}
                      </td>
                      <td className="p-2 border border-gray-200 text-right">
                        {straddlePrice.toFixed(2)}
                      </td>
                      <td className={`p-2 border border-gray-200 text-right ${
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
      ) : (
        <AllExpiryTable
          optionsData={allOptionsData}
          expiryDates={expiryDates}
          atmStrike={atmStrike}
          strikeFilter={strikeFilter}
        />
      )}

      {/* Add the overlay at the end of the component return statement */}
      {selectedStraddle && (
        <StraddleOverlay
          straddle={selectedStraddle}
          onClose={() => setSelectedStraddle(null)}
        />
      )}
    </div>
  );
};

export default OptionsChain; 