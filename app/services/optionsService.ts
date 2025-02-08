interface NSEResponse {
  records: {
    data: any[];
    underlyingValue: number;
    strikePrices: number[];
    expiryDates: string[];
  };
  filtered: {
    data: any[];
  };
}

export const fetchOptionsData = async (symbol: string) => {
  try {
    const response = await fetch(`/api/options?symbol=${symbol}`);
    if (!response.ok) {
      throw new Error('Failed to fetch options data');
    }
    
    const data = await response.json();
    
    // Check if we have the data in the expected structure
    if (!data || !data.records) {
      throw new Error('Invalid data structure received from API');
    }

    return {
      expiryDates: data.records.expiryDates || [],
      underlyingValue: data.records.underlyingValue || 0,
      data: (data.records.data || []).filter((item: any) => 
        item.strikePrice && (item.CE || item.PE)
      )
    };

  } catch (error) {
    console.error('Error in fetchOptionsData:', error);
    // Return default/empty values on error
    return {
      expiryDates: [],
      underlyingValue: 0,
      data: []
    };
  }
}; 