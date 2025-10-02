import { useState, useEffect, useMemo, useRef, Component } from 'react';
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import axios from 'axios';
import '@solana/wallet-adapter-react-ui/styles.css';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const JUPITER_TOKEN_LIST = 'https://token.jup.ag/strict';
const USDARK_CA = '4EKDKWJDrqrCQtAD6j9sM5diTeZiKBepkEB8GLP9Dark';

class ErrorBoundary extends Component {
  state = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '1rem', color: '#ff4d4f' }}>
          <h3>Error in Application</h3>
          <p>{this.state.errorMessage}</p>
          <p>Please try refreshing the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function WalletIconButton() {
  const { connected } = useWallet();
  return (
    <button
      className="wallet-icon-button"
      onClick={() => document.querySelector('.wallet-adapter-button')?.click()}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.4rem',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M20 7H4C2.9 7 2 7.9 2 9V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V9C22 7.9 21.1 7 20 7ZM20 9V11H16V13H20V18H4V9H20ZM16 11H18V13H16V11Z"
          fill={connected ? '#52c41a' : '#fff'}
        />
      </svg>
    </button>
  );
}

function TradingViewChart({ symbol, isUSDARK, isMobile }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);

  useEffect(() => {
    if (isUSDARK) return;

    if (!window.TradingView || !containerRef.current) return;

    if (widgetRef.current) {
      try {
        widgetRef.current.remove();
      } catch (e) {}
    }

    const container = containerRef.current;
    container.innerHTML = '';

    widgetRef.current = new window.TradingView.widget({
      autosize: true,
      symbol: `${symbol}USDT`,
      interval: '15',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      toolbar_bg: '#131722',
      enable_publishing: false,
      backgroundColor: '#131722',
      container_id: container.id,
      studies: ['Volume@tv-basicstudies'],
      disabled_features: ['header_widget'],
      withdateranges: true,
      hide_side_toolbar: false,
      allow_symbol_change: false,
    });

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (e) {}
      }
    };
  }, [symbol, isUSDARK]);

  if (isUSDARK) {
    return (
      <div
        style={{ width: '100%', height: '100%', minHeight: isMobile ? '400px' : '300px' }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            paddingBottom: '100%',
          }}
        >
          <iframe
            src="https://dexscreener.com/solana/Fp8PHJZnqgSjSDk1H5HASAaozZVJqExTerLu7L9C6ZYq?embed=1&loadChartSettings=0&trades=0&tabs=0&info=0&chartLeftToolbar=0&chartDefaultOnMobile=1&chartTheme=dark&theme=dark&chartStyle=0&chartType=usd&interval=15"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              top: 0,
              left: 0,
              border: 0,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id={`tradingview_chart_${symbol}`}
      style={{ width: '100%', height: '100%', minHeight: isMobile ? '400px' : '300px', background: '#131722' }}
    />
  );
}

