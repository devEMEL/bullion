"use client";

import { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { Send, Wallet, Loader2, ArrowRight, Check, AlertCircle, Coins, RefreshCw } from 'lucide-react';
import { parseUnits, formatUnits, isAddress } from 'viem';
import { CONTRACTS } from '@/config/networks';
import ERC20_ABI from '@/abi/ERC20.json';
import Toast from '@/components/Toast';

export default function TokenTransferPage() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Selection mode: 'native' (BZKLTC) or 'custom' (ERC20 address)
  const [tokenType, setTokenType] = useState<'native' | 'custom'>('native');
  const [customTokenAddress, setCustomTokenAddress] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Active target token contract address
  const activeTokenAddress = useMemo(() => {
    if (tokenType === 'native') return CONTRACTS.nativeToken;
    return isAddress(customTokenAddress) ? (customTokenAddress as `0x${string}`) : undefined;
  }, [tokenType, customTokenAddress]);

  // Read Custom Token metadata (Symbol & Decimals)
  const { data: customSymbol } = useReadContract({
    address: activeTokenAddress,
    abi: ERC20_ABI.abi,
    functionName: 'symbol',
    query: { enabled: !!activeTokenAddress && tokenType === 'custom' },
  });

  const { data: customDecimals } = useReadContract({
    address: activeTokenAddress,
    abi: ERC20_ABI.abi,
    functionName: 'decimals',
    query: { enabled: !!activeTokenAddress && tokenType === 'custom' },
  });

  // Effective token symbol & decimals
  const tokenSymbol = tokenType === 'native' ? (CONTRACTS.nativeTokenSymbol || 'BZKLTC') : ((customSymbol as string) || 'TOKEN');
  const tokenDecimals = tokenType === 'native' ? (CONTRACTS.nativeTokenDecimals || 18) : ((customDecimals as number) || 18);

  // Read user balance for the active token
  const { data: balanceRaw, refetch: refetchBalance } = useReadContract({
    address: activeTokenAddress,
    abi: ERC20_ABI.abi,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address && !!activeTokenAddress, refetchInterval: 10_000 },
  });

  const formattedBalance = useMemo(() => {
    if (balanceRaw !== undefined) {
      return Number(formatUnits(balanceRaw as bigint, tokenDecimals)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      });
    }
    return '0.00';
  }, [balanceRaw, tokenDecimals]);

  // Toast notifications state
  const [toast, setToast] = useState<{
    show: boolean;
    type: 'pending' | 'success' | 'error';
    title: string;
    message: string;
    txHash?: string;
  }>({ show: false, type: 'pending', title: '', message: '' });

  const showToast = (type: 'pending' | 'success' | 'error', title: string, message: string, txHash?: string) => {
    setToast({ show: true, type, title, message, txHash });
  };

  const dismissToast = () => {
    setToast((prev) => ({ ...prev, show: false }));
  };

  // Quick percent amount filler
  const handlePercent = (pct: number) => {
    if (!balanceRaw) return;
    const raw = (balanceRaw as bigint) * BigInt(pct) / 100n;
    setAmount(formatUnits(raw, tokenDecimals));
  };

  // Transfer Action
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      open();
      return;
    }

    if (!activeTokenAddress) {
      showToast('error', 'Invalid Token', 'Please enter a valid ERC-20 token address.');
      return;
    }

    if (!isAddress(recipientAddress)) {
      showToast('error', 'Invalid Recipient', 'Please enter a valid EVM recipient address.');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      showToast('error', 'Invalid Amount', 'Please enter an amount greater than 0.');
      return;
    }

    let amountParsed: bigint;
    try {
      amountParsed = parseUnits(amount, tokenDecimals);
    } catch {
      showToast('error', 'Invalid Amount', 'Please verify your number formatting.');
      return;
    }

    if (balanceRaw !== undefined && amountParsed > (balanceRaw as bigint)) {
      showToast('error', 'Insufficient Balance', `You do not have enough ${tokenSymbol} to complete this transfer.`);
      return;
    }

    try {
      setIsSending(true);
      showToast('pending', 'Transfer Pending', 'Please confirm the transaction in your wallet...');

      let gasFees = {};
      if (publicClient) {
        try {
          const feeData = await publicClient.estimateFeesPerGas();
          if (feeData.maxFeePerGas) {
            // Apply 25% safety buffer so gas price exceeds rapidly fluctuating block baseFee
            const maxFeePerGas = (feeData.maxFeePerGas * 125n) / 100n;
            const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas
              ? (feeData.maxPriorityFeePerGas * 125n) / 100n
              : maxFeePerGas;
            gasFees = { maxFeePerGas, maxPriorityFeePerGas };
          }
        } catch {
          // Fallback to wallet default if fee estimation fails
        }
      }

      const txHash = await writeContractAsync({
        address: activeTokenAddress,
        abi: ERC20_ABI.abi,
        functionName: 'transfer',
        args: [recipientAddress as `0x${string}`, amountParsed],
        ...gasFees,
      });

      showToast('pending', 'Processing Transaction', 'Waiting for network confirmation...', txHash);

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      }

      showToast(
        'success',
        'Transfer Complete!',
        `Successfully transferred ${amount} ${tokenSymbol} to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`,
        txHash
      );

      setAmount('');
      setRecipientAddress('');
      refetchBalance();
    } catch (err: any) {
      console.error('Transfer error:', err);
      showToast('error', 'Transfer Failed', err?.shortMessage || err?.message || 'Transaction was cancelled or reverted.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="pb-40 relative z-10 w-full min-h-screen flex flex-col items-center pt-6 px-4">
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 -z-10 w-full max-w-6xl h-full pointer-events-none">
        <div className="absolute top-20 left-1/3 w-[500px] h-[500px] bg-primary/5 blur-[150px] rounded-full opacity-40" />
        <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-blue-500/5 blur-[130px] rounded-full opacity-30" />
      </div>

      {/* Toast Alert */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-[99999]">
          <Toast
            type={toast.type}
            title={toast.title}
            message={toast.message}
            txHash={toast.txHash}
            onClose={dismissToast}
          />
        </div>
      )}

      {/* Page Header */}
      <header className="text-center max-w-3xl mx-auto mb-10">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-3 flex items-center justify-center gap-3">
          Token Transfer
        </h1>
        <p className="text-white/45 text-sm md:text-base leading-relaxed">
          Send native protocol assets or custom ERC-20 tokens directly to any address on Liteforge.
        </p>
      </header>

      {/* Main Form Card */}
      <div className="w-full max-w-[840px] bg-[#0F1322]/80 border border-white/[0.08] backdrop-blur-xl rounded-2xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary/80 via-blue-500/80 to-primary/80" />

        <form onSubmit={handleTransfer} className="space-y-6">
          {/* Token Selection Tabs */}
          <div>
            <label className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-2 block">
              Select Asset To Transfer
            </label>
            <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-xl border border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setTokenType('native');
                  setCustomTokenAddress('');
                }}
                className={`py-2.5 px-4 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                  tokenType === 'native'
                    ? 'bg-primary text-black shadow-lg font-bold'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Coins size={15} />
                Native ({CONTRACTS.nativeTokenSymbol || 'BZKLTC'})
              </button>

              <button
                type="button"
                onClick={() => setTokenType('custom')}
                className={`py-2.5 px-4 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                  tokenType === 'custom'
                    ? 'bg-primary text-black shadow-lg font-bold'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <RefreshCw size={15} />
                Custom ERC-20
              </button>
            </div>
          </div>

          {/* Custom Token Address Input */}
          {tokenType === 'custom' && (
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-white/50 font-semibold flex items-center justify-between">
                <span>Custom Token Address</span>
                {activeTokenAddress && isAddress(activeTokenAddress) && (
                  <span className="text-primary font-mono lowercase text-[11px]">Valid Contract</span>
                )}
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={customTokenAddress}
                onChange={(e) => setCustomTokenAddress(e.target.value.trim())}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 font-mono text-sm focus:outline-none focus:border-primary/60 transition-colors"
                required={tokenType === 'custom'}
              />
            </div>
          )}

          {/* Balance Preview Display */}
          <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Wallet size={20} />
              </div>
              <div>
                <span className="text-xs text-white/40 font-medium block">Your Balance</span>
                <span className="text-white font-mono font-bold text-base">
                  {isConnected ? `${formattedBalance} ${tokenSymbol}` : '--'}
                </span>
              </div>
            </div>

            {isConnected && (
              <button
                type="button"
                onClick={() => refetchBalance()}
                className="text-xs text-white/40 hover:text-primary transition-colors p-2"
                title="Refresh balance"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>

          {/* Recipient Address Box */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-white/50 font-semibold block">
              Recipient Wallet Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value.trim())}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 font-mono text-sm focus:outline-none focus:border-primary/60 transition-colors"
              required
            />
          </div>

          {/* Amount Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wider text-white/50 font-semibold">
                Amount To Send
              </label>
              {isConnected && balanceRaw !== undefined && (
                <div className="flex items-center gap-1.5">
                  {[5, 10, 25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercent(pct)}
                      className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-white/5 hover:bg-primary/20 hover:text-primary text-white/50 transition-colors"
                    >
                      {pct === 100 ? 'MAX' : `${pct}%`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 font-mono text-sm focus:outline-none focus:border-primary/60 transition-colors pr-20"
                required
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-white/40 pointer-events-none">
                {tokenSymbol}
              </div>
            </div>
          </div>

          {/* Action Button */}
          {!isConnected ? (
            <button
              type="button"
              onClick={() => open()}
              className="w-full py-4 rounded-xl bg-primary text-black font-bold uppercase tracking-wider text-sm hover:brightness-110 active:scale-[0.99] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <Wallet size={18} />
              Connect Wallet
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSending}
              className={`w-full py-4 rounded-xl bg-primary text-black font-bold uppercase tracking-wider text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 ${
                isSending ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 active:scale-[0.99]'
              }`}
            >
              {isSending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send {tokenSymbol}
                </>
              )}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
