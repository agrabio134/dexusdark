import { useState, useEffect, useMemo, useRef, Component } from 'react';
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, PublicKey, LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import axios from 'axios';
import '@solana/wallet-adapter-react-ui/styles.css';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6/quote';
const JUPITER_SWAP_API = 'https://quote-api.jup.ag/v6/swap';
const JUPITER_TOKEN_LIST = 'https://token.jup.ag/strict';

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

function TokenSelector({ viewMode, tokens, selectedToken, setSelectedToken, selectedPerpSymbol, setSelectedPerpSymbol }) {
  return (
    <select
      className="token-selector"
      value={viewMode === 'perps' ? selectedPerpSymbol || '' : selectedToken?.address || ''}
      onChange={(e) => {
        if (viewMode === 'perps') {
          setSelectedPerpSymbol(e.target.value);
        } else {
          const token = tokens.find((t) => t.address === e.target.value);
          if (token) setSelectedToken(token);
        }
      }}
      style={{
        width: '100%',
        padding: '0.4rem',
        background: '#2a2a2a',
        border: '1px solid #333',
        borderRadius: '4px',
        color: '#fff',
        fontSize: '0.75rem',
        appearance: 'none',
        backgroundImage:
          'url("data:image/svg+xml;utf8,<svg fill=\'white\' height=\'24\' viewBox=\'0 0 24 24\' width=\'24\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/><path d=\'M0 0h24v24H0z\' fill=\'none\'/></svg>")',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.4rem center',
        backgroundSize: '0.8rem',
      }}
    >
      {viewMode === 'perps' ? (
        [
          'PERP_BTC_USDC',
          'PERP_ETH_USDC',
          'PERP_SOL_USDC',
          'PERP_BNB_USDC',
          'PERP_XRP_USDC',
          'PERP_ADA_USDC',
          'PERP_DOGE_USDC',
          'PERP_SHIB_USDC',
          'PERP_AVAX_USDC',
          'PERP_TRX_USDC',
        ].map((symbol) => (
          <option key={symbol} value={symbol}>
            {symbol.replace('PERP_', '').replace('_USDC', '')}/USDC
          </option>
        ))
      ) : (
        tokens.map((token) => (
          <option key={token.address} value={token.address}>
            {token.symbol}/USDC
          </option>
        ))
      )}
    </select>
  );
}

function TradingViewChart({ symbol, marketType }) {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);

  useEffect(() => {
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
      symbol: `${symbol}USDC`,
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
  }, [symbol, marketType]);

  return (
    <div
      ref={containerRef}
      id={`tradingview_chart_${marketType}_${symbol}`}
      style={{ width: '100%', height: '100%', minHeight: '300px', background: '#131722' }}
    />
  );
}

