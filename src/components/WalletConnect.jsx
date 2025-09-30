import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const WalletConnect = () => {
    return (
        <div className="wallet-connect">
            <WalletMultiButton />
        </div>
    );
};

export default WalletConnect;