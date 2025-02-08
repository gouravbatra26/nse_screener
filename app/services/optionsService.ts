interface NSEOptionChainResponse {
  records: {
    underlyingValue: number;
    data: Array<{
      strikePrice: number;
      expiryDate: string;
      CE?: {
        lastPrice: number;
        change: number;
        openInterest: number;
        totalTradedVolume: number;
      };
      PE?: {
        lastPrice: number;
        change: number;
        openInterest: number;
        totalTradedVolume: number;
      };
    }>;
  };
  expiryDates: string[];
}

export const fetchOptionsData = async (symbol: string = 'NIFTY') => {
  try {
    const response = await fetch(`/api/options?symbol=${symbol}`);

    if (!response.ok) {
      throw new Error('Failed to fetch options data');
    }

    const data: NSEOptionChainResponse = await response.json();
    
    return {
      expiryDates: data.expiryDates,
      underlyingValue: data.records.underlyingValue,
      data: data.records.data.filter(item => 
        item.strikePrice && (item.CE || item.PE)
      )
    };
  } catch (error) {
    console.error('Error fetching options data:', error);
    throw error;
  }
}; 