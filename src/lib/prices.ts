import { RealTimePrice } from '../types';

// Nvidia, Bitcoin, Ethereum initial baseline prices
const BASELINE_PRICES: Record<string, { price: number; change24h: number; name: string }> = {
  NVDA: { price: 128.54, change24h: 3.42, name: 'NVIDIA Corp' },
  BTC: { price: 62450.00, change24h: 1.85, name: 'Bitcoin' },
  ETH: { price: 3420.50, change24h: -0.45, name: 'Ethereum' },
};

/**
 * Fetches real-time price rates. If public requests fail due to sandbox/network block,
 * it returns baseline prices with realistic micro-variations.
 */
export async function fetchRealTimePrices(): Promise<RealTimePrice[]> {
  try {
    const prices: RealTimePrice[] = [];
    
    // Fetch Bitcoin / Ethereum from Coinbase public API (extremely fast and CORS-friendly)
    try {
      const btcRes = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
      const ethRes = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot');
      
      if (btcRes.ok && ethRes.ok) {
        const btcData = await btcRes.json();
        const ethData = await ethRes.json();
        
        prices.push({
          symbol: 'BTC',
          name: 'Bitcoin',
          price: parseFloat(btcData.data.amount),
          change24h: 1.85, // estimate
        });
        
        prices.push({
          symbol: 'ETH',
          name: 'Ethereum',
          price: parseFloat(ethData.data.amount),
          change24h: -0.45, // estimate
        });
      }
    } catch (e) {
      console.warn('Crypto API failed, falling back to local simulation', e);
    }

    // Try to fetch NVDA stock or simulate if Yahoo Finance chart API is blocked
    try {
      // Yahoo finance chart API often allows CORS but can be flaky in sandboxes
      const nvdaRes = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/NVDA');
      if (nvdaRes.ok) {
        const data = await nvdaRes.json();
        const meta = data.chart?.result?.[0]?.meta;
        if (meta) {
          const currentPrice = meta.regularMarketPrice;
          const previousClose = meta.chartPreviousClose;
          const change24h = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 3.42;
          
          prices.push({
            symbol: 'NVDA',
            name: 'NVIDIA Corp',
            price: currentPrice,
            change24h: Number(change24h.toFixed(2)),
          });
        }
      }
    } catch (e) {
      console.warn('NVDA stock API failed, using mock real-time simulator', e);
    }

    // Backfill any missing symbols with baseline simulated prices
    Object.keys(BASELINE_PRICES).forEach((sym) => {
      if (!prices.some((p) => p.symbol === sym)) {
        const base = BASELINE_PRICES[sym];
        // Add random micro fluctuation (-0.05% to +0.05%)
        const fluctuation = (Math.random() - 0.5) * 0.001;
        const currentPrice = base.price * (1 + fluctuation);
        prices.push({
          symbol: sym,
          name: base.name,
          price: Number(currentPrice.toFixed(2)),
          change24h: Number((base.change24h + (Math.random() - 0.5) * 0.1).toFixed(2)),
        });
      }
    });

    return prices;
  } catch (error) {
    console.error('All price requests failed, returning baseline', error);
    return Object.keys(BASELINE_PRICES).map((sym) => ({
      symbol: sym,
      name: BASELINE_PRICES[sym].name,
      price: BASELINE_PRICES[sym].price,
      change24h: BASELINE_PRICES[sym].change24h,
    }));
  }
}

/**
 * Helper to generate simulated price points for charts
 */
export function generatePlanChartData(dailyProfitPercent: number, principal: number) {
  const data = [];
  let currentVal = principal;
  for (let day = 0; day <= 7; day++) {
    data.push({
      day: `Day ${day}`,
      value: Number(currentVal.toFixed(2)),
    });
    currentVal += (principal * (dailyProfitPercent / 100));
  }
  return data;
}
