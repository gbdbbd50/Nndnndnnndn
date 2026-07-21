import React from 'react';
import { Cpu, DollarSign, LogOut, Shield, TrendingUp, User } from 'lucide-react';
import { RealTimePrice, UserProfile, UserRole } from '../types';

interface NvidiaHeaderProps {
  user: UserProfile | null;
  prices: RealTimePrice[];
  onLogout: () => void;
  onOpenAuth: () => void;
  onNavigateToAdmin: () => void;
  onNavigateToHome: () => void;
  isAdminMode: boolean;
}

export default function NvidiaHeader({
  user,
  prices,
  onLogout,
  onOpenAuth,
  onNavigateToAdmin,
  onNavigateToHome,
  isAdminMode,
}: NvidiaHeaderProps) {
  return (
    <header className="border-b border-zinc-800 bg-black/95 text-white sticky top-0 z-50 backdrop-blur-md" id="nv-header">
      {/* Real-Time Price Ticker Bar */}
      <div className="bg-zinc-900 text-xs border-b border-zinc-800 py-1.5 px-4 overflow-hidden relative" id="nv-ticker-bar">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 overflow-x-auto scrollbar-none scroll-smooth">
          <div className="flex items-center gap-2 text-[10px] text-zinc-400 uppercase tracking-widest shrink-0 font-mono">
            <span className="w-1.5 h-1.5 bg-lime-500 rounded-full animate-pulse"></span>
            Live Market:
          </div>
          <div className="flex items-center gap-8 shrink-0">
            {prices.map((price) => (
              <div key={price.symbol} className="flex items-center gap-2 font-mono text-xs">
                <span className="text-zinc-300 font-bold">{price.symbol}</span>
                <span className="text-zinc-400">({price.name})</span>
                <span className="text-white font-bold">${price.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className={`flex items-center text-[10px] ${price.change24h >= 0 ? 'text-lime-500' : 'text-red-500'}`}>
                  {price.change24h >= 0 ? '▲' : '▼'} {Math.abs(price.change24h)}%
                </span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-lime-400 font-mono flex items-center gap-1 shrink-0 animate-pulse">
            <Shield className="w-3.5 h-3.5" /> SECURE SSL CONNECTION
          </div>
        </div>
      </div>

      {/* Main Header Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between" id="nv-nav-main">
        {/* Brand Logo */}
        <button
          onClick={onNavigateToHome}
          className="flex items-center gap-2.5 group focus:outline-none"
          id="nv-logo-btn"
        >
          <div className="relative">
            <div className="absolute -inset-1 rounded-lg bg-lime-500/30 blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative bg-zinc-950 border border-lime-500 p-1.5 rounded-lg">
              <Cpu className="w-6 h-6 text-lime-500 animate-spin-slow" />
            </div>
          </div>
          <div className="text-left">
            <span className="block font-sans text-lg font-black tracking-tighter text-white uppercase">
              NVID<span className="text-lime-500">I</span>A
            </span>
            <span className="block text-[9px] text-zinc-400 uppercase tracking-widest -mt-1 font-mono">
              Green Compute
            </span>
          </div>
        </button>

        {/* Auth / Menu controls */}
        <div className="flex items-center gap-3" id="nv-auth-menu">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Profile Overview */}
              <div className="text-right hidden sm:block">
                <div className="text-xs text-zinc-400 font-medium">Welcome back,</div>
                <div className="text-xs font-bold text-white max-w-[150px] truncate">{user.email}</div>
              </div>

              {/* Admin Button */}
              {user.role === UserRole.ADMIN && (
                <button
                  onClick={isAdminMode ? onNavigateToHome : onNavigateToAdmin}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-300 ${
                    isAdminMode
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                      : 'bg-lime-500 border-lime-400 text-black hover:bg-lime-400 shadow-[0_0_15px_rgba(118,185,0,0.4)]'
                  }`}
                  id="nv-admin-toggle"
                >
                  <Shield className="w-4 h-4" />
                  {isAdminMode ? 'Exit Admin Panel' : 'Open Admin Panel'}
                </button>
              )}

              {/* Balance display badge */}
              <div className="bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-1">
                <div className="w-2 h-2 bg-lime-500 rounded-full animate-ping"></div>
                <span className="text-xs text-zinc-400 font-mono uppercase">Wallet:</span>
                <span className="text-xs font-mono font-bold text-lime-400">
                  ₦{user.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all focus:outline-none"
                title="Log Out"
                id="nv-logout-btn"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 bg-lime-500 text-black px-5 py-2 rounded-lg text-sm font-bold hover:bg-lime-400 transition-all duration-300 shadow-[0_0_20px_rgba(118,185,0,0.4)] cursor-pointer"
              id="nv-signin-btn"
            >
              <User className="w-4 h-4" />
              Sign In / Sign Up
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
