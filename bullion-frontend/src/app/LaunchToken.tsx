import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { formatUnits, parseUnits } from 'viem';
import { ImagePlus, X, Loader2, Check, AlertTriangle, ExternalLink } from 'lucide-react';
import { useLaunchToken, type LaunchFormValues } from '@/hooks/useLaunchToken';
import { activeNetwork, CONTRACTS, explorerAddress, explorerToken, explorerTx } from '@/config/networks';
import { shortAddress } from '@/lib/format';
import { nativeInForTokens } from '@/lib/fairLaunchQuote';

const DURATION_UNITS = [
  { key: 'days', label: 'D', seconds: 24 * 60 * 60 },
  { key: 'hours', label: 'H', seconds: 60 * 60 },
  { key: 'minutes', label: 'M', seconds: 60 },
  { key: 'seconds', label: 'S', seconds: 1 },
] as const;

type DurationBoxes = Record<(typeof DURATION_UNITS)[number]['key'], string>;

function splitDuration(totalSeconds: number): DurationBoxes {
  let rest = Math.max(0, Math.floor(totalSeconds));
  const boxes = {} as DurationBoxes;
  for (const unit of DURATION_UNITS) {
    boxes[unit.key] = String(Math.floor(rest / unit.seconds) || '');
    rest %= unit.seconds;
  }
  return boxes;
}

function durationToSeconds(boxes: DurationBoxes): number {
  return DURATION_UNITS.reduce(
    (acc, unit) => acc + (Number(boxes[unit.key]) || 0) * unit.seconds,
    0
  );
}

const PRESET_MULTIPLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Global swap fee (bps) charged on fair-launch buys, incl. creator premines (100 = 1%). */
const PREMINE_SWAP_FEE_BPS = 100;

