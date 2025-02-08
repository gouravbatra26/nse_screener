export interface NSEStock {
  symbol: string;
  identifier?: string;
  open: number;
  dayHigh: number;
  dayLow: number;
  lastPrice: number;
  previousClose: number;
  change: number;
  pChange: number;
  totalTradedVolume: number;
  totalTradedValue: number;
  lastUpdateTime: string;
  yearHigh: number;
  yearLow: number;
  perChange365d: number;
  perChange30d: number;
  marketCap: number;
  series?: string;
  isin?: string;
}

export const fetchNSEStocks = async (): Promise<NSEStock[]> => {
  try {
    const response = await fetch('/api/stocks', {
      next: { revalidate: 60 } // Revalidate every minute
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch stocks');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching NSE data:', error);
    throw error;
  }
}; 