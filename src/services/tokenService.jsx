import { DEXSCREENER_API } from '../config/constants';

export const fetchSolanaTokens = async () => {
    try {
        const response = await fetch(`${DEXSCREENER_API}/latest/dex/search?q=solana`);
        const data = await response.json();
        
        if (data.pairs) {
            return data.pairs
                .filter(pair => 
                    pair.chainId === 'solana' && 
                    pair.priceUsd &&
                    parseFloat(pair.volume?.h24 || 0) > 1000
                )
                .slice(0, 100)
                .map(pair => ({
                    address: pair.baseToken?.address || '',
                    name: pair.baseToken?.name || 'Unknown',
                    symbol: pair.baseToken?.symbol || '???',
                    price: parseFloat(pair.priceUsd) || 0,
                    priceChange24h: parseFloat(pair.priceChange?.h24) || 0,
                    volume24h: parseFloat(pair.volume?.h24) || 0,
                    liquidity: parseFloat(pair.liquidity?.usd) || 0,
                    marketCap: parseFloat(pair.fdv) || 0,
                    dexId: pair.dexId,
                    url: pair.url
                }));
        }
        return [];
    } catch (error) {
        console.error('Error fetching tokens:', error);
        return [];
    }
};