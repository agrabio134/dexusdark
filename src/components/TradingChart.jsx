import React, { useEffect, useRef } from 'react';

const TradingChart = ({ symbol }) => {
    const containerRef = useRef(null);
    const widgetRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        if (widgetRef.current) {
            widgetRef.current.remove();
        }

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = () => {
            if (window.TradingView) {
                widgetRef.current = new window.TradingView.widget({
                    autosize: true,
                    symbol: `BINANCE:${symbol}USDT`,
                    interval: '15',
                    timezone: 'Etc/UTC',
                    theme: 'light',
                    style: '1',
                    locale: 'en',
                    toolbar_bg: '#ffffff',
                    enable_publishing: false,
                    container_id: 'tradingview_chart',
                    studies: ['MASimple@tv-basicstudies', 'Volume@tv-basicstudies']
                });
            }
        };

        if (!document.querySelector('script[src="https://s3.tradingview.com/tv.js"]')) {
            document.head.appendChild(script);
        } else if (window.TradingView) {
            script.onload();
        }

        return () => {
            if (widgetRef.current) {
                widgetRef.current.remove();
            }
        };
    }, [symbol]);

    return (
        <div 
            id="tradingview_chart" 
            ref={containerRef}
            className="w-full h-[500px] rounded-lg border-2"
            style={{ borderColor: 'rgba(0, 0, 0, 0.2)' }}
        />
    );
};

export default TradingChart;