function SpotInterface({ selectedToken, allTokens }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [outputAmount, setOutputAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTokenList, setShowTokenList] = useState(false);
  const [balance, setBalance] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [outputToken, setOutputToken] = useState(null);

  useEffect(() => {
    if (selectedToken) {
      setOutputToken(selectedToken);
      setShowTokenList(false);
    }
  }, [selectedToken]);

  useEffect(() => {
    const fetchBalances = async () => {
      if (wallet.connected) {
        const solBalance = (await connection.getBalance(wallet.publicKey)) / LAMPORTS_PER_SOL;
        setBalance(solBalance);
        if (outputToken) {
          const mint = new PublicKey(outputToken.address);
          const ata = getAssociatedTokenAddressSync(mint, wallet.publicKey);
          try {
            const tokenBal = await connection.getTokenAccountBalance(ata);
            setTokenBalance(tokenBal.value.uiAmount || 0);
          } catch (e) {
            setTokenBalance(0);
          }
        }
      }
    };
    fetchBalances();
  }, [wallet.connected, connection, outputToken]);

  useEffect(() => {
    const getQuote = async () => {
      if (!amount || parseFloat(amount) <= 0 || !outputToken) return;
      try {
        setLoading(true);
        const inputMint = side === 'buy' ? SOL_MINT : outputToken.address;
        const outputMint = side === 'buy' ? outputToken.address : SOL_MINT;
        const inputAmount = parseFloat(amount) * (side === 'buy' ? LAMPORTS_PER_SOL : 10 ** (outputToken.decimals || 9));
        const { data } = await axios.get(JUPITER_QUOTE_API, {
          params: {
            inputMint,
            outputMint,
            amount: inputAmount,
            slippageBps: 50,
          },
        });
        setQuote(data);
        setOutputAmount(data.outAmount / (side === 'buy' ? 10 ** (outputToken.decimals || 9) : LAMPORTS_PER_SOL));
      } catch (error) {
        console.error('Quote error:', error);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(getQuote, 500);
    return () => clearTimeout(timer);
  }, [amount, side, outputToken]);

  const executeSwap = async () => {
    if (!wallet.connected || !quote) {
      alert('Connect wallet and get quote first');
      return;
    }
    try {
      setLoading(true);
      const { data } = await axios.post(JUPITER_SWAP_API, {
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
      });
      const tx = VersionedTransaction.deserialize(Buffer.from(data.swapTransaction, 'base64'));
      const signed = await wallet.signTransaction(tx);
      const txid = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true });
      alert(`Success! TX: ${txid}`);
      setAmount('');
      setSliderValue(0);
      setOutputAmount(0);
      setQuote(null);
    } catch (error) {
      alert('Swap failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSliderChange = (value) => {
    setSliderValue(value);
    const maxBalance = side === 'buy' ? balance : tokenBalance;
    setAmount(((value / 100) * maxBalance).toString());
  };

  const filteredTokens = allTokens.filter(
    (token) =>
      token.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem' }}>
      <h3 style={{ fontSize: '0.75rem', marginBottom: '0.5rem', color: '#fff' }}>Spot Trading</h3>

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

      <div style={{ marginBottom: '0.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.625rem', color: '#999', marginBottom: '0.4rem' }}>
          Available
        </label>
        <div style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 'bold' }}>
          {side === 'buy' ? balance.toFixed(4) : tokenBalance.toFixed(4)} {side === 'buy' ? 'SOL' : outputToken?.symbol}
        </div>
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.625rem', color: '#999', marginBottom: '0.4rem' }}>
          Price
        </label>
        <div style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 'bold' }}>
          ${outputToken?.price.toFixed(6)}
        </div>
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.625rem', color: '#999', marginBottom: '0.4rem' }}>
          Total
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => {
            const value = e.target.value;
            setAmount(value);
            const maxBalance = side === 'buy' ? balance : tokenBalance;
            setSliderValue(value && maxBalance > 0 ? (parseFloat(value) / maxBalance) * 100 : 0);
          }}
          placeholder="0"
          style={{
            width: '100%',
            padding: '0.4rem',
            background: '#2a2a2a',
            border: '1px solid #333',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '0.75rem',
          }}
        />
        <div style={{ fontSize: '0.625rem', color: '#666', marginTop: '0.4rem' }}>
          {side === 'buy' ? 'SOL' : outputToken?.symbol}
        </div>
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <input
          type="range"
          min="0"
          max="100"
          value={sliderValue}
          onChange={(e) => handleSliderChange(e.target.value)}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: '#666', marginTop: '0.2rem' }}>
          <span>0%</span>
          <span>Max</span>
        </div>
      </div>

      {outputAmount > 0 && (
        <div
          style={{
            padding: '0.4rem',
            background: 'rgba(82, 196, 26, 0.1)',
            borderRadius: '4px',
            marginBottom: '0.5rem',
            border: '1px solid #52c41a',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#52c41a' }}>
            Receive ~ {outputAmount.toFixed(6)} {side === 'buy' ? outputToken?.symbol : 'SOL'}
          </div>
        </div>
      )}

      <button
        onClick={executeSwap}
        disabled={loading || !amount || parseFloat(amount) <= 0 || !wallet.connected}
        style={{
          width: '100%',
          padding: '0.5rem',
          border: 'none',
          borderRadius: '4px',
          background: side === 'buy' ? '#52c41a' : '#ff4d4f',
          color: 'white',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          cursor: wallet.connected && amount && parseFloat(amount) > 0 ? 'pointer' : 'not-allowed',
          opacity: wallet.connected && amount && parseFloat(amount) > 0 ? 1 : 0.5,
        }}
      >
        {wallet.connected ? (loading ? 'Swapping...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${outputToken?.symbol}`) : 'Connect wallet'}
      </button>

      <div style={{ marginTop: '0.5rem' }}>
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
      </div>
    </div>
  );
}

function App() {
  const [tokens, setTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedPerpSymbol, setSelectedPerpSymbol] = useState('PERP_ETH_USDC');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('spot');
  const [tokenMeta, setTokenMeta] = useState([]);

  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  useEffect(() => {
    const loadTokenMeta = async () => {
      try {
        const { data } = await axios.get(JUPITER_TOKEN_LIST);
        setTokenMeta(data);
      } catch (e) {
        console.error('Error loading token list:', e);
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
        ).filter((t) => t.address !== SOL_MINT && t.volume24h > 100000);

        const enrichedTokens = uniqueTokens
          .map((token) => {
            const meta = tokenMeta.find((m) => m.address === token.address);
            return {
              ...token,
              decimals: meta ? meta.decimals : 9,
              logoURI: meta ? meta.logoURI : null,
            };
          })
          .sort((a, b) => b.volume24h - a.volume24h);

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

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div
            style={{
              minHeight: '100vh',
              background: '#0d0d0d',
              color: '#fff',
              position: 'relative',
            }}
          >
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
                top: 0,
                zIndex: 900,
              }}
              className="nav-bar"
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>USDARK-DEX</h1>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setViewMode('spot')}
                    className="nav-btn"
                    style={{
                      padding: '0.4rem 0.8rem',
                      background: viewMode === 'spot' ? '#333' : 'transparent',
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
                    onClick={() => {
                      window.location.href = `https://usdark.trade/perp/${selectedPerpSymbol}/`;
                    }}
                    className="nav-btn"
                    style={{
                      padding: '0.4rem 0.8rem',
                      background: viewMode === 'perps' ? '#333' : 'transparent',
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '250px 1fr 350px',
                gridTemplateAreas: '"sidebar main trade"',
                height: 'calc(100vh - 60px)',
              }}
              className="main-container"
            >
              <div
                className="markets-sidebar"
                style={{
                  gridArea: 'sidebar',
                  background: '#1a1a1a',
                  borderRight: '1px solid #262626',
                  overflowY: 'auto',
                  padding: '1rem',
                }}
              >
                <h3 style={{ fontSize: '0.875rem', marginBottom: '1rem', color: '#999' }}>Markets</h3>
                {viewMode === 'perps' ? (
                  [
                    'PERP_BTC_USDC',
                    'PERP_ETH_USDC',
                    'PERP_SOL_USDC',
                    'PERP_BNB_USDC',
                    'PERP_XRP_USDC',
                    'PERP_ADA_USDC',
                    'PERP_DOGE_USDC',
                    'PERP_SHIB_USDC',
                    'PERP_AVAX_USDC',
                    'PERP_TRX_USDC',
                  ].map((symbol) => (
                    <div
                      key={symbol}
                      className="token-card"
                      onClick={() => setSelectedPerpSymbol(symbol)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.5rem',
                        marginBottom: '0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: selectedPerpSymbol === symbol ? '#333' : 'transparent',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                          {symbol.replace('PERP_', '').replace('_USDC', '')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#666' }}>Perpetual</div>
                      </div>
                    </div>
                  ))
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

              <div
                className="main-content"
                style={{
                  gridArea: 'main',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '0.75rem' }}>
                  <TokenSelector
                    viewMode={viewMode}
                    tokens={tokens}
                    selectedToken={selectedToken}
                    setSelectedToken={setSelectedToken}
                    selectedPerpSymbol={selectedPerpSymbol}
                    setSelectedPerpSymbol={setSelectedPerpSymbol}
                  />
                </div>

                {selectedToken && (
                  <>
                    <div
                      className="info-box"
                      style={{ padding: '0.75rem', borderBottom: '1px solid #262626', background: '#1a1a1a' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 'bold' }} className="title-glow">
                          {selectedToken.symbol}/USDC
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
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <TradingViewChart symbol={selectedToken?.symbol} marketType={viewMode} />
                    </div>
                  </>
                )}
              </div>

              <div
                className="trading-panel"
                style={{
                  gridArea: 'trade',
                  background: '#1a1a1a',
                  borderLeft: '1px solid #262626',
                  padding: '0.75rem',
                  overflowY: 'auto',
                }}
              >
                <SpotInterface selectedToken={selectedToken} allTokens={tokens} />
              </div>
            </div>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;