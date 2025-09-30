import React from 'react';

const TokenList = ({ tokens, selectedToken, onSelectToken, loading }) => {
    const formatPrice = (price) => {
        if (price < 0.000001) return `$${price.toFixed(10)}`;
        if (price < 0.01) return `$${price.toFixed(6)}`;
        return `$${price.toFixed(4)}`;
    };

    const formatNumber = (num) => {
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
        return `$${num.toFixed(2)}`;
    };

    if (loading) {
        return <div className="text-center py-8">Loading tokens...</div>;
    }

    return (
        <div className="token-list max-h-[600px] overflow-y-auto space-y-2">
            {tokens.map((token, i) => (
                <div
                    key={token.address}
                    onClick={() => onSelectToken(token)}
                    className={`token-card ${selectedToken?.address === token.address ? 'selected' : ''}`}
                >
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-xs">
                                {i + 1}
                            </div>
                            <div>
                                <div className="font-bold">{token.symbol}</div>
                                <div className="text-xs text-gray-600">{token.name}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold">{formatPrice(token.price)}</div>
                            <div className={`text-xs font-bold ${token.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                        <span>Vol: {formatNumber(token.volume24h)}</span>
                        <span>Liq: {formatNumber(token.liquidity)}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TokenList;