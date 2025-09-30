// Real Spot Swap - Buy ANY token with SOL
function SwapInterface({ selectedToken, allTokens }) {
  const wallet = useWallet()
  const { connection } = useConnection()
  const [inputToken, setInputToken] = useState('SOL')
  const [outputToken, setOutputToken] = useState(null)
  const [inputAmount, setInputAmount] = useState('')
  const [outputAmount, setOutputAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [quote, setQuote] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (selectedToken) {
      setOutputToken(selectedToken)
    }
  }, [selectedToken])

  const filteredTokens = allTokens.filter(token => 
    token.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getQuote = async () => {
    if (!inputAmount || !outputToken) return
    try {
      setLoading(true)
      const amount = Math.floor(parseFloat(inputAmount) * 1e9)
      const { data } = await axios.get(
        `${RAYDIUM_API}/compute/swap-base-in?inputMint=${SOL_MINT}&outputMint=${outputToken.address}&amount=${amount}&slippageBps=50&txVersion=V0`
      )
      setQuote(data)
      const decimals = 9 // Most tokens use 9 decimals
      setOutputAmount((data.outputAmount / Math.pow(10, decimals)).toFixed(6))
    } catch (error) {
      alert('Quote error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const executeSwap = async () => {
    if (!wallet.connected || !quote) {
      alert('Connect wallet and get quote first')
      return
    }
    try {
      setLoading(true)
      const { data: feeData } = await axios.get(`${RAYDIUM_API}/compute/priority-fee`)
      const { data: swapData } = await axios.post(`${RAYDIUM_API}/transaction/swap-base-in`, {
        computeUnitPriceMicroLamports: String(feeData.data.default.h),
        swapResponse: quote,
        txVersion: 'V0',
        wallet: wallet.publicKey.toBase58(),
        wrapSol: true,
        unwrapSol: false
      })
      const tx = VersionedTransaction.deserialize(Buffer.from(swapData.data[0].transaction, 'base64'))
      const signed = await wallet.signTransaction(tx)
      const txid = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true })
      alert(`Swap successful! TX: ${txid}`)
      setInputAmount('')
      setOutputAmount('')
      setQuote(null)
    } catch (error) {
      alert('Swap failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="info-box">
      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Spot Trading</h3>
      
      {/* Input Token (SOL) */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Pay with</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            placeholder="0.0"
            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '2px solid #000', background: 'rgba(255,255,255,0.5)' }}
          />
          <div style={{ 
            padding: '0.75rem 1.5rem', 
            borderRadius: '8px', 
            border: '2px solid #000', 
            background: '#000', 
            color: 'white',
            fontWeight: 'bold'
          }}>
            SOL
          </div>
        </div>
      </div>

      {/* Output Token Selection */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Buy token</label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search token..."
          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '2px solid #000', background: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}
        />
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '2px solid #000', borderRadius: '8px', background: 'rgba(255,255,255,0.5)' }}>
          {filteredTokens.slice(0, 20).map(token => (
            <div
              key={token.address}
              onClick={() => {
                setOutputToken(token)
                setSearchQuery('')
              }}
              style={{
                padding: '0.75rem',
                cursor: 'pointer',
                background: outputToken?.address === token.address ? 'rgba(0,0,0,0.1)' : 'transparent',
                borderBottom: '1px solid rgba(0,0,0,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(0,0,0,0.05)'}
              onMouseLeave={(e) => e.target.style.background = outputToken?.address === token.address ? 'rgba(0,0,0,0.1)' : 'transparent'}
            >
              <div>
                <div style={{ fontWeight: 'bold' }}>{token.symbol}</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>{token.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>${token.price.toFixed(6)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Output Token */}
      {outputToken && (
        <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>You're buying: {outputToken.symbol}</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{outputToken.name}</div>
          <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Price: ${outputToken.price < 0.01 ? outputToken.price.toFixed(8) : outputToken.price.toFixed(4)}
          </div>
        </div>
      )}

      {/* Quote Result */}
      {outputAmount && outputToken && (
        <div style={{ padding: '1rem', background: 'rgba(0,255,0,0.1)', borderRadius: '8px', marginBottom: '1rem', border: '2px solid #16a34a' }}>
          <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>You'll receive approximately:</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{outputAmount} {outputToken.symbol}</div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <button 
          onClick={getQuote} 
          disabled={loading || !inputAmount || !outputToken} 
          className="nav-btn"
        >
          {loading ? 'Loading...' : 'Get Quote'}
        </button>
        <button 
          onClick={executeSwap} 
          disabled={loading || !quote || !wallet.connected} 
          className="nav-btn" 
          style={{ background: '#16a34a' }}
        >
          {wallet.connected ? (loading ? 'Swapping...' : 'Buy Now') : 'Connect Wallet'}
        </button>
      </div>

      {/* Info */}
      {!wallet.connected && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,0,0,0.1)', borderRadius: '8px', textAlign: 'center', fontSize: '0.875rem' }}>
          Connect wallet to trade
        </div>
      )}
    </div>
  )
}