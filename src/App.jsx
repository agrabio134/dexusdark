import { useState, useEffect, useMemo, useRef, Component } from 'react';
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, PublicKey, LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import '@solana/wallet-adapter-react-ui/styles.css';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const JUPITER_TOKEN_LIST = 'https://lite-api.jup.ag/tokens/v2/tag?query=verified';
const USDARK_CA = '4EKDKWJDrqrCQtAD6j9sM5diTeZiKBepkEB8GLP9Dark';
const JUP_MINT = 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN';
const JTO_MINT = 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL';
const PUMP_MINT = 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn';
const XBT = 'A8YHuvQBMAxXoZAZE72FyC8B7jKHo8RJyByXRRffpump';
const DEEP = 'E7ErFx5dRoAxnDphWRmE8DjfJBr2fvjvnX3cgaj6pump';
const Starecat = '7MiLCuSZfLoTAK7S7CztrLV75kC3rfJULEmDNUx5pump';
const PANDU = '4NGbC4RRrUjS78ooSN53Up7gSg4dGrj6F6dxpMWHbonk';
const PFP = '5TfqNKZbn9AnNtzq8bbkyhKgcPGTfNDc9wNzFrTBpump';
const FSJAL = 'GP7m3USdHDSrNoUzsZqZTboKaJiabFQShzgV2RkFnZyh';
const ALPHA = '4k2HDtWVYMpHQSxts28HdMyK8AnJ8adkRF5cHnAKpump';
const TARIFCOIN = '51aXwxgrWKRXJGwWVVgE3Jrs2tWKhuNadfsEt6j2pump';
const LENNY = 'Gc5hxBYZjxWNpt3B8XYbp4YoGCHSMfrJK7ex4GUTpump';
const RAGE = 'C2omVhcvt3DDY77S2KZzawFJQeETZofgZ4eNWWkXpump';
const FOURTWENTY = 'CZy3nB9ET6SxBDdAnd7zcaGiPU8JnFQWCwdEZfWhpump';
const SERIOUSCAT = '8iJhFLFq2SHhZBGKpKK2DfsSaJ62JZRn18dmX3sbpump';
const PINHEAD = '6mgqeeGHE5GrVk9fYdeJSjKTFZV1TVNAQTMYdHjfpump';
const ALCH = 'WXsX5HSoVquYRGuJXJrCSogT1M6nZiPRrfZhQsPcXAU';
const POLYMI = 'HygZx5u3aaXg38grfa39Y59NSGFQXSMCUyAYWoZfpump';
const PLX = '52KWGFoax5Ed1YbFctptXjSShv1P6R3SqUuo6Hk3pump';

const STUPID = 
'EYzxWJz2vYN97CYAxNLHJ8moV8Z2JCK9mBSj5HsGpump';

const SONIAN = '7aWo4u6iP4dXKvJCvahZL51a3ijL4PFM4RXZDnPdpump';

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
          fill={connected ? '#1cc29a' : '#fff'}
        />
      </svg>
    </button>
  );
}