const initialForm: LaunchFormValues = {
  name: '',
  symbol: '',
  description: '',
  image: null,
  totalSupply: '100000000000',
  fairLaunchPercent: 40,
  fairLaunchDuration: 30 * 60,
  targetMarketCap: '10000',
  multiple: 2,
  creatorFeeAllocationPercent: 70,
  preminePercent: 0,
  startsInSeconds: 0,
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-2 gap-3">
        <span className="text-[13px] font-bold text-white/80">{label}</span>
        {hint && <span className="text-[11px] font-medium text-white/35">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-6 border-t border-white/[0.08]">
      <h2 className="text-[15px] font-extrabold tracking-tight text-white mb-5">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function DurationField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (totalSeconds: number) => void;
}) {
  const [boxes, setBoxes] = useState<DurationBoxes>(() => splitDuration(value));
  const lastValue = useRef(value);

  useEffect(() => {
    if (value === lastValue.current) return;
    lastValue.current = value;
    setBoxes(splitDuration(value));
  }, [value]);

  const onBox = (key: keyof DurationBoxes, raw: string) => {
    const clean = raw.replace(/[^0-9]/g, '').slice(0, 4);
    const next = { ...boxes, [key]: clean };
    setBoxes(next);
    const total = durationToSeconds(next);
    lastValue.current = total;
    onChange(total);
  };

  return (
    <Field label={label} hint={hint}>
      <div className="grid grid-cols-4 gap-2.5">
        {DURATION_UNITS.map((unit) => (
          <div key={unit.key} className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={boxes[unit.key]}
              onChange={(e) => onBox(unit.key, e.target.value)}
              placeholder="0"
              className="input-field num w-full h-12 pl-3.5 pr-8 text-[15px]"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#5865F2] uppercase">
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    </Field>
  );
}

export default function LaunchToken() {
  const { isConnected } = useAccount();
  const { open } = useAppKit();
  const { launch, step, error, result, reset, isBusy } = useLaunchToken();

  const [form, setForm] = useState<LaunchFormValues>(initialForm);
  const [preview, setPreview] = useState<string | null>(null);
  const [customMultiple, setCustomMultiple] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof LaunchFormValues>(key: K, value: LaunchFormValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onPickImage = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    set('image', file);
    setPreview(URL.createObjectURL(file));
  };

  const onCustomMultipleChange = (raw: string) => {
    setCustomMultiple(raw);
    const val = Number(raw);
    if (raw !== '' && Number.isFinite(val)) {
      set('multiple', val);
    }
  };

  const formatDuration = (seconds: number) => {
    const d = Math.floor(seconds / (24 * 60 * 60));
    const h = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const m = Math.floor((seconds % (60 * 60)) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.symbol.trim()) e.symbol = 'Ticker is required';
    if (form.symbol.length > 12) e.symbol = 'Max 12 characters';
    if (!form.image) e.image = 'An image is required';
    if (Number(form.totalSupply) <= 0) e.totalSupply = 'Total supply must be > 0';
    if (form.fairLaunchPercent <= 0 || form.fairLaunchPercent > 100)
      e.fairLaunchPercent = 'Fair launch supply must be between 1 and 100%';
    if (form.fairLaunchDuration <= 0) e.fairLaunchDuration = 'Pick a fair launch duration';
    if (Number(form.targetMarketCap) <= 0) e.targetMarketCap = 'Target market cap must be > 0';
    if (form.multiple < 1 || form.multiple > 20)
      e.multiple = 'Multiple must be between 1x and 20x';
    if (form.creatorFeeAllocationPercent < 0 || form.creatorFeeAllocationPercent > 70)
      e.creatorFeeAllocationPercent = 'Creator fee allocation must be between 0% and 70%';
    if (form.preminePercent < 0 || form.preminePercent > 100)
      e.preminePercent = 'Premine must be between 0% and 100% of fair launch supply';
    return e;
  }, [form]);

  const expectedRaise = useMemo(() => {
    const mcap = Number(form.targetMarketCap);
    const multiple = Number(form.multiple);
    if (!Number.isFinite(mcap) || mcap <= 0 || !Number.isFinite(multiple) || multiple <= 0)
      return null;
    return (mcap * (multiple + 1)) / (2 * multiple);
  }, [form.targetMarketCap, form.multiple]);

  // Premine token amount: % of the fair-launch supply, same math as useLaunchToken.
  const premineWei = useMemo(() => {
    if (!(form.preminePercent > 0)) return null;
    try {
      const totalSupplyWei = parseUnits(form.totalSupply || '0', 18);
      if (totalSupplyWei <= 0n) return null;

      const initialFairLaunchWei =
        (totalSupplyWei * BigInt(Math.round(form.fairLaunchPercent * 100))) / 10_000n;
      if (initialFairLaunchWei <= 0n) return null;

      const premine =
        (initialFairLaunchWei * BigInt(Math.round(form.preminePercent * 100))) / 10_000n;
      return premine > 0n ? premine : null;
    } catch {
      return null;
    }
  }, [form.preminePercent, form.fairLaunchPercent, form.totalSupply]);

  // Native token the creator pays for their premine: curve cost from position
  // zero plus the fair-launch swap fee, mirroring GemFotManager.buyFairLaunch.
  const premineCostNative = useMemo(() => {
    if (premineWei === null) return null;
    try {
      const mcapWei = parseUnits(form.targetMarketCap || '0', CONTRACTS.nativeTokenDecimals);
      const nativeIn = nativeInForTokens(
        {
          targetMarketCap: mcapWei.toString(),
          initialTokenFairLaunch:
            ((parseUnits(form.totalSupply || '0', 18) *
              BigInt(Math.round(form.fairLaunchPercent * 100))) /
              10_000n).toString(),
          multiple: String(form.multiple),
        },
        premineWei
      );
      return nativeIn + (nativeIn * BigInt(PREMINE_SWAP_FEE_BPS)) / 10_000n;
    } catch {
      return null;
    }
  }, [premineWei, form.totalSupply, form.fairLaunchPercent, form.targetMarketCap, form.multiple]);

  const premineAmountLabel =
    premineWei !== null && premineWei > 0n
      ? Number(formatUnits(premineWei, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })
      : null;

  const premineCostLabel =
    premineCostNative !== null && premineCostNative > 0n
      ? Number(formatUnits(premineCostNative, CONTRACTS.nativeTokenDecimals)).toLocaleString(
          undefined,
          { maximumFractionDigits: 6 }
        )
      : null;

  const premineTicker = form.symbol.trim().toUpperCase() || 'tokens';

  const valid = Object.keys(errors).length === 0;

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return open();
    if (!valid || isBusy) return;
    setShowConfirmModal(true);
  };

  const handleConfirmLaunch = async () => {
    setShowConfirmModal(false);
    await launch(form);
  };

  const stepLabel =
    step === 'uploading'
      ? 'Uploading to IPFS…'
      : step === 'approving'
        ? form.preminePercent > 0
          ? 'Approving bUSDC (fee + premine)…'
          : 'Approving 10 bUSDC launch fee…'
        : step === 'signing'
          ? 'Confirm in your wallet…'
          : step === 'confirming'
            ? 'Waiting for confirmation…'
            : 'Launch token';

  if (step === 'done' && result) {
    return (
      <div className="min-h-screen">
        <div className="max-w-lg mx-auto px-4 py-16">
          <div className="bg-[#121624] rounded-[28px] p-8 border border-white/[0.08] shadow-2xl text-center flex flex-col items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-[#5865F2] flex items-center justify-center shadow-[0_4px_16px_rgba(88,101,242,0.4)]">
              <Check size={24} className="text-white" strokeWidth={3} />
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#5865F2]">Launch confirmed</p>
              <h2 className="text-[28px] font-extrabold tracking-tight text-white mt-2">
                {form.symbol.toUpperCase()} is live
              </h2>
              <p className="text-white/50 text-[14px] mt-2 max-w-[40ch] leading-relaxed mx-auto">
                Your fair launch has started. The subgraph will index it in a few blocks.
              </p>
            </div>
            <div className="w-full border-t border-white/[0.08] pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-white/40">Token Address</span>
                <span className="text-[13px] font-bold text-white/80 font-mono">
                  {shortAddress(result.memecoin, 6)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-white/40">Transaction</span>
                <a
                  href={explorerTx(result.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-bold text-[#5865F2] hover:text-[#7983F5] flex items-center gap-1.5"
                >
                  {shortAddress(result.txHash, 6)}
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 w-full mt-2">
              <Link to={`/token/${result.memecoin}`} className="btn btn-primary h-12 text-[14px]">
                View token page
              </Link>
              <button
                onClick={() => {
                  reset();
                  setForm(initialForm);
                  setPreview(null);
                  setCustomMultiple('');
                }}
                className="btn btn-soft h-12 text-[14px]"
              >
                Launch another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[980px] mx-auto px-4 md:px-8 py-4 md:py-6">
        <div className="text-center mb-6">
          <h1 className="text-[28px] md:text-[36px] font-extrabold tracking-tight text-white">
            Launch your memecoin
          </h1>
          <p className="text-white/50 text-[14px] mt-1.5 max-w-[52ch] mx-auto leading-relaxed">
            Bonding-curve fair launch, automatic liquidity, and creator fees. Launch fee is 10 bUSDC.
          </p>
        </div>

        <form
          onSubmit={handleInitialSubmit}
          className="bg-[#121624] rounded-[28px] p-6 md:p-8 border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)] space-y-0"
        >
          {/* Identity */}
          <section className="pb-6">
            <h2 className="text-[15px] font-extrabold tracking-tight text-white mb-5">Identity</h2>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="shrink-0">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickImage(e.target.files?.[0])}
                />
                {preview ? (
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-md">
                    <img src={preview} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        set('image', null);
                        setPreview(null);
                        if (fileRef.current) fileRef.current.value = '';
                      }}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-[#5865F2] transition-colors cursor-pointer shadow-sm"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      onPickImage((e.target as HTMLInputElement).files?.[0]);
                    }}
                    className="w-28 h-28 rounded-2xl border-2 border-dashed border-white/10 bg-black/30 flex flex-col items-center justify-center gap-2 text-white/40 hover:text-[#5865F2] hover:border-[#5865F2]/40 hover:bg-[#5865F2]/10 transition-colors cursor-pointer"
                  >
                    <ImagePlus size={22} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em]">Image</span>
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-4">
                <Field label="Name">
                  <input
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Bullion Token"
                    maxLength={40}
                    className="input-field w-full h-12 px-4 text-[15px]"
                  />
                </Field>
                <Field label="Ticker" hint={`${form.symbol.length}/12`}>
                  <input
                    value={form.symbol}
                    onChange={(e) => set('symbol', e.target.value.toUpperCase())}
                    placeholder="BULL"
                    maxLength={12}
                    className="input-field mono w-full h-12 px-4 text-[15px] uppercase tracking-[0.08em]"
                  />
                </Field>
              </div>
            </div>
          </section>

          <Section title="Supply">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Total supply" hint="tokens">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.totalSupply}
                  onChange={(e) => set('totalSupply', e.target.value.replace(/[^0-9.]/g, ''))}
                  className="input-field num w-full h-12 px-4 text-[15px]"
                />
              </Field>
              <Field label="Fair launch supply" hint="% of total">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.fairLaunchPercent}
                    onChange={(e) =>
                      set('fairLaunchPercent', Number(e.target.value.replace(/[^0-9.]/g, '')))
                    }
                    className="input-field num w-full h-12 pl-4 pr-10 text-[15px]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#5865F2]">
                    %
                  </span>
                </div>
              </Field>
              <Field label="Premine" hint="% of fair launch supply">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.preminePercent}
                    onChange={(e) =>
                      set('preminePercent', Number(e.target.value.replace(/[^0-9.]/g, '')))
                    }
                    placeholder="0"
                    className="input-field num w-full h-12 pl-4 pr-10 text-[15px]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#5865F2]">
                    %
                  </span>
                </div>
                {premineAmountLabel && (
                  <p className="mt-2 text-[12px] text-white/40 flex items-baseline justify-between">
                    <span>Premine amount</span>
                    <span className="font-bold text-white/80 tabular-nums">
                      {premineAmountLabel}{' '}
                      <span className="text-white/30 font-medium">{premineTicker}</span>
                    </span>
                  </p>
                )}
                {premineCostLabel && (
                  <p className="mt-2 text-[12px] text-white/40 flex items-baseline justify-between">
                    <span>You send</span>
                    <span className="font-bold text-[#5865F2]">
                      ≈ {premineCostLabel}{' '}
                      <span className="text-white/30 font-medium">{CONTRACTS.nativeTokenSymbol}</span>
                    </span>
                  </p>
                )}
              </Field>
            </div>
          </Section>

          <Section title="The curve & timing">
            <DurationField
              label="Fair launch duration"
              hint="days / hours / minutes / seconds"
              value={form.fairLaunchDuration}
              onChange={(seconds) => set('fairLaunchDuration', seconds)}
            />
            <DurationField
              label="Launch delay"
              hint="0 = immediately"
              value={form.startsInSeconds}
              onChange={(seconds) => set('startsInSeconds', seconds)}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Target market cap" hint={CONTRACTS.nativeTokenSymbol}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.targetMarketCap}
                  onChange={(e) => set('targetMarketCap', e.target.value.replace(/[^0-9.]/g, ''))}
                  className="input-field num w-full h-12 px-4 text-[15px]"
                />
                <p className="mt-2 text-[12px] text-white/40 flex items-baseline justify-between">
                  <span>Expected raise</span>
                  <span className="font-bold text-[#5865F2]">
                    {expectedRaise !== null
                      ? expectedRaise.toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : '—'}{' '}
                    <span className="text-white/30 font-medium">{CONTRACTS.nativeTokenSymbol}</span>
                  </span>
                </p>
              </Field>
              <Field label="Curve multiple" hint="max 20x">
                <div className="space-y-3">
                  <div className="grid grid-cols-5 gap-1.5">
                    {PRESET_MULTIPLES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          set('multiple', m);
                          setCustomMultiple('');
                        }}
                        className={`h-10 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                          form.multiple === m && !customMultiple
                            ? 'bg-[#5865F2] text-white shadow-[0_4px_12px_rgba(88,101,242,0.35)]'
                            : 'bg-black/30 text-white/40 hover:text-white border border-white/5'
                        }`}
                      >
                        {m}x
                      </button>
                    ))}
                  </div>
                  <div className="relative mb-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customMultiple}
                      onChange={(e) =>
                        onCustomMultipleChange(e.target.value.replace(/[^0-9.]/g, ''))
                      }
                      placeholder="Custom multiple (e.g. 15)"
                      className={`input-field num w-full h-12 pl-4 pr-8 text-[14px] ${
                        customMultiple ? '!border-[#5865F2]/50' : ''
                      }`}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#5865F2]">
                      x
                    </span>
                  </div>
                </div>
              </Field>
            </div>
          </Section>

          <Section title="Payout">
            <Field label="Creator fee share" hint="max 70% of swap fees">
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.creatorFeeAllocationPercent}
                  onChange={(e) =>
                    set('creatorFeeAllocationPercent', Number(e.target.value.replace(/[^0-9.]/g, '')))
                  }
                  className="input-field num w-full h-12 pl-4 pr-10 text-[15px]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#5865F2]">
                  %
                </span>
              </div>
            </Field>
          </Section>

          <div className="pt-6 border-t border-white/[0.08] space-y-4">
            {error && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-[13px] text-red-300 leading-relaxed break-words">{error}</p>
              </div>
            )}

            {!valid && Object.keys(errors).length > 0 && (
              <p className="text-[12px] font-semibold text-white/40">{Object.values(errors)[0]}</p>
            )}

            <button
              type="submit"
              disabled={isBusy || (isConnected && !valid)}
              className="btn btn-primary w-full h-14 text-[15px]"
            >
              {isBusy && <Loader2 size={16} className="animate-spin" />}
              {isConnected ? stepLabel : 'Connect wallet to launch'}
            </button>

            <p className="text-[12px] font-medium text-white/35 text-center">
              Launch fee is 10 bUSDC + gas on {activeNetwork.label}
            </p>
          </div>
        </form>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121624] border border-white/[0.08] rounded-[28px] max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <h3 className="text-[17px] font-extrabold text-white">Review launch</h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1 text-[13px]">
              {[
                ['Token Name', form.name],
                ['Ticker', form.symbol],
                ['Total Supply', Number(form.totalSupply).toLocaleString()],
                ['Fair Launch Supply', `${form.fairLaunchPercent}%`],
                [
                  'Premine',
                  form.preminePercent > 0
                    ? `${premineAmountLabel ? `${premineAmountLabel} ${premineTicker} ` : ''}(${form.preminePercent}%${
                        premineCostLabel ? `, ≈ ${premineCostLabel} ${CONTRACTS.nativeTokenSymbol}` : ''
                      })`
                    : 'None',
                ],
                ['Fair Launch Duration', formatDuration(form.fairLaunchDuration)],
                [
                  'Launch Start',
                  form.startsInSeconds > 0
                    ? `Starts in ${formatDuration(form.startsInSeconds)}`
                    : 'Immediately',
                ],
                ['Target Market Cap', `${Number(form.targetMarketCap).toLocaleString()} bUSDC`],
                [
                  'Expected Raise',
                  expectedRaise !== null
                    ? `${expectedRaise.toLocaleString(undefined, { maximumFractionDigits: 2 })} bUSDC`
                    : '—',
                ],
                ['Curve Multiple', `${form.multiple}x`],
                ['Creator Fee Share', `${form.creatorFeeAllocationPercent}%`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between py-2.5 border-b border-white/[0.06]"
                >
                  <span className="text-white/40 font-medium">{label}</span>
                  <span className="font-bold text-white">{value}</span>
                </div>
              ))}
              <div className="flex justify-between py-2.5 text-[#5865F2]">
                <span className="font-semibold">Launch Fee</span>
                <span className="font-extrabold">10 bUSDC</span>
              </div>
            </div>

            <p className="text-[12px] text-white/40 leading-relaxed">
              By proceeding, you will approve GemFotManager to spend 10 bUSDC and trigger token
              deployment.
            </p>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 btn btn-soft h-12 text-[14px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLaunch}
                className="flex-1 btn btn-primary h-12 text-[14px]"
              >
                Confirm & Launch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
