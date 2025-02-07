import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // First, get the cookies and tokens
    const sessionResponse = await fetch('https://www.nseindia.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    const cookies = sessionResponse.headers.get('set-cookie');

    // Then fetch the options data with the cookies
    const optionsResponse = await fetch(
      'https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cookie': cookies || '',
        },
      }
    );

    if (!optionsResponse.ok) {
      throw new Error('Failed to fetch from NSE');
    }

    const data = await optionsResponse.json();
    
    // Extract unique expiry dates and sort them
    const expiryDates = [...new Set(data.records.data.map((item: any) => item.expiryDate))]
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    return NextResponse.json({
      ...data,
      expiryDates
    });
  } catch (error) {
    console.error('Error fetching options data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch options data' },
      { status: 500 }
    );
  }
} 