function SpotInterface({ selectedToken, allTokens, setSelectedToken }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [side, setSide] = useState('buy');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTokenList, setShowTokenList] = useState(false);
  const [balance, setBalance] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [outputToken, setOutputToken] = useState(null);
  const [jupiterLoaded, setJupiterLoaded] = useState(false);

  useEffect(() => {
    if (selectedToken) {
      setOutputToken(selectedToken);
      setShowTokenList(false);
    }
  }, [selectedToken]);

  useEffect(() => {
    const fetchBalances = async () => {
      if (wallet.connected && wallet.publicKey) {
        try {
          const solBalance = (await connection.getBalance(wallet.publicKey)) / LAMPORTS_PER_SOL;
          setBalance(solBalance);
        } catch (e) {
          console.error('SOL Balance fetch error:', e);
          setBalance(0);
        }
        if (outputToken) {
          try {
            const mint = new PublicKey(outputToken.address);
            const ata = getAssociatedTokenAddressSync(mint, wallet.publicKey);
            const tokenBal = await connection.getTokenAccountBalance(ata);
            setTokenBalance(tokenBal.value.uiAmount || 0);
          } catch (e) {
            console.error('Token Balance fetch error:', e);
            setTokenBalance(0);
          }
        }
      }
    };
    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [wallet.connected, connection, wallet.publicKey, outputToken]);

  useEffect(() => {
    const loadJupiterScript = () => {
      if (!document.getElementById('jupiter-plugin-script')) {
        const script = document.createElement('script');
        script.id = 'jupiter-plugin-script';
        script.src = 'https://plugin.jup.ag/plugin-v1.js';
        script.async = true;
        document.head.appendChild(script);
        script.onload = () => {
          setJupiterLoaded(true);
        };
      } else {
        setJupiterLoaded(true);
      }
    };
    loadJupiterScript();
  }, []);

  useEffect(() => {
    if (jupiterLoaded && window.Jupiter && outputToken) {
      const initialInputMint = side === 'buy' ? SOL_MINT : outputToken.address;
      const initialOutputMint = side === 'buy' ? outputToken.address : SOL_MINT;
      window.Jupiter.init({
        displayMode: "integrated",
        integratedTargetId: "jupiter-terminal",
        endpoint: connection.rpcEndpoint,
        formProps: {
          initialInputMint,
          initialOutputMint,
          fixedInputMint: true,
          fixedOutputMint: true,
        },
        branding: {
          name: "USDARK-DEX",
          logoUri:
            "https://cdn.dexscreener.com/cms/images/125b5d42da25f4c928fb76a0c5ce4524d32a9c5e63e129648071aa402ce247fd?width=64&height=64&fit=crop&quality=95&format=auto",
        },
      });
    }
  }, [jupiterLoaded, side, outputToken, connection.rpcEndpoint]);

  useEffect(() => {
    if (window.Jupiter && wallet) {
      window.Jupiter.syncProps({ passthroughWallet: wallet });
    }
  }, [wallet]);

  const filteredTokens = allTokens.filter(
    (token) =>
      token.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!selectedToken) {
    return <div style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>Select a token to trade</div>;
  }

  return (
    <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem' }}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.5rem' }}>
        <button
          onClick={() => setSide('buy')}
          style={{
            padding: '0.4rem',
            border: 'none',
            borderRadius: '4px',
            background: side === 'buy' ? '#52c41a' : '#2a2a2a',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          style={{
            padding: '0.4rem',
            border: 'none',
            borderRadius: '4px',
            background: side === 'sell' ? '#ff4d4f' : '#2a2a2a',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          Sell
        </button>
      </div>

      <div id="jupiter-terminal" style={{ width: '100%', height: '600px' }}></div>

      {/* <div style={{ marginTop: '0.5rem' }}>
        <div
          onClick={() => setShowTokenList(!showTokenList)}
          style={{
            padding: '0.4rem',
            background: '#2a2a2a',
            border: '1px solid #333',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {outputToken ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {outputToken.logoURI && (
                <img src={outputToken.logoURI} alt={outputToken.symbol} style={{ width: '16px', height: '16px', borderRadius: '50%' }} />
              )}
              <div>
                <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.75rem' }}>{outputToken.symbol}</div>
                <div style={{ fontSize: '0.625rem', color: '#666' }}>{outputToken.name}</div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#666', fontSize: '0.75rem' }}>Select token</div>
          )}
          <div style={{ fontSize: '0.625rem' }}>▼</div>
        </div>

        {showTokenList && (
          <div
            style={{
              marginTop: '0.4rem',
              border: '1px solid #333',
              borderRadius: '4px',
              background: '#2a2a2a',
              maxHeight: '150px',
              overflowY: 'auto',
            }}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              style={{
                width: '100%',
                padding: '0.4rem',
                border: 'none',
                borderBottom: '1px solid #333',
                background: '#2a2a2a',
                color: '#fff',
                fontSize: '0.625rem',
              }}
            />
            {filteredTokens.slice(0, 30).map((token) => (
              <div
                key={token.address}
                onClick={() => {
                  setOutputToken(token);
                  setSelectedToken(token);
                  setShowTokenList(false);
                  setSearchQuery('');
                }}
                style={{
                  padding: '0.4rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid #333',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#333')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {token.logoURI && (
                    <img src={token.logoURI} alt={token.symbol} style={{ width: '16px', height: '16px', borderRadius: '50%' }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.75rem' }}>{token.symbol}</div>
                    <div style={{ fontSize: '0.625rem', color: '#666' }}>{token.name}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.625rem', color: '#fff' }}>${token.price.toFixed(4)}</div>
              </div>
            ))}
          </div>
        )}
      </div> */}
    </div>
  );
}

function App() {
  const [tokens, setTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenMeta, setTokenMeta] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => 'https://rpc.ankr.com/solana', []);
  const wallets = useMemo(() => [], []); // Removed adapters as they are standard

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const copyCA = () => {
    navigator.clipboard.writeText(USDARK_CA).then(() => {
      alert('CA copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy CA:', err);
    });
  };

  useEffect(() => {
    const loadTokenMeta = async () => {
      try {
        const response = await fetch(JUPITER_TOKEN_LIST);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTokenMeta(data.tokens || data);
      } catch (e) {
        console.error('Error loading token list:', e);
        setTokenMeta([]);
      }
    };
    loadTokenMeta();
  }, []);

  useEffect(() => {
    const loadTokens = async () => {
      try {
        setLoading(true);
        const pairs = ['SOL/USDC', 'BTC/USDC', 'ETH/USDC', 'BONK/USDC', 'JUP/USDC', 'PYTH/USDC', 'WIF/USDC', 'JTO/USDC', 'RNDR/USDC', 'ONDO/USDC'];
        const allTokens = [];

        // Fetch specific token first
        try {
          const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${USDARK_CA}`);
          const data = await response.json();
          if (data.pairs) {
            const filtered = data.pairs
              .filter((p) => p.chainId === 'solana' && p.priceUsd && parseFloat(p.volume?.h24 || 0) > 0)
              .slice(0, 1);
            allTokens.push(...filtered);
          }
        } catch (e) {
          console.error('Error fetching USDARK:', e);
        }

        for (const pair of pairs) {
          try {
            const response = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${pair}`);
            const data = await response.json();
            if (data.pairs) {
              const filtered = data.pairs
                .filter((p) => p.chainId === 'solana' && p.priceUsd && parseFloat(p.volume?.h24 || 0) > 10000)
                .slice(0, 5);
              allTokens.push(...filtered);
            }
          } catch (e) {}
        }

        const uniqueTokens = Array.from(
          new Map(
            allTokens.map((pair) => [
              pair.baseToken?.address,
              {
                address: pair.baseToken?.address || '',
                name: pair.baseToken?.name || 'Unknown',
                symbol: pair.baseToken?.symbol || '???',
                price: parseFloat(pair.priceUsd) || 0,
                priceChange24h: parseFloat(pair.priceChange?.h24) || 0,
                volume24h: parseFloat(pair.volume?.h24) || 0,
                liquidity: parseFloat(pair.liquidity?.usd) || 0,
              },
            ])
          ).values()
        ).filter((t) => t.address !== SOL_MINT && (t.address === USDARK_CA || t.volume24h > 10000));

        let sortedTokens = uniqueTokens.sort((a, b) => b.volume24h - a.volume24h);

        // Move USDARK to the front
        const darkIndex = sortedTokens.findIndex(t => t.address === USDARK_CA);
        if (darkIndex !== -1) {
          const darkToken = sortedTokens.splice(darkIndex, 1)[0];
          sortedTokens.unshift(darkToken);
        }

        const enrichedTokens = sortedTokens
          .map((token) => {
            const meta = tokenMeta.find((m) => m.address === token.address);
            return {
              ...token,
              decimals: meta ? meta.decimals : 9,
              logoURI: meta ? meta.logoURI : null,
            };
          });

        setTokens(enrichedTokens);
        if (!selectedToken && enrichedTokens.length > 0) setSelectedToken(enrichedTokens[0]);
      } catch (error) {
        console.error('Error loading tokens:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTokens();
    const interval = setInterval(loadTokens, 30000);
    return () => clearInterval(interval);
  }, [tokenMeta]);

  const formatPrice = (price) => (price < 0.01 ? `$${price.toFixed(6)}` : `$${price.toFixed(2)}`);
  const formatNumber = (num) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${(num / 1e3).toFixed(2)}K`;
  };

  const mainContainerStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '250px 1fr 350px',
    gridTemplateAreas: isMobile ? '"sidebar" "main" "trade"' : '"sidebar main trade"',
    height: isMobile ? 'auto' : 'calc(100vh - 60px)',
    minHeight: isMobile ? 'auto' : 'calc(100vh - 60px)',
    gap: isMobile ? '0' : '0',
  };

  const mainContentStyle = {
    gridArea: 'main',
    display: 'flex',
    flexDirection: 'column',
    overflow: isMobile ? 'visible' : 'hidden',
    height: isMobile ? 'auto' : '100%',
    width: '100%',
  };

  const chartContainerStyle = {
    flex: isMobile ? 'none' : 1,
    overflow: 'hidden',
    height: isMobile ? '400px' : '100%',
    width: '100%',
  };

  const sidebarStyle = {
    gridArea: 'sidebar',
    background: '#1a1a1a',
    borderRight: isMobile ? 'none' : '1px solid #262626',
    overflowY: 'auto',
    padding: isMobile ? '0.5rem' : '1rem',
    width: '100%',
  };

  const tradeStyle = {
    gridArea: 'trade',
    background: '#1a1a1a',
    borderLeft: isMobile ? 'none' : '1px solid #262626',
    padding: isMobile ? '0.5rem' : '0.75rem',
    overflowY: isMobile ? 'visible' : 'auto',
    width: '100%',
  };

  return (
    <ErrorBoundary>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <div
              style={{
                minHeight: '100vh',
                height: '100vh',
                background: '#0d0d0d',
                color: '#fff',
                position: 'relative',
              }}
            >
              <div
                style={{
                  background: '#1a1a1a',
                  padding: '0.5rem 1rem',
                  textAlign: 'center',
                  borderBottom: '1px solid #262626',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1000,
                }}
              >
                <div 
                  onClick={copyCA}
                  style={{ 
                    fontSize: isMobile ? '0.7rem' : '0.875rem', 
                    color: '#999',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  CA: {USDARK_CA}
                </div>
              </div>
              <div
                style={{
                  borderBottom: '1px solid #262626',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#1a1a1a',
                  flexWrap: 'wrap',
                  position: 'sticky',
                  top: '40px',
                  zIndex: 900,
                }}
                className="nav-bar"
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 'bold' }}>USDARK-DEX</h1>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      className="nav-btn"
                      style={{
                        padding: '0.4rem 0.8rem',
                        background: '#333',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                      }}
                    >
                      Spot
                    </button>
                    <button
                      onClick={() => { window.location.href = 'https://usdark.trade/perp/PERP_ETH_USDC/'; }}
                      style={{
                        padding: '0.4rem 0.8rem',
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                      }}
                    >
                      Perpetuals
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <WalletMultiButton className="wallet-adapter-button-desktop" />
                  <WalletIconButton />
                </div>
              </div>

              <div style={mainContainerStyle} className="main-container">
                <div style={sidebarStyle} className="markets-sidebar">
                  <h3 style={{ fontSize: '0.875rem', marginBottom: '1rem', color: '#999' }}>Markets</h3>
                  {loading ? (
                    <div style={{ color: '#999', fontSize: '0.75rem' }}>Loading...</div>
                  ) : (
                    tokens.map((token) => (
                      <div
                        key={token.address}
                        className={`token-card ${selectedToken?.address === token.address ? 'selected' : ''}`}
                        onClick={() => setSelectedToken(token)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '0.5rem',
                          marginBottom: '0.5rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          background: selectedToken?.address === token.address ? '#333' : 'transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {token.logoURI && (
                            <img src={token.logoURI} alt={token.symbol} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                          )}
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{token.symbol}</div>
                            <div style={{ fontSize: '0.75rem', color: '#666' }}>{token.name}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.875rem' }}>{formatPrice(token.price)}</div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: token.priceChange24h >= 0 ? '#52c41a' : '#ff4d4f',
                            }}
                          >
                            {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={mainContentStyle} className="main-content">
                  {selectedToken && (
                    <>
                      <div
                        className="info-box"
                        style={{ padding: isMobile ? '0.5rem' : '0.75rem', borderBottom: '1px solid #262626', background: '#1a1a1a' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <h2 style={{ fontSize: '1rem', fontWeight: 'bold' }} className="title-glow">
                            {selectedToken.symbol}/SOL
                          </h2>
                          <div>
                            <span style={{ color: '#999', fontSize: '0.75rem' }}>Price: </span>
                            <span style={{ fontWeight: 'bold', fontSize: '0.75rem' }}>{formatPrice(selectedToken.price)}</span>
                          </div>
                          <div>
                            <span style={{ color: '#999', fontSize: '0.75rem' }}>24h Change: </span>
                            <span
                              style={{
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                                color: selectedToken.priceChange24h >= 0 ? '#52c41a' : '#ff4d4f',
                              }}
                            >
                              {selectedToken.priceChange24h >= 0 ? '+' : ''}{selectedToken.priceChange24h.toFixed(2)}%
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#999', fontSize: '0.75rem' }}>24h Volume: </span>
                            <span style={{ fontWeight: 'bold', fontSize: '0.75rem' }}>{formatNumber(selectedToken.volume24h)}</span>
                          </div>
                          <div>
                            <span style={{ color: '#999', fontSize: '0.75rem' }}>Liquidity: </span>
                            <span style={{ fontWeight: 'bold', fontSize: '0.75rem' }}>{formatNumber(selectedToken.liquidity)}</span>
                          </div>
                        </div>
                      </div>
                      <div style={chartContainerStyle}>
                        <TradingViewChart 
                          symbol={selectedToken?.symbol} 
                          isUSDARK={selectedToken?.address === USDARK_CA}
                          isMobile={isMobile}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div style={tradeStyle} className="trading-panel">
                  <SpotInterface selectedToken={selectedToken} allTokens={tokens} setSelectedToken={setSelectedToken} />
                </div>
              </div>
            </div>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ErrorBoundary>
  );
}

export default App;