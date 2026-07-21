import React from 'react';
import { Cpu, HelpCircle } from 'lucide-react';

interface HeroSectionProps {
  onExplorePlans: () => void;
  onOpenAuth: () => void;
  isLoggedIn: boolean;
  minDeposit: number;
  welcomeBonus: number;
}

export default function HeroSection({
  onExplorePlans,
  onOpenAuth,
  isLoggedIn,
  minDeposit,
  welcomeBonus,
}: HeroSectionProps) {
  return (
    <div className="relative overflow-hidden bg-black text-white py-12 sm:py-16 border-b border-zinc-900" id="hero-section">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(118,185,0,0.1),transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-lime-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Main content */}
          <div className="lg:col-span-7 space-y-5 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-lime-500/10 border border-lime-500/30 rounded-full text-lime-400 text-xs font-mono tracking-wider">
              <span className="w-2 h-2 bg-lime-500 rounded-full animate-pulse"></span>
              NVIDIA AI COMPUTING
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-white uppercase">
              Lease GPU Power <br />
              <span className="text-lime-500">Earn Daily Yields</span>
            </h1>

            <p className="text-sm sm:text-base text-zinc-350 max-w-xl font-sans leading-relaxed">
              Lease high-performance NVIDIA GPUs and earn stable, automated rewards from active AI cloud compute workloads.
            </p>

            {/* Quick stats badges */}
            <div className="grid grid-cols-3 gap-3 max-w-md pt-2 font-mono">
              <div className="bg-zinc-900/50 border border-zinc-850 p-3 rounded-xl text-center">
                <span className="block text-[9px] text-zinc-500 uppercase font-bold">Min Deposit</span>
                <span className="block text-base font-bold text-white">₦{minDeposit.toLocaleString()}</span>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-850 p-3 rounded-xl text-center">
                <span className="block text-[9px] text-zinc-500 uppercase font-bold">Welcome Gift</span>
                <span className="block text-base font-bold text-lime-400">₦{welcomeBonus.toLocaleString()}</span>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-850 p-3 rounded-xl text-center">
                <span className="block text-[9px] text-zinc-500 uppercase font-bold">Affiliate</span>
                <span className="block text-base font-bold text-white">3 Levels</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onExplorePlans}
                className="px-6 py-3 bg-lime-500 hover:bg-lime-400 text-black font-black text-xs rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(118,185,0,0.3)] tracking-wider cursor-pointer uppercase"
              >
                View GPU Plans
              </button>
              {!isLoggedIn && (
                <button
                  onClick={onOpenAuth}
                  className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-lg border border-zinc-800 transition-all cursor-pointer uppercase tracking-wider"
                >
                  {welcomeBonus > 0 ? `Register & Get ₦${welcomeBonus} Free` : 'Register Account'}
                </button>
              )}
            </div>
          </div>

          {/* Interactive visual graphics panel */}
          <div className="lg:col-span-5">
            <div className="relative bg-zinc-950 border border-zinc-900 rounded-2xl p-5 shadow-[0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-lime-500 to-emerald-500" />
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-lime-500 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-zinc-300 tracking-wider uppercase">GPU INFRASTRUCTURE</span>
                </div>
                <span className="px-2 py-0.5 bg-lime-500/10 text-lime-400 border border-lime-500/20 rounded text-[9px] font-mono">
                  ● ACTIVE COMPUTING
                </span>
              </div>

              {/* Graphic Flow of 3 levels */}
              <div className="space-y-2.5 text-left" id="referral-graphic">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                  3-Level Affiliate Program
                </div>

                <div className="flex items-center gap-3 p-2 bg-zinc-900/60 border border-zinc-850 rounded-lg">
                  <div className="w-7 h-7 rounded bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400 font-mono text-[10px] font-bold">
                    L1
                  </div>
                  <div className="flex-1">
                    <span className="block text-xs font-bold text-white">Direct Referrals (Level 1)</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-mono font-black text-lime-400">Immediate</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2 bg-zinc-900/45 border border-zinc-850/50 rounded-lg ml-3">
                  <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono text-[10px] font-bold">
                    L2
                  </div>
                  <div className="flex-1">
                    <span className="block text-xs font-bold text-zinc-300">Level 2 Affiliates</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-mono font-black text-emerald-400">Indirect</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2 bg-zinc-900/30 border border-zinc-850/30 rounded-lg ml-6">
                  <div className="w-7 h-7 rounded bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-mono text-[10px] font-bold">
                    L3
                  </div>
                  <div className="flex-1">
                    <span className="block text-xs font-bold text-zinc-450">Level 3 Affiliates</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-mono font-black text-teal-400">Indirect</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