function TokenSelector({ tokens, selectedToken, setSelectedToken }) {
  return (
    <select
      className="token-selector"
      value={selectedToken?.address || ''}
      onChange={(e) => {
        const token = tokens.find((t) => t.address === e.target.value);
        if (token) setSelectedToken(token);
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
      {tokens.map((token) => (
        <option key={token.address} value={token.address} style={{ color: '#fff' }}>
          {token.symbol}/SOL
        </option>
      ))}
    </select>
  );
}

function TradingViewChart({ tokenAddress, isMobile }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <style>{`
        #dexscreener-embed-${tokenAddress} {
          position: relative;
          width: 100%;
          height: 100%;
          padding-bottom: ${isMobile ? '125%' : '0'};
        }
        @media(min-width:768px) {
          #dexscreener-embed-${tokenAddress} {
            padding-bottom: 0;
            height: 100%;
          }
        }
        #dexscreener-embed-${tokenAddress} iframe {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          border: 0;
        }
        #dexscreener-embed-${tokenAddress}::after {
          content: '';
          position: absolute;
          top: 8px;
          right: 8px;
          width: 120px;
          height: 30px;
          background: #131722;
          z-index: 10;
          pointer-events: none;
        }
        #dexscreener-embed-${tokenAddress}::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 35px;
          background: #131722;
          z-index: 10;
          pointer-events: none;
        }
      `}</style>
      <div id={`dexscreener-embed-${tokenAddress}`}>
        <iframe
          src={`https://dexscreener.com/solana/${tokenAddress}?embed=1&loadChartSettings=0&trades=0&tabs=0&info=0&chartLeftToolbar=0&chartDefaultOnMobile=1&chartTheme=dark&theme=dark&chartStyle=1&chartType=usd&interval=15`}
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    </div>
  );
}

function StyledModal({ isOpen, onClose, title, message, type = 'success', txid }) {
  if (!isOpen) return null;

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  };

  const contentStyle = {
    background: '#1a1a1a',
    borderRadius: '8px',
    padding: '2rem',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'center',
    color: '#fff',
    border: `1px solid ${type === 'success' ? '#1cc29a' : '#ff4d4f'}`,
  };

  const iconStyle = {
    fontSize: '3rem',
    marginBottom: '1rem',
    color: '#fff',
  };

  const viewTxButton = (txid) => {
    if (txid) {
      window.open(`https://solscan.io/tx/${txid}`, '_blank');
    }
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={iconStyle}>{type === 'success' ? '✅' : '❌'}</div>
        <h3 style={{ margin: '0 0 1rem 0', color: type === 'success' ? '#1cc29a' : '#ff4d4f' }}>{title}</h3>
        <p style={{ margin: 0, whiteSpace: 'pre-line', color: '#fff' }}>{message}</p>
        {type === 'success' && txid && (
          <button
            onClick={() => viewTxButton(txid)}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: '#1cc29a',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '1rem',
            }}
          >
            View on Solscan
          </button>
        )}
        <button
          onClick={onClose}
          style={{
            padding: '0.5rem 1rem',
            background: type === 'success' ? '#1cc29a' : '#ff4d4f',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function SpotInterface({ selectedToken, allTokens, setSelectedToken }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [side, setSide] = useState('buy');
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [slippage, setSlippage] = useState(1);
  const [balance, setBalance] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [successTxid, setSuccessTxid] = useState('');
  const timeoutRef = useRef(null);

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
        if (selectedToken) {
          try {
            const mint = new PublicKey(selectedToken.address);
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
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [wallet.connected, connection, wallet.publicKey, selectedToken]);

  const getQuoteInternal = async (amount) => {
    if (!amount || !wallet.publicKey || !selectedToken) return;
    setError('');
    try {
      const inputMint = side === 'buy' ? new PublicKey(SOL_MINT) : new PublicKey(selectedToken.address);
      const outputMint = side === 'buy' ? new PublicKey(selectedToken.address) : new PublicKey(SOL_MINT);
      let inputDecimals = side === 'buy' ? 9 : selectedToken.decimals || 9;
      let outputDecimals = side === 'buy' ? selectedToken.decimals || 9 : 9;
      if (selectedToken.address === USDARK_CA) {
        inputDecimals = side === 'sell' ? 6 : 9;
        outputDecimals = side === 'buy' ? 6 : 9;
      }
      const amountInLamports = Math.floor(parseFloat(amount) * (10 ** inputDecimals));
      if (amountInLamports <= 0) throw new Error('Invalid amount');
      const params = new URLSearchParams({
        inputMint: inputMint.toString(),
        outputMint: outputMint.toString(),
        amount: amountInLamports.toString(),
        slippageBps: Math.floor(slippage * 100).toString(),
      });
      const quoteRes = await fetch(`https://lite-api.jup.ag/swap/v1/quote?${params}`);
      if (!quoteRes.ok) {
        const errorText = await quoteRes.text();
        throw new Error(`Failed to get quote: ${quoteRes.status} - ${errorText}`);
      }
      const quote = await quoteRes.json();
      const outAmount = parseFloat(quote.outAmount) / (10 ** outputDecimals);
      setOutputAmount(outAmount.toFixed(6));
      return quote;
    } catch (e) {
      console.error('Quote error:', e);
      setError(e.message);
      setOutputAmount('');
    }
  };

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!selectedToken || !inputAmount) {
      setOutputAmount('');
      setIsFetchingQuote(false);
      return;
    }
    timeoutRef.current = setTimeout(async () => {
      setIsFetchingQuote(true);
      await getQuoteInternal(inputAmount);
      setIsFetchingQuote(false);
    }, 500);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [inputAmount, side, selectedToken, slippage]);

  const executeSwap = async () => {
    if (!wallet.connected || !inputAmount || !wallet.publicKey || !selectedToken) return;
    setError('');
    try {
      const inputMint = side === 'buy' ? new PublicKey(SOL_MINT) : new PublicKey(selectedToken.address);
      const outputMint = side === 'buy' ? new PublicKey(selectedToken.address) : new PublicKey(SOL_MINT);
      let inputDecimals = side === 'buy' ? 9 : selectedToken.decimals || 9;
      if (selectedToken.address === USDARK_CA) {
        inputDecimals = side === 'sell' ? 6 : 9;
      }
      const amountInLamports = Math.floor(parseFloat(inputAmount) * (10 ** inputDecimals));
      if (amountInLamports <= 0) throw new Error('Invalid amount');
      const params = new URLSearchParams({
        inputMint: inputMint.toString(),
        outputMint: outputMint.toString(),
        amount: amountInLamports.toString(),
        slippageBps: Math.floor(slippage * 100).toString(),
      });
      const quoteRes = await fetch(`https://lite-api.jup.ag/swap/v1/quote?${params}`);
      if (!quoteRes.ok) {
        const errorText = await quoteRes.text();
        throw new Error(`Failed to get quote: ${quoteRes.status} - ${errorText}`);
      }
      const quote = await quoteRes.json();
      const swapRes = await fetch('https://lite-api.jup.ag/swap/v1/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto',
        }),
      });
      if (!swapRes.ok) {
        const errorText = await swapRes.text();
        throw new Error(`Failed to get swap transaction: ${swapRes.status} - ${errorText}`);
      }
      const { swapTransaction } = await swapRes.json();
      const swapTransactionBuf = Uint8Array.from(atob(swapTransaction), (c) => c.charCodeAt(0));
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      const signedTx = await wallet.signTransaction(transaction);
      const txid = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      await connection.confirmTransaction(txid, 'confirmed');
      setInputAmount('');
      const fetchBalances = async () => {
        if (wallet.connected && wallet.publicKey) {
          try {
            const solBalance = (await connection.getBalance(wallet.publicKey)) / LAMPORTS_PER_SOL;
            setBalance(solBalance);
          } catch (e) {
            console.error('SOL Balance fetch error:', e);
            setBalance(0);
          }
          if (selectedToken) {
            try {
              const mint = new PublicKey(selectedToken.address);
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
      setSuccessTxid(txid);
      setModalMessage('Your swap was successful!');
      setShowSuccess(true);
    } catch (e) {
      console.error('Swap error:', e);
      setModalMessage(e.message);
      setShowError(true);
    }
  };

  if (!selectedToken) {
    return <div style={{ padding: '1rem', textAlign: 'center', color: '#fff' }}>Select a token to trade</div>;
  }

  const inputBalance = side === 'buy' ? balance : tokenBalance;
  const maxInput = inputBalance * 0.99;
  const handleMax = () => setInputAmount(maxInput.toFixed(6));

  const swapButtonColor = side === 'buy' ? '#1cc29a' : '#ff4d4f';

  return (
    <>
      <StyledModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Swap Successful!"
        message={modalMessage}
        type="success"
        txid={successTxid}
      />
      <StyledModal
        isOpen={showError}
        onClose={() => setShowError(false)}
        title="Swap Failed"
        message={modalMessage}
        type="error"
      />
      <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '0.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.5rem' }}>
          <button
            onClick={() => { setSide('buy'); setInputAmount(''); }}
            style={{
              padding: '0.4rem',
              border: 'none',
              borderRadius: '4px',
              background: side === 'buy' ? '#1cc29a' : '#2a2a2a',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            Buy
          </button>
          <button
            onClick={() => { setSide('sell'); setInputAmount(''); }}
            style={{
              padding: '0.4rem',
              border: 'none',
              borderRadius: '4px',
              background: side === 'sell' ? '#ff4d4f' : '#2a2a2a',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            Sell
          </button>
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#fff', marginBottom: '0.25rem' }}>
            {side === 'buy' ? 'SOL' : selectedToken.symbol} Amount
          </label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="number"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              placeholder="0.0"
              style={{
                flex: 1,
                padding: '0.4rem',
                background: '#2a2a2a',
                border: '1px solid #333',
                borderRadius: '4px 0 0 4px',
                color: '#fff',
                fontSize: '0.875rem',
              }}
            />
            <button
              onClick={handleMax}
              style={{
                padding: '0.4rem 0.8rem',
                background: '#333',
                border: '1px solid #333',
                color: '#fff',
                borderLeft: 'none',
                borderRadius: '0 4px 4px 0',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              Max
            </button>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#fff', marginTop: '0.25rem' }}>
            Balance: {inputBalance.toFixed(4)} {side === 'buy' ? 'SOL' : selectedToken.symbol}
          </div>
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#fff', marginBottom: '0.25rem' }}>Slippage %</label>
          <input
            type="number"
            value={slippage}
            onChange={(e) => setSlippage(Math.max(1, parseFloat(e.target.value) || 1))}
            step="0.1"
            min="1"
            style={{
              width: '100%',
              padding: '0.4rem',
              background: '#2a2a2a',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '0.875rem',
            }}
          />
        </div>

        {isFetchingQuote && <div style={{ fontSize: '0.75rem', color: '#fff', textAlign: 'center' }}>Loading quote...</div>}
        {outputAmount && (
          <div style={{ marginBottom: '0.5rem', padding: '0.5rem', background: '#2a2a2a', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#fff' }}>
              <span>Output:</span>
              <span>{outputAmount} {side === 'buy' ? selectedToken.symbol : 'SOL'}</span>
            </div>
          </div>
        )}
        {error && <div style={{ color: '#ff4d4f', fontSize: '0.75rem', marginBottom: '0.5rem' }}>{error}</div>}
        <button
          onClick={executeSwap}
          disabled={!inputAmount || isFetchingQuote || parseFloat(inputAmount) > inputBalance || !wallet.connected}
          style={{
            width: '100%',
            padding: '0.6rem',
            background: swapButtonColor,
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: (!inputAmount || parseFloat(inputAmount) > inputBalance || !wallet.connected) ? 'not-allowed' : 'pointer',
            opacity: (!inputAmount || parseFloat(inputAmount) > inputBalance || !wallet.connected) ? 0.5 : 1,
            fontSize: '0.875rem',
          }}
        >
          {side === 'buy' ? 'Buy' : 'Sell'} {selectedToken.symbol}
        </button>
      </div>
    </>
  );
}

function App() {
  const [tokens, setTokens] = useState([]);
  const [trendingTokens, setTrendingTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedPerpSymbol, setSelectedPerpSymbol] = useState('PERP_ETH_USDC');
  const [loading, setLoading] = useState(true);
  const [tokenMeta, setTokenMeta] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => 'https://solana-rpc.publicnode.com', []);
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

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
        setTokenMeta(data);
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
        const allTokens = [];
        const mints = [
          USDARK_CA, XBT, DEEP, JUP_MINT, JTO_MINT,
          PUMP_MINT, USDC_MINT, PANDU, PFP, FSJAL, ALPHA, 
          TARIFCOIN, LENNY, RAGE, FOURTWENTY, Starecat, SERIOUSCAT, PINHEAD, ALCH, PLX, STUPID, SONIAN, POLYMI
        ];

        for (const mint of mints) {
          try {
            const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
            const data = await response.json();
            if (data.pairs && data.pairs.length > 0) {
              const basePairs = data.pairs.filter(p => p.baseToken.address === mint);
              if (basePairs.length > 0) {
                const preferredPair = basePairs.find(p =>
                  (p.quoteToken.address === SOL_MINT || p.quoteToken.address === USDC_MINT) &&
                  p.chainId === 'solana' &&
                  p.priceUsd &&
                  parseFloat(p.volume?.h24 || 0) > 0
                );
                const pair = preferredPair || basePairs[0];
                if (pair) {
                  allTokens.push(pair);
                }
              }
            }
          } catch (e) {
            console.error(`Error fetching token ${mint}:`, e);
          }
        }

        const uniqueTokens = allTokens.map((pair) => ({
          address: pair.baseToken?.address || '',
          name: pair.baseToken?.name || 'Unknown',
          symbol: pair.baseToken?.symbol || '???',
          price: parseFloat(pair.priceUsd) || 0,
          priceChange24h: parseFloat(pair.priceChange?.h24) || 0,
          volume24h: parseFloat(pair.volume?.h24) || 0,
          liquidity: parseFloat(pair.liquidity?.usd) || 0,
        })).filter(t => t.address && t.price > 0);

        let sortedTokens = uniqueTokens.sort((a, b) => b.volume24h - a.volume24h);

        const enrichedTokens = sortedTokens.map((token) => {
          const meta = tokenMeta.find((m) => m.address === token.address);
          let decimals = meta ? meta.decimals : 9;
          if (token.address === USDARK_CA) {
            decimals = 6;
          }
          return {
            ...token,
            decimals,
            logoURI: meta ? meta.logoURI : null,
          };
        });

        setTokens(enrichedTokens);

        // Compute top gainers for trending
        const topGainers = enrichedTokens
          .filter(t => t.priceChange24h > 0) // Only positive gains
          .sort((a, b) => b.priceChange24h - a.priceChange24h)
          .slice(0, 4);
        setTrendingTokens(topGainers);

        // Only set selectedToken if none is currently selected or if current selection is not in the new token list
        if (!selectedToken || !enrichedTokens.some(t => t.address === selectedToken.address)) {
          const darkToken = enrichedTokens.find(t => t.address === USDARK_CA) || enrichedTokens[0];
          setSelectedToken(darkToken);
        }
      } catch (error) {
        console.error('Error loading tokens:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTokens();
    const interval = setInterval(loadTokens, 30000);
    return () => clearInterval(interval);
  }, [tokenMeta, selectedToken]);

  const formatPrice = (price) => (price < 0.01 ? `$${price.toFixed(6)}` : `$${price.toFixed(2)}`);
  const formatNumber = (num) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${(num / 1e3).toFixed(2)}K`;
  };

  const medals = ['🥇', '🥈', '🥉', '🏅'];

  const mainContainerStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '250px 1fr 350px',
    gridTemplateAreas: isMobile ? '"sidebar" "main" "trade"' : '"sidebar main trade"',
    height: isMobile ? 'auto' : 'calc(100vh - 100px)',
    minHeight: isMobile ? 'auto' : 'calc(100vh - 100px)',
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
                    color: '#1cc29a',
                    cursor: 'pointer',

                    fontWeight: '800',
                  }}
                >
                  <span style={{
                    fontWeight: '600',
                    textDecoration: 'none',
                    color: '#ffffffff'
                  }}>CA :</span> {USDARK_CA}
                </div>
              </div>
              <div
                style={{
                  borderBottom: '1px solid #262626',
                  padding: '0.5rem 0rem',
                  display: 'flex',
                  alignItems: 'center',
                  background: '#1a1a1a',
                  color: '#fff',
                  position: 'sticky',
                  top: '40px',
                  zIndex: 900,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  gap: '0.5rem',
                }}
                className="ads-bar"
              >
                <span style={{ flexShrink: 0, color: '#fff', fontWeight: 500, background: '#1a1a1a', zIndex: 900, paddingLeft: 10 }}>🔥 Trending :</span>

                <div
                  style={{
                    display: 'inline-block',
                    marginLeft: '0.5rem',
                    animation: 'scroll-left 12s linear infinite',
                  }}
                >
                  <span style={{ color: '#00ff9d', fontWeight: 600 }}>
                    {trendingTokens.map((token, index) => (
                      <span key={token.address} style={{ color: '#00ff9d', fontWeight: 600 }}>
                        {medals[index]} ${token.symbol} + {token.priceChange24h.toFixed(2)}%
                      </span>
                    )).reduce((prev, curr) => prev ? [prev, ' ', curr] : curr, null)}
                  </span>
                </div>

                <style>
                  {`
      @keyframes scroll-left {
        from { transform: translateX(100%); }
        to { transform: translateX(-100%); }
      }

      .ads-bar div:hover {
        animation-play-state: paused; /* optional: pause on hover */
      }
    `}
                </style>
              </div>



              <div
                style={{
                  borderBottom: '1px solid #262626',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#1a1a1a',
                  flexWrap: 'nowrap',   // ✅ force all items on one line
                  whiteSpace: 'nowrap', // ✅ prevents text or inline elements from wrapping
                  overflow: 'hidden',   // optional: hides overflow
                  position: 'sticky',
                  top: '40px',
                  zIndex: 900,
                }}
                className="nav-bar"
              >
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'no-wrap' }}>
                  <h1 style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 'bold', color: '#fff' }}>USDARK-DEX</h1>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'no-wrap' }}>
                    <button
                      onClick={() => {
                        window.location.href = `https://usdark.trade/perp/${selectedPerpSymbol}/`;
                      }}
                      className="nav-btn"
                      style={{
                        padding: '0.4rem 0.8rem',
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                      }}
                    >
                      Perpetuals
                    </button>
                    <button
                      onClick={() => {
                        window.location.href = 'https://usdark.fun';
                      }}
                      className="nav-btn"
                      style={{
                        padding: '0.4rem 0.8rem',
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                      }}
                    >
                      USDARK PAD
                    </button>
                    {/* <select
                      value={selectedPerpSymbol}
                      onChange={(e) => setSelectedPerpSymbol(e.target.value)}
                      style={{
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
                      {[
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
                      ))}
                    </select> */}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <WalletMultiButton className="wallet-adapter-button-desktop" style={{ backgroundColor: 'rgba(28, 194, 155, 0)', padding: 0, fontSize: '0.85rem' }} />
                  <WalletIconButton />
                </div>
              </div>

              <div style={mainContainerStyle} className="main-container">
                <div style={sidebarStyle} className="markets-sidebar">
                  <h3 style={{ fontSize: '0.675rem', marginBottom: '1rem', color: '#fff' }}>Markets</h3>
                  {loading ? (
                    <div style={{ color: '#fff', fontSize: '0.75rem' }}>Loading...</div>
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
                            <div style={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#fff' }}>{token.symbol}</div>
                            <div style={{ fontSize: '0.75rem', color: '#fff' }}>{token.name}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.875rem', color: '#fff' }}>{formatPrice(token.price)}</div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: token.priceChange24h >= 0 ? '#1cc29a' : '#ff4d4f',
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
                  <div style={{ padding: isMobile ? '0.5rem' : '0.75rem' }}>
                    <TokenSelector
                      tokens={tokens}
                      selectedToken={selectedToken}
                      setSelectedToken={setSelectedToken}
                    />
                  </div>

                  {selectedToken && (
                    <>
                      <div
                        className="info-box"
                        style={{ padding: isMobile ? '0.5rem' : '0.75rem', borderBottom: '1px solid #262626', background: '#1a1a1a' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }} className="title-glow">
                            {selectedToken.symbol}/SOL
                          </h2>
                          <div>
                            <span style={{ color: '#fff', fontSize: '0.75rem' }}>Price: </span>
                            <span style={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#fff' }}>{formatPrice(selectedToken.price)}</span>
                          </div>
                          <div>
                            <span style={{ color: '#fff', fontSize: '0.75rem' }}>24h Change: </span>
                            <span
                              style={{
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                                color: selectedToken.priceChange24h >= 0 ? '#1cc29a' : '#ff4d4f',
                              }}
                            >
                              {selectedToken.priceChange24h >= 0 ? '+' : ''}{selectedToken.priceChange24h.toFixed(2)}%
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#fff', fontSize: '0.75rem' }}>24h Volume: </span>
                            <span style={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#fff' }}>{formatNumber(selectedToken.volume24h)}</span>
                          </div>
                          <div>
                            <span style={{ color: '#fff', fontSize: '0.75rem' }}>Liquidity: </span>
                            <span style={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#fff' }}>{formatNumber(selectedToken.liquidity)}</span>
                          </div>
                        </div>
                      </div>
                      <div style={chartContainerStyle}>
                        <TradingViewChart
                          tokenAddress={selectedToken?.address}
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