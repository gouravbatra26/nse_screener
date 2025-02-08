import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// Add this interface above the GET function
interface OptionRecord {
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
}

interface NSEResponse {
  records: {
    data: OptionRecord[];
    underlyingValue: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol') || 'NIFTY';

    // Enhanced headers with more browser-like values
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'DNT': '1',
    };

    // First get the main page to set cookies
    const baseURL = 'https://www.nseindia.com';
    
    // Get the main page first
    const mainPageResponse = await fetch(baseURL, {
      headers,
      cache: 'no-store',
    });

    if (!mainPageResponse.ok) {
      throw new Error(`Failed to access main page: ${mainPageResponse.status}`);
    }

    // Get cookies from the main page response
    const cookieHeader = mainPageResponse.headers.get('set-cookie');
    const cookies = cookieHeader ? cookieHeader : '';

    // Wait to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Now get the option chain page to set additional cookies
    const optionChainResponse = await fetch(`${baseURL}/option-chain`, {
      headers: {
        ...headers,
        'Cookie': cookies,
        'Referer': baseURL,
      },
      cache: 'no-store',
    });

    if (!optionChainResponse.ok) {
      throw new Error(`Failed to access option chain page: ${optionChainResponse.status}`);
    }

    // Get additional cookies
    const optionChainCookies = optionChainResponse.headers.get('set-cookie');
    const allCookies = [cookies, optionChainCookies].filter(Boolean).join('; ');

    // Wait again before making the API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Finally, fetch the options data
    const optionsURL = `${baseURL}/api/option-chain-indices?symbol=${symbol}`;
    const optionsResponse = await fetch(optionsURL, {
      headers: {
        ...headers,
        'Cookie': allCookies,
        'Referer': `${baseURL}/option-chain`,
        'Host': 'www.nseindia.com',
        'Origin': 'https://www.nseindia.com',
      },
      cache: 'no-store',
    });

    if (!optionsResponse.ok) {
      const errorText = await optionsResponse.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to fetch options data: ${optionsResponse.status}`);
    }

    const data = await optionsResponse.json() as NSEResponse;
    
    // Fix the type error by explicitly typing the Set values
    const expiryDates = [...new Set(data.records.data.map((item: OptionRecord) => item.expiryDate))]
      .sort((a, b) => {
        // Ensure we're working with strings
        const dateA = new Date(a as string).getTime();
        const dateB = new Date(b as string).getTime();
        return dateA - dateB;
      });
    
    return NextResponse.json({
      data: data.records.data,
      expiryDates,
      underlyingValue: data.records.underlyingValue
    });

  } catch (error) {
    console.error('Error fetching options data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch options data' },
      { status: 500 }
    );
  }
} 