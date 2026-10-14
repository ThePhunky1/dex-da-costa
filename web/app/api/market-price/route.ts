import { createMarketPriceLoader } from '../../../lib/market-price';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const getMarketPrice = createMarketPriceLoader();
export async function GET() {
  try {
    return Response.json(await getMarketPrice(), {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=15' },
    });
  } catch {
    // The loader labels bounded last-known data. Beyond that window, fail explicitly.
    return Response.json({ error: 'Market reference temporarily unavailable' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
}
