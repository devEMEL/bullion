import React, { useRef } from 'react';
import { LogoMark } from '@/components/bulion/Logo';

export default function Cover() {
  const bannerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-[#05070d] text-white flex flex-col items-center justify-center p-4 md:p-8">
      {/* Page Header / Instructions */}
      <div className="w-full max-w-[1500px] mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#5865F2] animate-pulse"></span>
            Bulion X / Twitter Banner Preview
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Exact 3:1 aspect ratio (1500px × 500px). Right-click & save or screenshot the frame below.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-white/70">
            1500 × 500 PX
          </span>
        </div>
      </div>

      {/* Banner Container Frame */}
      <div
        ref={bannerRef}
        id="twitter-cover-banner"
        className="w-full max-w-[1500px] aspect-[3/1] bg-[#080B14] rounded-2xl border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.8)] overflow-hidden relative flex flex-col justify-between p-8 md:p-14 select-none group"
      >
        {/* Background Gradients & Glow Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#090D1A] via-[#070911] to-[#040509] pointer-events-none" />

        {/* Ambient Glow Orbs */}
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[120%] bg-[#5865F2]/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-[20%] right-[10%] w-[45%] h-[100%] bg-[#3B82F6]/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-[20%] right-[30%] w-[30%] h-[60%] bg-[#8B5CF6]/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Cyberpunk Grid Mesh Overlay */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Background Futuristic Geometric Lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="lineGrad1" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5865F2" stopOpacity="0" />
              <stop offset="50%" stopColor="#5865F2" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lineGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0" />
              <stop offset="70%" stopColor="#8B5CF6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Decorative Chart Curves */}
          <path
            d="M 0 380 Q 300 360, 600 280 T 1200 120 T 1500 40"
            fill="none"
            stroke="url(#lineGrad1)"
            strokeWidth="3"
          />
          <path
            d="M 0 420 Q 400 390, 750 290 T 1350 150 T 1500 80"
            fill="none"
            stroke="url(#lineGrad2)"
            strokeWidth="2"
            strokeDasharray="6 6"
          />
          <circle cx="1200" cy="120" r="4" fill="#60A5FA" className="animate-ping" />
        </svg>

        {/* Top Header Row of Banner */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5 bg-white/[0.04] backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-white/80">
              Powered by LitVM
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono tracking-widest text-white/40 uppercase bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.05]">
              Uniswap v4 Architecture
            </span>
          </div>
        </div>

        {/* Middle Body Content: Main Brand Typography & Logo */}
        <div className="relative z-10 my-auto flex items-center justify-between gap-8">
          {/* Left Hero Text Block */}
          <div className="flex flex-col gap-3 max-w-[65%]">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-[#5865F2] to-[#3B82F6] rounded-2xl blur-lg opacity-60 group-hover:opacity-100 transition duration-500" />
                <div className="relative bg-[#070910] p-3 rounded-2xl border border-white/20 shadow-2xl">
                  <LogoMark size={54} className="text-white" />
                </div>
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white flex items-center gap-3">
                Bulion
                <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#7983F5]">
                  Protocol
                </span>
              </h1>
            </div>

            <p className="text-lg lg:text-2xl font-medium tracking-tight text-white/90 leading-snug font-sans">
              Fair-Launch Memecoin Protocol on <span className="text-[#60A5FA] font-semibold">LitVM</span>
            </p>

            <p className="text-xs lg:text-sm text-white/50 max-w-xl font-normal leading-relaxed">
              Bonding-curve price discovery, automated bid-wall protection & creator fee streams powered by custom hooks.
            </p>
          </div>

          {/* Right Floating Visual Card Grid */}
          <div className="hidden sm:flex flex-col gap-3 relative z-10">
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl flex items-center gap-3 transform hover:-translate-y-1 transition duration-300">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-lg font-bold">
                ⚡
              </div>
              <div>
                <div className="text-xs font-bold text-white">Bonding Curve</div>
                <div className="text-[10px] text-white/50">Instant Automated Liquidity</div>
              </div>
            </div>

            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl flex items-center gap-3 ml-6 transform hover:-translate-y-1 transition duration-300">
              <div className="w-9 h-9 rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#7983F5] text-lg font-bold">
                🛡️
              </div>
              <div>
                <div className="text-xs font-bold text-white">Bid-Wall Protection</div>
                <div className="text-[10px] text-white/50">Anti-Dump Floor Support</div>
              </div>
            </div>

            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl flex items-center gap-3 transform hover:-translate-y-1 transition duration-300">
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 text-lg font-bold">
                🔥
              </div>
              <div>
                <div className="text-xs font-bold text-white">Zero Premine Exploits</div>
                <div className="text-[10px] text-white/50">100% Transparent Initial Distribution</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar / Footer Row of Banner */}
        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/[0.08]">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-white/40 font-mono">Status:</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live Testnet
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-white/40 font-mono">DEX:</span>
              <span className="text-xs font-bold text-white/90">Uniswap v4 Hooks</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-white/40">
            <span>litvm.bulion.app</span>
          </div>
        </div>
      </div>
    </div>
  );
}
