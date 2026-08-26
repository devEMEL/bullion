"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract, usePublicClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { Coins, Clock, Wallet, Loader2, ArrowRight, Check, Copy, Activity, Database, AlertCircle } from 'lucide-react';
import { formatUnits } from 'viem';
import { FAUCET_ADDRESS } from '@/lib/constants';
import { CONTRACTS } from '@/config/networks';
import FAUCET_ABI from '@/abi/Faucet.json';
import ERC20_ABI from '@/abi/ERC20.json';
import Toast from '@/components/Toast';

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [isClaiming, setIsClaiming] = useState(false);
  const [copied, setCopied] = useState(false);

  // Toast notifications
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
    setToast(prev => ({ ...prev, show: false }));
  };

  // Multicall all faucet and token data in a single RPC request (exactly like mlSwap-frontend)
  const { data: faucetData, refetch: refetchAllData } = useReadContracts({
    contracts: [
      {
        address: FAUCET_ADDRESS as `0x${string}`,
        abi: FAUCET_ABI.abi,
        functionName: 'nativeToken',
      },
      {
        address: FAUCET_ADDRESS as `0x${string}`,
        abi: FAUCET_ABI.abi,
        functionName: 'claimAmount',
      },
      {
        address: CONTRACTS.nativeToken as `0x${string}`,
        abi: ERC20_ABI.abi,
        functionName: 'balanceOf',
        args: [FAUCET_ADDRESS as `0x${string}`],
      },
      {
        address: CONTRACTS.nativeToken as `0x${string}`,
        abi: ERC20_ABI.abi,
        functionName: 'balanceOf',
        args: address ? [address as `0x${string}`] : undefined,
      },
      {
        address: FAUCET_ADDRESS as `0x${string}`,
        abi: FAUCET_ABI.abi,
        functionName: 'timeUntilNextClaim',
        args: address ? [address as `0x${string}`] : undefined,
      },
    ],
  });

  const nativeTokenAddress = (faucetData?.[0]?.result as `0x${string}`) || CONTRACTS.nativeToken;
  const claimAmountRaw = faucetData?.[1]?.result as bigint | undefined;
  const faucetBalanceRaw = faucetData?.[2]?.result as bigint | undefined;
  const userBalanceRaw = faucetData?.[3]?.result as bigint | undefined;
  const timeRemainingRaw = faucetData?.[4]?.result as bigint | undefined;

  const tokenSymbol = CONTRACTS.nativeTokenSymbol || 'bUSDC';
  const tokenDecimals = CONTRACTS.nativeTokenDecimals || 18;

  // Formatted values with instant fallback defaults
  const formattedClaimAmount = useMemo(() => {
    if (claimAmountRaw !== undefined) {
      return formatUnits(claimAmountRaw, tokenDecimals);
    }
    return '1,000';
  }, [claimAmountRaw, tokenDecimals]);

  const formattedFaucetBalance = useMemo(() => {
    if (faucetBalanceRaw !== undefined) {
      return Number(formatUnits(faucetBalanceRaw, tokenDecimals)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return '0.00';
  }, [faucetBalanceRaw, tokenDecimals]);

  const formattedUserBalance = useMemo(() => {
    if (userBalanceRaw !== undefined) {
      return Number(formatUnits(userBalanceRaw, tokenDecimals)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return '0.00';
  }, [userBalanceRaw, tokenDecimals]);

  const isFaucetEmpty = useMemo(() => {
    if (!faucetBalanceRaw || !claimAmountRaw) return false;
    return faucetBalanceRaw < claimAmountRaw;
  }, [faucetBalanceRaw, claimAmountRaw]);

  // Countdown timer logic
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (timeRemainingRaw !== undefined) {
      setSecondsLeft(Number(timeRemainingRaw));
    }
  }, [timeRemainingRaw]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          refetchAllData();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft, refetchAllData]);

  const handleCopyFaucetAddress = () => {
    navigator.clipboard.writeText(FAUCET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaim = async () => {
    if (!address || !publicClient) return;
    setIsClaiming(true);
    showToast('pending', 'Claiming Tokens', 'Please approve the transaction in your wallet...');

    try {
      let gasFees = {};
      try {
        const feeData = await publicClient.estimateFeesPerGas();
        if (feeData.maxFeePerGas) {
          const maxFeePerGas = (feeData.maxFeePerGas * 125n) / 100n;
          const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas
            ? (feeData.maxPriorityFeePerGas * 125n) / 100n
            : maxFeePerGas;
          gasFees = { maxFeePerGas, maxPriorityFeePerGas };
        }
      } catch {
        // Fallback to wallet default
      }

      const hash = await writeContractAsync({
        address: FAUCET_ADDRESS as `0x${string}`,
        abi: FAUCET_ABI.abi,
        functionName: 'claim',
        ...gasFees,
      });

      showToast('pending', 'Transaction Submitted', 'Waiting for confirmation on-chain...', hash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === 'reverted') {
        throw new Error('Transaction reverted on-chain.');
      }

      showToast('success', 'Claim Successful!', `${formattedClaimAmount} ${tokenSymbol} claimed successfully!`, hash);

      // Refresh cooldown and balances
      refetchAllData();
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Claim Failed', err?.shortMessage ?? err?.message ?? 'An error occurred during claiming.');
    } finally {
      setIsClaiming(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  const isCooldownActive = secondsLeft > 0;

  return (
    <div className="pb-40 relative z-10 w-full min-h-screen flex flex-col items-center pt-6">
      {/* Immersive background glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 -z-10 w-full max-w-6xl h-full pointer-events-none">
        <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[150px] rounded-full opacity-40" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/5 blur-[130px] rounded-full opacity-30" />
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

      {/* Header section */}
      <header className="text-center max-w-2xl mx-auto mb-12 mt-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
          Bulion Faucet
        </h1>
        <p className="text-white/45 text-sm md:text-base leading-relaxed max-w-lg mx-auto">
          Claim native protocol tokens ({tokenSymbol}) distributed directly from the deployed protocol faucet reserve.
        </p>
      </header>

      {/* Main Grid Layout */}
      <div className="w-full max-w-[1000px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start px-4 md:px-6">
        
        {/* Left Column: Asset Information & Faucet Balance */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.01] backdrop-blur-md p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Coins size={18} className="text-primary" />
                <h3 className="text-white font-semibold text-base tracking-tight">Native Faucet Asset</h3>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-white/30 font-semibold bg-white/[0.03] px-2.5 py-1 rounded-full border border-white/5">
                12 Hour Cooldown
              </span>
            </div>

            <div className="relative flex flex-col justify-between p-6 bg-white/[0.02] hover:bg-white/[0.03] border border-white/[0.06] rounded-2xl transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-primary opacity-60" />

              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Coins size={24} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white tracking-tight">{tokenSymbol} Token</h4>
                    <span className="text-xs font-mono text-white/30 uppercase tracking-wider">
                      {nativeTokenAddress ? `${nativeTokenAddress.slice(0, 8)}...${nativeTokenAddress.slice(-6)}` : 'Native Protocol Asset'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm bg-primary/10 border border-primary/20 text-primary font-mono font-bold px-3 py-1 rounded-lg inline-block">
                    +{formattedClaimAmount} {tokenSymbol}
                  </span>
                </div>
              </div>

                {/* Balances Display */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.04]">
                  <div className="p-3 bg-black/30 border border-white/[0.04] rounded-xl flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-white/30 flex items-center gap-1.5 font-semibold">
                      <Database size={12} className="text-white/40" /> Contract Stock
                    </span>
                    <span className={`text-base font-mono font-bold ${isFaucetEmpty ? 'text-red-400' : 'text-white'}`}>
                      {formattedFaucetBalance} {tokenSymbol}
                    </span>
                  </div>

                  <div className="p-3 bg-black/30 border border-white/[0.04] rounded-xl flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-white/30 flex items-center gap-1.5 font-semibold">
                      <Wallet size={12} className="text-white/40" /> Your Wallet
                    </span>
                    <span className="text-base font-mono font-bold text-white">
                      {isConnected ? `${formattedUserBalance} ${tokenSymbol}` : '--'}
                    </span>
                  </div>
                </div>
              </div>

            {/* Faucet Depleted Warning */}
            {isFaucetEmpty && (
              <div className="mt-6 px-4 py-3.5 bg-red-500/[0.04] border border-red-500/20 rounded-xl flex items-center gap-3">
                <AlertCircle size={18} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-300 leading-relaxed font-medium">
                  The faucet contract currently holds less than the claim amount. Please wait for it to be refilled by the admin.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Claim & Countdown Panel */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-md p-6 flex flex-col gap-5 shadow-xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
              <span className="text-[10px] uppercase tracking-widest text-white/35 font-bold">Claim Status</span>
              <span className="flex items-center gap-1 text-[9px] uppercase tracking-widest font-semibold text-emerald-400">
                <Activity size={10} className="animate-pulse" /> Active
              </span>
            </div>

            {/* Contract Info / Copy Block */}
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-black/40 border border-white/[0.04]">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-widest text-white/35 font-semibold">Faucet Contract</span>
                <a
                  href={`https://testnet.arcscan.app/address/${FAUCET_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] text-primary hover:underline flex items-center gap-1 transition-all"
                >
                  Scan ↗
                </a>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-white/60">
                  {FAUCET_ADDRESS.slice(0, 10)}…{FAUCET_ADDRESS.slice(-8)}
                </span>
                <button
                  onClick={handleCopyFaucetAddress}
                  className="p-1.5 rounded bg-white/[0.03] border border-white/[0.06] hover:bg-white/15 text-white/40 hover:text-white transition-all cursor-pointer"
                  title="Copy contract address"
                >
                  {copied ? (
                    <Check size={12} className="text-emerald-400" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
            </div>

            {/* Quick Stats Box */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-white/20">Claim Amount</span>
                <span className="text-xs font-semibold text-white/80">{formattedClaimAmount} {tokenSymbol}</span>
              </div>
              <div className="p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-white/20">Cooldown</span>
                <span className="text-xs font-semibold text-white/80">12 Hours</span>
              </div>
            </div>

            {/* Action Section */}
            <div className="mt-2">
              {!isConnected ? (
                <button
                  onClick={() => open()}
                  className="w-full py-3.5 px-6 rounded-full bg-primary hover:brightness-110 active:scale-[0.98] text-black text-[10px] uppercase tracking-[0.2em] font-bold transition-all gold-glow cursor-pointer flex items-center justify-center gap-2"
                >
                  <Wallet size={13} />
                  Connect Wallet
                </button>
              ) : isCooldownActive ? (
                <div className="w-full flex flex-col items-center gap-3 bg-black/30 border border-white/[0.04] rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-white/35">
                    <Clock size={15} className="text-primary animate-pulse" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Cooldown Active</span>
                  </div>
                  <div className="text-3xl font-mono tracking-[0.1em] text-white font-bold bg-white/[0.02] border border-white/[0.04] px-4 py-2.5 rounded-xl shadow-inner select-all">
                    {formatCountdown(secondsLeft)}
                  </div>
                  <p className="text-[10px] text-white/30 text-center leading-relaxed max-w-[200px]">
                    You can claim again after the countdown finishes.
                  </p>
                  <button
                    disabled
                    className="w-full py-3 px-6 mt-1 rounded-full bg-white/5 border border-white/10 text-white/20 text-[10px] uppercase tracking-[0.2em] font-bold cursor-not-allowed"
                  >
                    Claim Cooldown Active
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleClaim}
                  disabled={isClaiming || isFaucetEmpty}
                  className="w-full py-3.5 px-6 rounded-full bg-primary hover:brightness-110 active:scale-[0.98] text-black text-[10px] uppercase tracking-[0.2em] font-bold transition-all gold-glow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {isClaiming ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Claiming Tokens...
                    </>
                  ) : (
                    <>
                      Claim {formattedClaimAmount} {tokenSymbol}
                      <ArrowRight size={13} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
