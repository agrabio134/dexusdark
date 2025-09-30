import axios from 'axios';
import { RAYDIUM_API, PRIORITY_FEE_API } from '../config/constants';

export const getSwapQuote = async (inputMint, outputMint, amount, slippage = 0.5) => {
    try {
        const { data } = await axios.get(
            `${RAYDIUM_API}/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippage * 100}&txVersion=V0`
        );
        return data;
    } catch (error) {
        console.error('Error getting swap quote:', error);
        throw error;
    }
};

export const getPriorityFee = async () => {
    try {
        const { data } = await axios.get(PRIORITY_FEE_API);
        return data.data.default.h; // high priority
    } catch (error) {
        console.error('Error getting priority fee:', error);
        return 100000; // fallback
    }
};

export const executeSwap = async (wallet, swapResponse, inputMint, outputMint) => {
    try {
        const priorityFee = await getPriorityFee();
        
        const { data: swapTransactions } = await axios.post(
            `${RAYDIUM_API}/transaction/swap-base-in`,
            {
                computeUnitPriceMicroLamports: String(priorityFee),
                swapResponse,
                txVersion: 'V0',
                wallet: wallet.publicKey.toBase58(),
                wrapSol: inputMint === 'So11111111111111111111111111111111111111112',
                unwrapSol: outputMint === 'So11111111111111111111111111111111111111112'
            }
        );
        
        return swapTransactions;
    } catch (error) {
        console.error('Error executing swap:', error);
        throw error;
    }
};