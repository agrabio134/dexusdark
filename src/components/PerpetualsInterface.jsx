import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
import { useOrderEntry } from '@orderly.network/hooks';
import { OrderSide, OrderType } from '@orderly.network/types';

const ORDERLY_API = 'https://api.orderly.org/v1/public';

const PerpetualsInterface = ({ selectedToken }) => {
    const wallet = useWallet();
    const [position, setPosition] = useState('long');
    const [leverage, setLeverage] = useState(5);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [perpMarkets, setPerpMarkets] = useState([]);
    const [fundingRates, setFundingRates] = useState({});

    const symbol = `PERP_${selectedToken.symbol}_USDC`;

    const { setValue, submit, estLiqPrice, estLeverage, freeCollateral, markPrice, symbolInfo, metaState } = useOrderEntry(symbol, {
        initialOrder: {
            side: OrderSide.BUY,
            order_type: OrderType.MARKET,
            reduce_only: false,
        }
    });

    useEffect(() => {
        const fetchMarkets = async () => {
            try {
                const futuresRes = await axios.get(`${ORDERLY_API}/futures`);
                if (futuresRes.data.success) {
                    setPerpMarkets(futuresRes.data.data.rows);
                }

                const fundingRes = await axios.get(`${ORDERLY_API}/funding_rates`);
                if (fundingRes.data.success) {
                    const fundingMap = {};
                    fundingRes.data.data.rows.forEach(item => {
                        fundingMap[item.symbol] = item.est_funding_rate;
                    });
                    setFundingRates(fundingMap);
                }
            } catch (error) {
                console.error('Error fetching markets:', error);
            }
        };

        fetchMarkets();
        const interval = setInterval(fetchMarkets, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (markPrice && amount) {
            const qty = (parseFloat(amount) * leverage) / markPrice;
            setValue('order_quantity', qty.toFixed(6));
        }
    }, [amount, leverage, markPrice, setValue]);

    useEffect(() => {
        setValue('side', position === 'long' ? OrderSide.BUY : OrderSide.SELL);
    }, [position, setValue]);

    const handleOpenPosition = async () => {
        if (!wallet.connected) {
            alert('Please connect your wallet first');
            return;
        }

        if (!amount) {
            alert('Please enter an amount');
            return;
        }

        try {
            setLoading(true);
            await submit();
            setAmount('');
            alert('Position opened successfully!');
        } catch (error) {
            alert('Error opening position: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const maxLeverage = symbolInfo?.max_leverage || 20;

    return (
        <div className="perp-interface info-box">
            <h3 className="text-xl font-bold mb-4">Perpetual Futures</h3>
            
            <div className="mb-6 grid grid-cols-3 gap-4">
                {perpMarkets.map(market => (
                    <div key={market.symbol} className="p-4 bg-black/5 rounded-lg text-center">
                        <div className="font-bold text-lg">{market.symbol.replace('PERP_', '')}-PERP</div>
                        <div className="text-xs text-gray-600">{market.type}</div>
                        <div className="text-xs mt-2">Max: {market.max_leverage || 20}x</div>
                        <div className="text-xs text-blue-600">Funding: {(fundingRates[market.symbol] * 100 || 0).toFixed(4)}%</div>
                    </div>
                ))}
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm mb-2">Position Type</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setPosition('long')}
                            className={`p-3 rounded-lg font-bold transition-all ${
                                position === 'long'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-black/10 text-gray-600'
                            }`}
                        >
                            LONG
                        </button>
                        <button
                            onClick={() => setPosition('short')}
                            className={`p-3 rounded-lg font-bold transition-all ${
                                position === 'short'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-black/10 text-gray-600'
                            }`}
                        >
                            SHORT
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm mb-2">Leverage: {leverage}x</label>
                    <input
                        type="range"
                        min="1"
                        max={maxLeverage}
                        value={leverage}
                        onChange={(e) => setLeverage(parseInt(e.target.value))}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-600">
                        <span>1x</span>
                        <span>{maxLeverage}x</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm mb-2">Amount (USDC)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.0"
                        className="w-full p-3 rounded-lg border-2 border-black"
                        style={{ background: 'rgba(255, 255, 255, 0.5)' }}
                    />
                </div>

                <div className="p-4 bg-black/5 rounded-lg text-sm space-y-2">
                    <div className="flex justify-between">
                        <span>Available Collateral:</span>
                        <span className="font-bold">{freeCollateral?.toFixed(2) || 0} USDC</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Position Size:</span>
                        <span className="font-bold">{(parseFloat(amount) * leverage || 0).toFixed(2)} USDC</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Entry Price:</span>
                        <span className="font-bold">${markPrice?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Liquidation Price:</span>
                        <span className="font-bold text-red-600">
                            ${estLiqPrice?.toFixed(2) || '0.00'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Estimated Leverage:</span>
                        <span className="font-bold">{estLeverage?.toFixed(2) || 0}x</span>
                    </div>
                </div>

                {metaState.errors && Object.values(metaState.errors).map((err, i) => (
                    <div key={i} className="text-red-600 text-sm">{err.message}</div>
                ))}

                <button
                    onClick={handleOpenPosition}
                    disabled={loading || !amount}
                    className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
                        position === 'long'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-red-600 hover:bg-red-700'
                    }`}
                >
                    {loading ? 'Opening...' : `Open ${position.toUpperCase()} Position`}
                </button>

                <div className="text-center text-xs text-gray-600 mt-4">
                    <p>Powered by Orderly Network</p>
                </div>
            </div>
        </div>
    );
};

export default PerpetualsInterface;