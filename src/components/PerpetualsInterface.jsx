// PerpetualsInterface.jsx
import { Component } from 'react';
import { OrderlyAppProvider, TradingPage } from '@orderly.network/react';
import { WalletConnectorProvider } from '@orderly.network/wallet-connector';
import '@orderly.network/ui/dist/styles.css';

class ErrorBoundary extends Component {
  state = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 50%, #ffffff 100%);', borderRadius: '8px', padding: '1rem', color: '#ff4d4f' }}>
          <h3>Error in Perpetuals Trading</h3>
          <p>{this.state.errorMessage}</p>
          <p>Please try refreshing the page or switching to Spot trading mode.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PerpetualsInterface({ selectedPerpSymbol, setSelectedPerpSymbol }) {
  console.log('PerpetualsInterface props:', { selectedPerpSymbol });

  return (
    <ErrorBoundary>
      <WalletConnectorProvider solanaInitial={{ network: 'testnet' }}>
        <OrderlyAppProvider
          networkId="testnet"
          brokerId={process.env.REACT_APP_ORDERLY_BROKER_ID || 'your_broker_id'}
          onError={(error) => console.error('Orderly error:', error)}
        >
          <TradingPage
            symbol={selectedPerpSymbol || 'PERP_ETH_USDC'}
            onSymbolChange={(symbol) => {
              console.log('Perpetuals symbol changed to:', symbol.symbol);
              setSelectedPerpSymbol(symbol.symbol);
            }}
            tradingViewConfig={undefined} // Remove tradingViewConfig to avoid undefined error
          />
        </OrderlyAppProvider>
      </WalletConnectorProvider>
    </ErrorBoundary>
  );
}