import { NextResponse } from 'next/server';

const DEFAULT_SHARES_OUTSTANDING = 1000000000; // 1 billion shares

// Add proper type for the stock data
interface StockData {
  symbol: string;
  marketCap: number;
  totalTradedVolume: number;
  pChange: number;
  lastPrice: number;
}

export async function GET() {
  try {
    // First get the session cookie from NSE website
    const baseURL = 'https://www.nseindia.com';
    const mainPageResponse = await fetch(baseURL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      },
      cache: 'no-store'
    });

    if (!mainPageResponse.ok) {
      throw new Error('Failed to get NSE session');
    }

    // Get all cookies from the response
    const cookies = mainPageResponse.headers.getSetCookie();

    // Make the actual API call with all required headers and cookies
    const apiURL = 'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050';
    const response = await fetch(apiURL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': baseURL,
        'Cookie': cookies.join('; '),
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`NSE API failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Process the data to ensure market cap is available
    const processedData = data.data.map((stock: StockData) => ({
      ...stock,
      marketCap: stock.marketCap || stock.lastPrice * DEFAULT_SHARES_OUTSTANDING
    }));

    return NextResponse.json(processedData);
  } catch (error) {
    console.error('Error fetching from NSE:', error);
    
    // Return mock data as fallback
    const mockData = [
      { symbol: 'RELIANCE', name: 'Reliance Industries', lastPrice: 2500, totalTradedVolume: 5000000, pChange: 2.5 },
      { symbol: 'TCS', name: 'Tata Consultancy Services', lastPrice: 3500, totalTradedVolume: 3000000, pChange: -1.2 },
      { symbol: 'HDFCBANK', name: 'HDFC Bank', lastPrice: 1600, totalTradedVolume: 4000000, pChange: 1.8 },
      { symbol: 'INFY', name: 'Infosys', lastPrice: 1400, totalTradedVolume: 3500000, pChange: -0.5 },
      { symbol: 'ICICIBANK', name: 'ICICI Bank', lastPrice: 950, totalTradedVolume: 3200000, pChange: 1.1 },
      { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', lastPrice: 2600, totalTradedVolume: 2800000, pChange: -0.8 },
      { symbol: 'ITC', name: 'ITC', lastPrice: 440, totalTradedVolume: 2500000, pChange: 0.9 },
      { symbol: 'SBIN', name: 'State Bank of India', lastPrice: 580, totalTradedVolume: 2200000, pChange: 1.5 },
      { symbol: 'BHARTIARTL', name: 'Bharti Airtel', lastPrice: 860, totalTradedVolume: 2000000, pChange: -1.0 },
      { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', lastPrice: 1750, totalTradedVolume: 1800000, pChange: 0.7 },
    ].map(stock => ({
      ...stock,
      marketCap: stock.lastPrice * DEFAULT_SHARES_OUTSTANDING
    }));

    return NextResponse.json(mockData);
  }
} 