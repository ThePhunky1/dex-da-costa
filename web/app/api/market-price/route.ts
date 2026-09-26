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
    // No made-up price and no stale success response on a failed upstream request.
    return Response.json({ error: 'Market reference temporarily unavailable' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
}
