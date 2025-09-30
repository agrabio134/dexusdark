// Jupiter Perps integration placeholder
export const fetchPerpMarkets = async () => {
    // This will integrate with Jupiter Perps API when available
    return [
        {
            symbol: 'SOL-PERP',
            indexPrice: 150.23,
            markPrice: 150.25,
            fundingRate: 0.0001,
            openInterest: 125000000,
            volume24h: 850000000,
            maxLeverage: 20
        },
        {
            symbol: 'BTC-PERP',
            indexPrice: 65420.50,
            markPrice: 65422.00,
            fundingRate: 0.00008,
            openInterest: 2100000000,
            volume24h: 12000000000,
            maxLeverage: 20
        },
        {
            symbol: 'ETH-PERP',
            indexPrice: 3245.80,
            markPrice: 3246.10,
            fundingRate: 0.00012,
            openInterest: 980000000,
            volume24h: 4500000000,
            maxLeverage: 20
        }
    ];
};

export const openPerpPosition = async (wallet, market, side, size, leverage) => {
    // Jupiter Perps integration will go here
    throw new Error('Perp trading integration coming soon');
};