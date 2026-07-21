import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, Cpu, Users, PlusCircle, ArrowUpRight, 
  Copy, Check, Share2, Wallet, ListOrdered, CreditCard,
  Home, User, Mail, Calendar, Key, AlertCircle, Headphones,
  ArrowLeft, LogOut, ChevronRight, Gift, History, DollarSign,
  Lock, Settings, ShieldAlert, CheckSquare, ListTodo
} from 'lucide-react';
import { 
  UserProfile, UserInvestment, DepositRequest, 
  WithdrawalRequest, TransactionLog, PlatformSettings, SavedBank
} from '../types';

interface UserDashboardProps {
  user: UserProfile;
  settings: PlatformSettings;
  investments: UserInvestment[];
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  transactions: TransactionLog[];
  referralCounts: { l1: number; l2: number; l3: number };
  onNewDeposit: (amount: number, senderName?: string) => Promise<void>;
  onNewWithdrawal: (amount: number, bank: string, acctNum: string, acctName: string) => Promise<void>;
  onClaimDailyBonus: () => Promise<void>;
  onUpdateBankDetails: (bank: string, acctNum: string, acctName: string) => Promise<void>;
  onUpdateSavedBanks: (updatedBanks: SavedBank[]) => Promise<void>;
  onUpdatePassword: (newPassword: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onInvest: (plan: any, amount: number) => void;
  loadingDaily: boolean;
}

export default function UserDashboard({
  user,
  settings,
  investments,
  deposits,
  withdrawals,
  transactions,
  referralCounts,
  onNewDeposit,
  onNewWithdrawal,
  onClaimDailyBonus,
  onUpdateBankDetails,
  onUpdateSavedBanks,
  onUpdatePassword,
  onLogout,
  onInvest,
  loadingDaily,
}: UserDashboardProps) {
  // Tabs: home, plans, deposit, tasks, profile
  const [activeTab, setActiveTab] = useState<'home' | 'plans' | 'deposit' | 'tasks' | 'profile' | 'overview' | 'wallet' | 'gpus' | 'team' | 'ledger'>('home');
  const [walletTab, setWalletTab] = useState<'deposit' | 'withdrawal'>('deposit');
  const [copied, setCopied] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [senderName, setSenderName] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [acctNum, setAcctNum] = useState('');
  const [acctName, setAcctName] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);

  // States for saved banks management
  const [selectedSavedBankId, setSelectedSavedBankId] = useState<string>('');
  const [showAddSavedBankForm, setShowAddSavedBankForm] = useState(false);
  const [editingSavedBankId, setEditingSavedBankId] = useState<string | null>(null);
  const [savedBankName, setSavedBankName] = useState('');
  const [savedAcctNum, setSavedAcctNum] = useState('');
  const [savedAcctName, setSavedAcctName] = useState('');

  // States for Profile Sub-pages & Password Change
  const [profileSubPage, setProfileSubPage] = useState<
    'my-plans' | 'my-network' | 'tasks' | 'transaction-history' | 'deposit-history' | 'withdrawal-history' | 'profile-info' | 'bank-details' | 'change-password' | null
  >(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Real-time ticking profit accumulators
  const [tickingEarnings, setTickingEarnings] = useState<Record<string, number>>({});
  const animationFrameRef = useRef<number | null>(null);

  // Sync bank details on load/change
  useEffect(() => {
    if (user.bankName) setBankName(user.bankName);
    if (user.accountNumber) setAcctNum(user.accountNumber);
    if (user.accountName) setAcctName(user.accountName);
  }, [user.bankName, user.accountNumber, user.accountName]);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const updated: Record<string, number> = {};

      investments.forEach((inv) => {
        if (inv.status === 'active') {
          const createdTime = new Date(inv.createdAt).getTime();
          const elapsedSecs = (now - createdTime) / 1000;
          
          const dailyRate = inv.dailyProfitPercent / 100;
          const perSecRate = dailyRate / 86400;
          
          const accrued = inv.amount * perSecRate * elapsedSecs;
          updated[inv.id] = accrued;
        } else {
          updated[inv.id] = inv.totalEarnings;
        }
      });

      setTickingEarnings(updated);
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    if (investments.length > 0) {
      animationFrameRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [investments]);

  const copyRefLink = () => {
    const refLink = `${window.location.origin}?ref=${user.uid}`;
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt < settings.minDeposit) {
      alert(`Min deposit is ₦${settings.minDeposit.toLocaleString()}.`);
      return;
    }
    if (settings.manualDepositEnabled !== false && !senderName.trim()) {
      alert("Please specify the sender's name for manual deposit processing.");
      return;
    }
    setWalletLoading(true);
    try {
      await onNewDeposit(amt, senderName);
      setDepositAmount('');
      setSenderName('');
      alert(`Deposit request of ₦${amt.toLocaleString()} placed! Admin will review and credit your wallet shortly.`);
    } catch (err) {
      console.error(err);
    } finally {
      setWalletLoading(false);
    }
  };

  const handleSaveBankDetails = async () => {
    if (!bankName.trim() || !acctNum.trim() || !acctName.trim()) {
      alert('Please fill out all bank account details.');
      return;
    }
    setWalletLoading(true);
    try {
      await onUpdateBankDetails(bankName, acctNum, acctName);
    } catch (err) {
      console.error(err);
    } finally {
      setWalletLoading(false);
    }
  };

  // Multiple Saved Bank Management Helpers
  const handleSelectSavedBank = (id: string) => {
    setSelectedSavedBankId(id);
    if (!id) {
      setBankName('');
      setAcctNum('');
      setAcctName('');
      return;
    }
    const selected = (user.savedBanks || []).find(b => b.id === id);
    if (selected) {
      setBankName(selected.bankName);
      setAcctNum(selected.accountNumber);
      setAcctName(selected.accountName);
    }
  };

  const handleAddOrUpdateSavedBank = async () => {
    if (!savedBankName.trim() || !savedAcctNum.trim() || !savedAcctName.trim()) {
      alert('Please fill out all bank account fields.');
      return;
    }
    
    setWalletLoading(true);
    try {
      const currentSaved: SavedBank[] = user.savedBanks || [];
      let updated: SavedBank[] = [];
      
      if (editingSavedBankId) {
        updated = currentSaved.map(b => b.id === editingSavedBankId ? {
          id: b.id,
          bankName: savedBankName.trim(),
          accountNumber: savedAcctNum.trim(),
          accountName: savedAcctName.trim()
        } : b);
      } else {
        const newBank: SavedBank = {
          id: 'bank_' + Math.random().toString(36).substring(2, 9),
          bankName: savedBankName.trim(),
          accountNumber: savedAcctNum.trim(),
          accountName: savedAcctName.trim()
        };
        updated = [...currentSaved, newBank];
      }
      
      await onUpdateSavedBanks(updated);
      
      // Reset form states
      setSavedBankName('');
      setSavedAcctNum('');
      setSavedAcctName('');
      setEditingSavedBankId(null);
      setShowAddSavedBankForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setWalletLoading(false);
    }
  };

  const handleDeleteSavedBank = async (id: string) => {
    if (!confirm('Are you sure you want to delete this saved bank account?')) return;
    setWalletLoading(true);
    try {
      const currentSaved: SavedBank[] = user.savedBanks || [];
      const updated = currentSaved.filter(b => b.id !== id);
      await onUpdateSavedBanks(updated);
      if (selectedSavedBankId === id) {
        setSelectedSavedBankId('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWalletLoading(false);
    }
  };

  const handleStartEditSavedBank = (bank: SavedBank) => {
    setEditingSavedBankId(bank.id);
    setSavedBankName(bank.bankName);
    setSavedAcctNum(bank.accountNumber);
    setSavedAcctName(bank.accountName);
    setShowAddSavedBankForm(true);
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt < settings.minWithdrawal) {
      alert(`Min withdrawal is ₦${settings.minWithdrawal.toLocaleString()}`);
      return;
    }
    if (amt > user.balance) {
      alert(`Insufficient funds. Max withdrawal is ₦${user.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
      return;
    }
    if (!bankName.trim() || !acctNum.trim() || !acctName.trim()) {
      alert('Please fill out all bank account details.');
      return;
    }
    setWalletLoading(true);
    try {
      // Auto-save bank details if they differ from user profile
      if (user.bankName !== bankName || user.accountNumber !== acctNum || user.accountName !== acctName) {
        await onUpdateBankDetails(bankName, acctNum, acctName);
      }
      await onNewWithdrawal(amt, bankName, acctNum, acctName);
      setWithdrawAmount('');
      alert(`Withdrawal request of ₦${amt.toLocaleString()} placed! Admin will transfer funds shortly.`);
    } catch (err) {
      console.error(err);
    } finally {
      setWalletLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      alert('Please fill out all fields.');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    setPasswordLoading(true);
    try {
      await onUpdatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setProfileSubPage(null);
    } catch (err) {
      console.error(err);
    } finally {
      setPasswordLoading(false);
    }
  };

  const activeEarningsTotal = (Object.values(tickingEarnings) as number[]).reduce((acc: number, val: number) => acc + val, 0);

  return (
    <div className="bg-black text-white min-h-screen py-8 px-4 sm:px-6 text-left pb-28 font-sans" id="dashboard-wrapper">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Welcome Block & Bento Metrics (Only shown on Home/Overview) */}
        {(activeTab === 'home' || activeTab === 'overview') && (
          <>
            {/* Welcome Block */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-950 border border-zinc-900 rounded-2xl p-5 relative overflow-hidden" id="dash-banner">
              <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="space-y-1 z-10">
                <h2 className="text-xl font-black uppercase">Dashboard</h2>
                <p className="text-xs text-zinc-400 font-mono">
                  User: <span className="text-white font-bold">{user.email}</span> • ID: <span className="text-lime-500">{user.uid.substring(0, 8).toUpperCase()}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 z-10">
                {/* Daily free money button */}
                <button
                  onClick={onClaimDailyBonus}
                  disabled={loadingDaily || (settings.signBonus || 0) <= 0}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-lime-400 border border-lime-500/25 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Claim Daily ₦{settings.signBonus || 0} Bonus
                </button>

                {/* Quick stats of wallet */}
                <div className="bg-lime-500/10 border border-lime-500/20 rounded-lg px-3.5 py-1.5 text-right">
                  <span className="block text-[8px] font-mono text-zinc-400 uppercase">Balance</span>
                  <span className="block text-base font-black font-mono text-lime-400">
                    ₦{user.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Bento Box Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-bento">
              {/* Card 1: Balance */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Balance</span>
                  <Wallet className="w-4 h-4 text-lime-500" />
                </div>
                <div className="mt-3">
                  <span className="block text-xl font-mono font-black text-white">
                    ₦{user.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Card 2: Accumulated Real-Time Profits */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">GPU Earnings</span>
                  <TrendingUp className="w-4 h-4 text-lime-500" />
                </div>
                <div className="mt-3">
                  <span className="block text-xl font-mono font-black text-lime-400">
                    ₦{activeEarningsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Card 3: Active Lease GPUs */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Active GPUs</span>
                  <Cpu className="w-4 h-4 text-lime-500" />
                </div>
                <div className="mt-3">
                  <span className="block text-xl font-mono font-black text-white">
                    {investments.filter(i => i.status === 'active').length} Cores
                  </span>
                </div>
              </div>

              {/* Card 4: Total Invited Partners */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Team Size</span>
                  <Users className="w-4 h-4 text-lime-500" />
                </div>
                <div className="mt-3">
                  <span className="block text-xl font-mono font-black text-white">
                    {referralCounts.l1 + referralCounts.l2 + referralCounts.l3} members
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tab Selection (Desktop only, hidden on mobile in favor of bottom navigation) */}
        <div className="hidden md:flex border-b border-zinc-900 overflow-x-auto scrollbar-none" id="dash-tabs">
          {[
            { id: 'home', label: 'Overview' },
            { id: 'plans', label: 'Lease GPU' },
            { id: 'deposit', label: 'Wallet funding' },
            { id: 'tasks', label: 'Missions' },
            { id: 'profile', label: 'Profile' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'profile') setProfileSubPage(null);
                setActiveTab(tab.id as any);
              }}
              className={`px-4 py-2.5 border-b-2 text-xs font-mono font-bold uppercase transition shrink-0 cursor-pointer ${
                activeTab === tab.id || (tab.id === 'home' && activeTab === 'overview') || (tab.id === 'deposit' && activeTab === 'wallet')
                  ? 'border-lime-500 text-lime-400 bg-lime-500/5'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        <div className="space-y-6" id="dashboard-tab-panel">
          
          {/* 1. OVERVIEW VIEW */}
          {(activeTab === 'overview' || activeTab === 'home') && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Invite link generator */}
              <div className="lg:col-span-1 bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-4 text-left">
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">
                  Invitation Link
                </h3>
                
                <p className="text-[11px] text-zinc-450 leading-relaxed">
                  Invite partners to earn commission bonuses across 3 levels.
                </p>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase block">Referral Code:</span>
                  <div className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-lime-400 justify-between font-bold">
                    <span>{user.uid.substring(0, 8).toUpperCase()}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase block">Invitation Link:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}?ref=${user.uid}`}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-2.5 text-[10px] font-mono text-zinc-400 focus:outline-none"
                    />
                    <button
                      onClick={copyRefLink}
                      className="p-2 bg-lime-500 text-black rounded-lg hover:bg-lime-400 transition cursor-pointer shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-900 space-y-2 text-xs font-mono text-zinc-400">
                  <div className="flex justify-between">
                    <span>L1 Reward:</span>
                    <span className="text-lime-400 font-bold">{settings.referralRewardL1}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>L2 Reward:</span>
                    <span className="text-emerald-400 font-bold">{settings.referralRewardL2}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>L3 Reward:</span>
                    <span className="text-teal-400 font-bold">{settings.referralRewardL3}%</span>
                  </div>
                </div>
              </div>

              {/* Mini GPU status overview */}
              <div className="lg:col-span-2 bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    GPU Server Status
                  </h3>
                  <button
                    onClick={() => setActiveTab('gpus')}
                    className="text-xs text-lime-400 hover:underline font-mono"
                  >
                    View All {investments.length} servers →
                  </button>
                </div>

                {investments.length === 0 ? (
                  <div className="py-10 text-center text-zinc-500 space-y-2 font-mono text-xs">
                    <Cpu className="w-8 h-8 mx-auto text-zinc-850 animate-pulse" />
                    <p>No active computer cores are leased.</p>
                    <button
                      onClick={() => {
                        const elem = document.getElementById('plans-section');
                        elem?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-3.5 py-1.5 bg-lime-500 hover:bg-lime-400 text-black font-bold uppercase rounded-lg text-[10px] transition cursor-pointer"
                    >
                      Start GPU Lease
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {investments.slice(0, 3).map((inv) => {
                      const tickingEarningsVal = tickingEarnings[inv.id] || inv.totalEarnings;
                      return (
                        <div key={inv.id} className="p-3 bg-zinc-900/50 border border-zinc-850 rounded-lg flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-lime-500/10 border border-lime-500/20 rounded-md text-lime-400">
                              <Cpu className="w-4 h-4 animate-pulse" />
                            </div>
                            <div>
                              <span className="block font-bold text-white uppercase">{inv.planName}</span>
                              <span className="block text-[9px] text-zinc-500 font-mono">
                                Fee: ₦{inv.amount.toLocaleString()} | {inv.dailyProfitPercent}% Daily
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="block text-[8px] font-mono text-zinc-500">Accrued Profits</span>
                            <span className="block font-mono text-xs font-bold text-lime-400">
                              +₦{tickingEarningsVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. WALLET (DEPOSIT & WITHDRAWAL) VIEW */}
          {(activeTab === 'wallet' || activeTab === 'deposit') && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 text-left space-y-6">
              {/* Internal wallet navigation */}
              <div className="flex border-b border-zinc-900 pb-3 gap-6">
                <button
                  onClick={() => setWalletTab('deposit')}
                  className={`pb-2.5 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                    walletTab === 'deposit'
                      ? 'text-lime-500 border-lime-500'
                      : 'text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                >
                  1. Deposit Funds
                </button>
                <button
                  onClick={() => setWalletTab('withdrawal')}
                  className={`pb-2.5 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                    walletTab === 'withdrawal'
                      ? 'text-lime-500 border-lime-500'
                      : 'text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                >
                  2. Request Withdrawal
                </button>
              </div>

              {/* TAB CONTENT: DEPOSIT */}
              {walletTab === 'deposit' && (
                <div className="space-y-6">
                  {settings.manualDepositEnabled !== false ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Merchant bank details display */}
                      <div className="space-y-4 p-5 bg-zinc-900/40 border border-zinc-900 rounded-xl">
                        <div>
                          <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-widest block">PAYMENT DESTINATION</span>
                          <h4 className="text-sm font-bold text-white mt-1">Platform Bank Details</h4>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Please make your manual transfer to the official bank account below. Enter the exact amount and the sender's account name to expedite verification.
                        </p>

                        <div className="space-y-3 pt-2">
                          <div className="border-b border-zinc-900 pb-2 flex justify-between items-center">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">Bank Name</span>
                            <span className="text-xs font-bold text-white">{settings.manualDepositBankName || 'N/A'}</span>
                          </div>
                          <div className="border-b border-zinc-900 pb-2 flex justify-between items-center">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">Account Number</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-lime-400">{settings.manualDepositAccountNumber || 'N/A'}</span>
                              {settings.manualDepositAccountNumber && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(settings.manualDepositAccountNumber || '');
                                    alert('Account number copied!');
                                  }}
                                  className="p-1 hover:bg-zinc-800 rounded transition text-zinc-400 hover:text-white"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="pb-1 flex justify-between items-center">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">Account Holder</span>
                            <span className="text-xs font-bold text-white">{settings.manualDepositAccountName || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Deposit Request submission form */}
                      <div className="space-y-4">
                        <div>
                          <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-widest block">SUBMIT DEPOSIT DETAILS</span>
                          <h4 className="text-sm font-bold text-white mt-1">Manual Deposit Receipt</h4>
                        </div>

                        <form onSubmit={handleDepositSubmit} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block">Sender's Full Name (Your Bank Name):</label>
                            <input
                              type="text"
                              required
                              value={senderName}
                              onChange={(e) => setSenderName(e.target.value)}
                              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-lime-500"
                              placeholder="e.g. Johnathan Doe"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block">Amount to Deposit (₦):</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xs">₦</span>
                              <input
                                type="number"
                                min={settings.minDeposit}
                                required
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg pl-8 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-lime-500 font-mono"
                                placeholder={`Min. ₦${settings.minDeposit.toLocaleString()}`}
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={walletLoading}
                            className="w-full py-2.5 bg-lime-500 hover:bg-lime-400 text-black font-black text-xs uppercase rounded-lg transition tracking-wider cursor-pointer"
                          >
                            {walletLoading ? 'Processing...' : 'Submit Deposit Notification'}
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-zinc-500 font-mono text-xs max-w-md mx-auto space-y-3 bg-zinc-900/10 border border-zinc-900 rounded-xl p-6">
                      <CreditCard className="w-8 h-8 mx-auto text-zinc-850" />
                      <p className="font-sans text-zinc-400">Manual deposits are currently deactivated. Please contact support or the administrator directly to fund your balance.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: WITHDRAWAL */}
              {walletTab === 'withdrawal' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Bank account setup */}
                  <div className="space-y-4 p-5 bg-zinc-900/40 border border-zinc-900 rounded-xl">
                    <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-widest block">PAYOUT ACCOUNTS</span>
                        <h4 className="text-sm font-bold text-white mt-1">Saved Bank Accounts</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSavedBankId(null);
                          setSavedBankName('');
                          setSavedAcctNum('');
                          setSavedAcctName('');
                          setShowAddSavedBankForm(!showAddSavedBankForm);
                        }}
                        className="px-3 py-1 bg-lime-500/10 border border-lime-500/35 hover:bg-lime-500/25 text-lime-400 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer"
                      >
                        {showAddSavedBankForm ? 'Cancel' : '+ Add Bank'}
                      </button>
                    </div>

                    {/* Form to Add or Edit Saved Banks */}
                    {showAddSavedBankForm && (
                      <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-lg space-y-3">
                        <span className="text-[10px] font-mono text-lime-400 font-bold uppercase block">
                          {editingSavedBankId ? '✏️ Edit Saved Bank' : '➕ Save New Bank'}
                        </span>
                        
                        <div className="space-y-1">
                          <label className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">Bank Name:</label>
                          <input
                            type="text"
                            value={savedBankName}
                            onChange={(e) => setSavedBankName(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-lime-500"
                            placeholder="e.g. United Bank for Africa"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">Account Number:</label>
                          <input
                            type="text"
                            value={savedAcctNum}
                            onChange={(e) => setSavedAcctNum(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-lime-500 font-mono"
                            placeholder="e.g. 1012345678"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">Account Name:</label>
                          <input
                            type="text"
                            value={savedAcctName}
                            onChange={(e) => setSavedAcctName(e.target.value)}
                            className="w-full bg-zinc-955 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-lime-500"
                            placeholder="e.g. John Doe"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleAddOrUpdateSavedBank}
                          disabled={walletLoading}
                          className="w-full py-1.5 bg-lime-500 hover:bg-lime-400 text-black font-bold uppercase rounded text-[10px] transition font-mono cursor-pointer"
                        >
                          {walletLoading ? 'Saving...' : editingSavedBankId ? 'Update Bank Account' : 'Save Bank Account'}
                        </button>
                      </div>
                    )}

                    {/* Selector of already saved banks */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block">
                        Select a Payout Account:
                      </label>
                      <select
                        value={selectedSavedBankId}
                        onChange={(e) => handleSelectSavedBank(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-lime-500 font-mono"
                      >
                        <option value="">-- Choose from saved bank accounts --</option>
                        {(user.savedBanks || []).map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} ({b.accountNumber}) - {b.accountName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Manage Saved Banks List */}
                    {user.savedBanks && user.savedBanks.length > 0 ? (
                      <div className="space-y-2 pt-2">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block font-bold">Manage Saved Banks ({user.savedBanks.length}):</span>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {user.savedBanks.map((b) => (
                            <div key={b.id} className="p-2 bg-zinc-900/60 border border-zinc-900 rounded-lg flex items-center justify-between text-[11px]">
                              <div>
                                <span className="block font-bold text-white font-mono text-xs">{b.bankName}</span>
                                <span className="block text-zinc-450 font-mono text-[10px]">{b.accountNumber} | {b.accountName}</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditSavedBank(b)}
                                  className="text-[10px] font-mono font-bold uppercase text-lime-400 hover:underline cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSavedBank(b.id)}
                                  className="text-[10px] font-mono font-bold uppercase text-red-400 hover:underline cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500 italic bg-zinc-900/20 p-3 rounded-lg border border-dashed border-zinc-900">
                        You have no other saved bank accounts. Click '+ Add Bank' above to pre-register bank details for speedy payouts.
                      </p>
                    )}

                    {/* Current Selected Active Bank Account details (Editable as requested) */}
                    <div className="border-t border-zinc-900 pt-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-widest block font-bold">ACTIVE BANK ACCOUNT FOR PAYOUT</span>
                        <button
                          type="button"
                          onClick={handleSaveBankDetails}
                          disabled={walletLoading}
                          className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-lime-500 rounded text-[9px] font-mono font-bold uppercase text-white transition-all cursor-pointer"
                        >
                          Save as default
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase block">Bank Name:</label>
                        <input
                          type="text"
                          required
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-lime-500"
                          placeholder="e.g. United Bank for Africa"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase block">Account Number:</label>
                        <input
                          type="text"
                          required
                          value={acctNum}
                          onChange={(e) => setAcctNum(e.target.value)}
                          className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-lime-500 font-mono"
                          placeholder="e.g. 1012345678"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase block">Account Holder Name:</label>
                        <input
                          type="text"
                          required
                          value={acctName}
                          onChange={(e) => setAcctName(e.target.value)}
                          className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-lime-500"
                          placeholder="e.g. John Doe"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Withdrawal input & submission */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-widest block">PAYOUT REQUEST</span>
                      <h4 className="text-sm font-bold text-white mt-1">Withdrawal Amount</h4>
                    </div>

                    <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
                      <div className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-xl flex justify-between items-center">
                        <div>
                          <span className="text-[9px] font-mono text-zinc-500 uppercase block">Available Balance</span>
                          <span className="text-lg font-black text-white font-mono">₦{user.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase block">Min. Payout</span>
                          <span className="text-xs font-bold text-zinc-400 font-mono">₦{settings.minWithdrawal.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block">Amount to Withdraw (₦):</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xs">₦</span>
                          <input
                            type="number"
                            min={settings.minWithdrawal}
                            max={user.balance}
                            required
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg pl-8 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-lime-500 font-mono"
                            placeholder={`Max: ₦${user.balance.toLocaleString()}`}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={walletLoading}
                        className="w-full py-2.5 bg-zinc-900 border border-zinc-800 hover:border-lime-500 text-white font-bold text-xs uppercase rounded-lg transition tracking-wider cursor-pointer"
                      >
                        {walletLoading ? 'Processing...' : 'Request Payout (Withdraw)'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. ACTIVE GPU LEASE LIST */}
          {activeTab === 'gpus' && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 text-left space-y-4">
              <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-2 animate-fade-in">
                Leased GPU Nodes ({investments.length})
              </h3>

              {investments.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 space-y-2 font-mono text-xs">
                  <Cpu className="w-8 h-8 mx-auto text-zinc-800 animate-pulse" />
                  <p>You have not leased any GPU nodes.</p>
                  <button
                    onClick={() => {
                      const elem = document.getElementById('plans-section');
                      elem?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-4 py-1.5 bg-lime-500 hover:bg-lime-400 text-black font-black uppercase rounded text-xs transition cursor-pointer"
                  >
                    Explore GPU Plans
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-xs text-zinc-300">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 text-[9px] uppercase">
                        <th className="py-2 px-2.5">GPU Node</th>
                        <th className="py-2 px-2.5">Lease Cost</th>
                        <th className="py-2 px-2.5">Profit Rate</th>
                        <th className="py-2 px-2.5">Earnings Gained (Live)</th>
                        <th className="py-2 px-2.5">Status</th>
                        <th className="py-2 px-2.5">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {investments.map((inv) => {
                        const tickingValue = tickingEarnings[inv.id] || inv.totalEarnings;
                        return (
                          <tr key={inv.id} className="hover:bg-zinc-900/40 transition">
                            <td className="py-2.5 px-2.5 font-bold text-white uppercase flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-ping" />
                              {inv.planName}
                            </td>
                            <td className="py-2.5 px-2.5">₦{inv.amount.toLocaleString()}</td>
                            <td className="py-2.5 px-2.5 text-lime-400 font-bold">+{inv.dailyProfitPercent}% / day</td>
                            <td className="py-2.5 px-2.5 text-lime-400 font-bold">
                              ₦{tickingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                inv.status === 'active' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/20' : 'bg-zinc-800 text-zinc-500'
                              }`}>
                                {inv.status === 'active' ? 'ACTIVE' : 'COMPLETED'}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 text-zinc-550 text-[10px]">
                              {new Date(inv.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. TEAM VIEW */}
          {activeTab === 'team' && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 text-left space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-3">
                <div>
                  <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider">
                    Affiliate Team Network
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Receive commission percentages whenever members of your team complete a lease.
                  </p>
                </div>
                <button
                  onClick={copyRefLink}
                  className="px-3.5 py-1.5 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-lg text-xs font-mono uppercase transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {copied ? 'Copied Link!' : 'Copy Invitation Link'}
                </button>
              </div>

              {/* Graphic cards for 3 levels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                {/* Level 1 card */}
                <div className="bg-zinc-900 border border-lime-500/20 rounded-xl p-4 text-left">
                  <span className="text-[9px] text-lime-400 font-bold uppercase tracking-widest block">LEVEL 1</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-3xl font-black text-white">{referralCounts.l1}</span>
                    <span className="text-lime-400 font-bold">+{settings.referralRewardL1}% Reward</span>
                  </div>
                </div>

                {/* Level 2 card */}
                <div className="bg-zinc-900 border border-emerald-500/10 rounded-xl p-4 text-left">
                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest block">LEVEL 2</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-3xl font-black text-white">{referralCounts.l2}</span>
                    <span className="text-emerald-400 font-bold">+{settings.referralRewardL2}% Reward</span>
                  </div>
                </div>

                {/* Level 3 card */}
                <div className="bg-zinc-900 border border-teal-500/10 rounded-xl p-4 text-left">
                  <span className="text-[9px] text-teal-400 font-bold uppercase tracking-widest block">LEVEL 3</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-3xl font-black text-white">{referralCounts.l3}</span>
                    <span className="text-teal-400 font-bold">+{settings.referralRewardL3}% Reward</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. MONEY LEDGER */}
          {activeTab === 'ledger' && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 text-left space-y-4">
              <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">
                Transaction Ledger
              </h3>

              {transactions.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 font-mono text-xs">
                  <ListOrdered className="w-8 h-8 mx-auto text-zinc-800 mb-2" />
                  No transactions logged yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-xs text-zinc-300">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 text-[9px] uppercase">
                        <th className="py-2.5 px-3">ID</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Detail</th>
                        <th className="py-2.5 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-zinc-900/40 transition">
                          <td className="py-3 px-3 text-zinc-500">#{t.id}</td>
                          <td className="py-3 px-3 uppercase">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                              t.type === 'deposit' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/20' :
                              t.type === 'withdrawal' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              'bg-zinc-800 text-zinc-300'
                            }`}>
                              {t.type}
                            </span>
                          </td>
                          <td className={`py-3 px-3 font-bold font-mono text-xs ${t.amount >= 0 ? 'text-lime-400' : 'text-red-400'}`}>
                            {t.amount >= 0 ? '+' : ''}₦{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-zinc-400">{t.description}</td>
                          <td className="py-3 px-3 text-zinc-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ======================================= */}
          {/* 6. PLANS VIEW */}
          {activeTab === 'plans' && (
            <div className="space-y-6">
              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-lime-500/10 border border-lime-500/20 text-lime-400 text-[10px] font-mono uppercase tracking-wider">
                  NVIDIA GPU CLOUD
                </div>
                <h2 className="text-xl font-black uppercase text-white">GPU Lease Offerings</h2>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Activate a high-efficiency server node using your balance to accrue earnings.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* RTX 4090 */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:border-lime-500/30 transition-all duration-300">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 bg-lime-500/10 border border-lime-500/20 rounded-xl text-lime-400">
                        <Cpu className="w-5 h-5 animate-pulse" />
                      </div>
                      <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-850 rounded-full text-[9px] font-mono font-bold text-lime-400">
                        30 Days
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase text-white">RTX 4090 Node</h3>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Entry GPU computing lease</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Perfect for basic machine learning workloads and micro-scale computing power.
                    </p>
                    <div className="space-y-2 py-2 border-y border-zinc-900 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Min. Lease:</span>
                        <span className="text-white font-bold">₦30.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Max. Lease:</span>
                        <span className="text-white font-bold">₦199.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Daily Return:</span>
                        <span className="text-lime-400 font-bold">+1.5%</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const amt = 30; // Min amount
                      const plan = { id: 'plan_4090', name: 'RTX 4090 Workstation Core', dailyProfitPercent: 1.5, minAmount: 30, maxAmount: 199, durationDays: 30, description: 'Perfect for basic machine learning workloads and micro scale compute.' };
                      if (user.balance < amt) {
                        alert(`Insufficient balance. Min deposit/amount is ₦${amt}`);
                        setActiveTab('deposit');
                      } else {
                        onInvest(plan, amt);
                      }
                    }}
                    className="w-full py-2 bg-lime-500 hover:bg-lime-400 text-black font-black text-xs uppercase rounded-xl transition cursor-pointer"
                  >
                    Lease Node (₦30.00)
                  </button>
                </div>

                {/* A100 */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:border-lime-500/30 transition-all duration-300">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                        <Cpu className="w-5 h-5 animate-pulse" />
                      </div>
                      <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-850 rounded-full text-[9px] font-mono font-bold text-emerald-400">
                        45 Days
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase text-white">A100 Enterprise</h3>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Enterprise compute lease</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Enterprise grade cores for medium scale AI models and deep custom training.
                    </p>
                    <div className="space-y-2 py-2 border-y border-zinc-900 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Min. Lease:</span>
                        <span className="text-white font-bold">₦200.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Max. Lease:</span>
                        <span className="text-white font-bold">₦1,499.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Daily Return:</span>
                        <span className="text-emerald-400 font-bold">+2.5%</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const amt = 200; // Min amount
                      const plan = { id: 'plan_a100', name: 'A100 Enterprise Node Cluster', dailyProfitPercent: 2.5, minAmount: 200, maxAmount: 1499, durationDays: 45, description: 'Enterprise grade cores for medium scale AI models and deep training.' };
                      if (user.balance < amt) {
                        alert(`Insufficient balance. Min deposit/amount is ₦${amt}`);
                        setActiveTab('deposit');
                      } else {
                        onInvest(plan, amt);
                      }
                    }}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase rounded-xl transition cursor-pointer"
                  >
                    Lease Node (₦200.00)
                  </button>
                </div>

                {/* H100 */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:border-lime-500/30 transition-all duration-300">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                        <Cpu className="w-5 h-5 animate-pulse" />
                      </div>
                      <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-850 rounded-full text-[9px] font-mono font-bold text-cyan-400">
                        60 Days
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase text-white">H100 Supercomputer</h3>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Premium HPC GPU Cluster</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      State-of-the-art supercomputing node clusters for bleeding-edge AI models.
                    </p>
                    <div className="space-y-2 py-2 border-y border-zinc-900 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Min. Lease:</span>
                        <span className="text-white font-bold">₦1,500.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Max. Lease:</span>
                        <span className="text-white font-bold">₦20,000.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Daily Return:</span>
                        <span className="text-cyan-400 font-bold">+3.8%</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const amt = 1500; // Min amount
                      const plan = { id: 'plan_h100', name: 'H100 Supercomputer Cluster', dailyProfitPercent: 3.8, minAmount: 1500, maxAmount: 20000, durationDays: 60, description: 'Supercomputing cluster for extreme deep learning.' };
                      if (user.balance < amt) {
                        alert(`Insufficient balance. Min deposit/amount is ₦${amt}`);
                        setActiveTab('deposit');
                      } else {
                        onInvest(plan, amt);
                      }
                    }}
                    className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase rounded-xl transition cursor-pointer"
                  >
                    Lease Node (₦1,500.00)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* 7. TASKS VIEW */}
          {activeTab === 'tasks' && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 text-left space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-widest block">DAILY MISSIONS</span>
                <h3 className="text-lg font-black uppercase text-white">Daily Tasks & Check-ins</h3>
                <p className="text-xs text-zinc-400">Complete tasks to receive free Naira cash directly credited to your wallet balance.</p>
              </div>

              <div className="space-y-4">
                {/* Task 1: Claim Daily Sign Bonus */}
                <div className="p-4 bg-zinc-900 border border-zinc-850/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-lime-500/10 border border-lime-500/20 rounded-lg text-lime-400 shrink-0">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase">Daily Free Check-In</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Claim your daily allowance of free cash (₦{settings.signBonus || 0}) instantly every 24 hours.</p>
                      <span className="inline-block mt-2 font-mono text-[9px] font-bold px-2 py-0.5 bg-lime-500/10 text-lime-400 rounded-full">Reward: +₦{settings.signBonus || 0}</span>
                    </div>
                  </div>

                  <button
                    onClick={onClaimDailyBonus}
                    disabled={loadingDaily || (settings.signBonus || 0) <= 0}
                    className="px-4 py-2 bg-lime-500 hover:bg-lime-400 text-black text-xs font-black uppercase rounded-lg transition shrink-0 disabled:opacity-40 cursor-pointer"
                  >
                    {loadingDaily ? 'Claiming...' : 'Claim Daily Gift'}
                  </button>
                </div>

                {/* Task 2: Affiliate Sharing Task */}
                <div className="p-4 bg-zinc-900 border border-zinc-850/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 shrink-0">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase">Invite Partners & Share</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Share your custom affiliate code link with your circle. Secure 3 levels of high yields when they lease.</p>
                      <div className="flex gap-2 items-center mt-2.5 text-xs font-mono text-zinc-400">
                        <span>Code:</span>
                        <span className="text-lime-400 font-bold bg-zinc-950 px-2 py-0.5 border border-zinc-800 rounded">{user.uid.substring(0, 8).toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const refLink = `${window.location.origin}?ref=${user.uid}`;
                      navigator.clipboard.writeText(refLink);
                      alert('Referral invitation link copied to clipboard!');
                    }}
                    className="px-4 py-2 bg-zinc-950 border border-zinc-850 hover:border-lime-500/40 text-white text-xs font-black uppercase rounded-lg transition shrink-0 cursor-pointer"
                  >
                    Copy Link
                  </button>
                </div>

                {/* Task 3: Lease First GPU Node */}
                <div className="p-4 bg-zinc-900 border border-zinc-850/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400 shrink-0">
                      <Cpu className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase">Lease GPU Computing Power</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Activate a RTX, A100, or H100 lease with minimum ₦30.00 to activate ticking 24/7 profits.</p>
                      <span className="inline-block mt-2 font-mono text-[9px] font-bold px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full">Status: {investments.length > 0 ? 'COMPLETED' : 'PENDING'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('plans')}
                    className="px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-lime-500/30 text-white text-xs font-black uppercase rounded-lg transition shrink-0 cursor-pointer"
                  >
                    {investments.length > 0 ? 'Lease More' : 'Start Lease'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* 8. PROFILE VIEW */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              
              {/* Profile Subpages Router */}
              {profileSubPage === null ? (
                <div className="max-w-md mx-auto space-y-6 pt-4">
                  {/* Header with profile initials */}
                  <div className="flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400 text-lg font-black shadow-[0_0_15px_rgba(118,185,0,0.15)] uppercase">
                      {user.email.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-base font-black text-white uppercase">{user.email.split('@')[0]}</h3>
                      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                        {user.role === 'admin' ? 'Platform Administrator' : 'Premium Member Account'}
                      </p>
                    </div>
                  </div>

                  {/* Balance Card */}
                  <div className="bg-[#0b0b0b] border border-zinc-900 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/5 rounded-full blur-2xl pointer-events-none" />
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase block tracking-wider">AVAILABLE BALANCE</span>
                    <span className="text-3xl font-mono font-black text-lime-400 block mt-1">
                      ₦{user.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Quick Buttons row */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setWalletTab('deposit');
                        setActiveTab('deposit');
                      }}
                      className="flex items-center justify-center gap-2 py-3 bg-lime-500 hover:bg-lime-400 text-black font-black text-xs uppercase rounded-xl transition cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Deposit
                    </button>
                    <button
                      onClick={() => {
                        setWalletTab('withdrawal');
                        setActiveTab('deposit');
                      }}
                      className="flex items-center justify-center gap-2 py-3 bg-zinc-900 border border-zinc-850 hover:border-red-500/40 text-white font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                    >
                      <ArrowUpRight className="w-4 h-4 text-red-400" />
                      Withdraw
                    </button>
                  </div>

                  {/* MY ACCOUNT SECTION */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black block pl-1">MY ACCOUNT</span>
                    <div className="bg-[#0c0c0c] border border-zinc-900 rounded-xl divide-y divide-zinc-900 overflow-hidden">
                      {[
                        { label: 'My Leased Nodes', subPage: 'my-plans', icon: <Cpu className="w-4 h-4" /> },
                        { label: 'My Affiliate Network', subPage: 'my-network', icon: <Users className="w-4 h-4" /> },
                        { label: 'Platform Missions', subPage: 'tasks', icon: <ListTodo className="w-4 h-4" /> },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (item.subPage === 'tasks') {
                              setActiveTab('tasks');
                            } else {
                              setProfileSubPage(item.subPage as any);
                            }
                          }}
                          className="p-3.5 flex items-center justify-between hover:bg-zinc-900/30 transition cursor-pointer group"
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-lg bg-lime-500/5 text-lime-400 border border-lime-500/10 flex items-center justify-center group-hover:scale-105 transition-all">
                              {item.icon}
                            </div>
                            <span className="text-xs font-bold text-zinc-300 ml-3">{item.label}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-[#76b900] transition" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TRANSACTIONS SECTION */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black block pl-1">TRANSACTIONS</span>
                    <div className="bg-[#0c0c0c] border border-zinc-900 rounded-xl divide-y divide-zinc-900 overflow-hidden">
                      {[
                        { label: 'Transaction History', subPage: 'transaction-history', icon: <History className="w-4 h-4" /> },
                        { label: 'Deposit History', subPage: 'deposit-history', icon: <PlusCircle className="w-4 h-4" /> },
                        { label: 'Withdrawal History', subPage: 'withdrawal-history', icon: <ArrowUpRight className="w-4 h-4" /> },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => setProfileSubPage(item.subPage as any)}
                          className="p-3.5 flex items-center justify-between hover:bg-zinc-900/30 transition cursor-pointer group"
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-lg bg-lime-500/5 text-lime-400 border border-lime-500/10 flex items-center justify-center group-hover:scale-105 transition-all">
                              {item.icon}
                            </div>
                            <span className="text-xs font-bold text-zinc-300 ml-3">{item.label}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-[#76b900] transition" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SETTINGS SECTION */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-black block pl-1">SETTINGS</span>
                    <div className="bg-[#0c0c0c] border border-zinc-900 rounded-xl divide-y divide-zinc-900 overflow-hidden">
                      {[
                        { label: 'Profile Information', subPage: 'profile-info', icon: <User className="w-4 h-4" /> },
                        { label: 'Bank Details', subPage: 'bank-details', icon: <CreditCard className="w-4 h-4" /> },
                        { label: 'Change Password', subPage: 'change-password', icon: <Lock className="w-4 h-4" /> },
                        { label: 'Sign Out', subPage: 'sign-out', icon: <LogOut className="w-4 h-4" /> },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (item.subPage === 'sign-out') {
                              if (confirm('Are you sure you want to sign out?')) onLogout();
                            } else {
                              setProfileSubPage(item.subPage as any);
                            }
                          }}
                          className="p-3.5 flex items-center justify-between hover:bg-zinc-900/30 transition cursor-pointer group"
                        >
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-lg ${item.subPage === 'sign-out' ? 'bg-red-500/5 text-red-500 border border-red-500/10' : 'bg-lime-500/5 text-lime-400 border border-lime-500/10'} flex items-center justify-center group-hover:scale-105 transition-all`}>
                              {item.icon}
                            </div>
                            <span className={`text-xs font-bold ml-3 ${item.subPage === 'sign-out' ? 'text-red-400' : 'text-zinc-300'}`}>{item.label}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-[#76b900] transition" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact Support */}
                  <button
                    onClick={() => {
                      alert("NVIDIA GPU Leasing Platform Support channels:\nTelegram Support: @nvidia_support_bot\nEmail Support: support@nvidia-lease.com");
                    }}
                    className="w-full py-3 bg-[#0c0c0c] border border-zinc-900 hover:border-lime-500/35 rounded-xl text-xs font-mono font-bold uppercase text-zinc-400 hover:text-white transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Headphones className="w-4 h-4 text-lime-400" />
                    Contact Support
                  </button>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6 text-left">
                  
                  {/* Back to main profile options */}
                  <button
                    onClick={() => setProfileSubPage(null)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-mono transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Profile
                  </button>

                  {/* Subpage 1: LEASED PLAN LIST */}
                  {profileSubPage === 'my-plans' && (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-widest block">COMPUTE CLUSTER</span>
                        <h3 className="text-base font-black text-white uppercase mt-1">My GPU Leased Cores ({investments.length})</h3>
                      </div>

                      {investments.length === 0 ? (
                        <div className="py-12 text-center text-zinc-500 space-y-2 font-mono text-xs">
                          <Cpu className="w-8 h-8 mx-auto text-zinc-800 animate-pulse" />
                          <p>You have not leased any GPU nodes.</p>
                          <button
                            onClick={() => {
                              setProfileSubPage(null);
                              setActiveTab('plans');
                            }}
                            className="px-4 py-1.5 bg-lime-500 hover:bg-lime-400 text-black font-black uppercase rounded text-xs transition cursor-pointer"
                          >
                            Explore Plans
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {investments.map((inv) => {
                            const tickingVal = tickingEarnings[inv.id] || inv.totalEarnings;
                            return (
                              <div key={inv.id} className="p-4 bg-zinc-900 border border-zinc-850 rounded-xl flex items-center justify-between text-xs font-mono">
                                <div className="space-y-1">
                                  <span className="block font-sans text-sm font-black text-white uppercase">{inv.planName}</span>
                                  <span className="block text-zinc-550 text-[10px]">Activated: {new Date(inv.createdAt).toLocaleDateString()}</span>
                                  <span className="block text-zinc-550 text-[10px]">Fee Locked: ₦{inv.amount.toLocaleString()}</span>
                                </div>
                                <div className="text-right space-y-1">
                                  <span className="block text-[8px] text-zinc-500 uppercase">Yield Multiplier (+{inv.dailyProfitPercent}% Daily)</span>
                                  <span className="block text-sm font-bold text-lime-400">+₦{tickingVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subpage 2: AFFILIATE NETWORK */}
                  {profileSubPage === 'my-network' && (
                    <div className="space-y-6">
                      <div>
                        <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-widest block">PARTNERS NETWORK</span>
                        <h3 className="text-base font-black text-white uppercase mt-1">Affiliate Distribution</h3>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-4 text-left">
                          <span className="text-[8px] text-lime-400 font-bold uppercase tracking-widest block">LEVEL 1</span>
                          <span className="block text-2xl font-black text-white mt-1">{referralCounts.l1}</span>
                          <span className="text-[10px] text-zinc-500">+{settings.referralRewardL1}% yield</span>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-4 text-left">
                          <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest block">LEVEL 2</span>
                          <span className="block text-2xl font-black text-white mt-1">{referralCounts.l2}</span>
                          <span className="text-[10px] text-zinc-500">+{settings.referralRewardL2}% yield</span>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-4 text-left">
                          <span className="text-[8px] text-teal-400 font-bold uppercase tracking-widest block">LEVEL 3</span>
                          <span className="block text-2xl font-black text-white mt-1">{referralCounts.l3}</span>
                          <span className="text-[10px] text-zinc-500">+{settings.referralRewardL3}% yield</span>
                        </div>
                      </div>

                      {/* Info on Referral Program */}
                      <div className="p-4 bg-zinc-900/40 border border-zinc-900 rounded-xl space-y-2 text-xs">
                        <h4 className="font-bold text-white uppercase text-[10px] tracking-wide">Dynamic Compensation Strategy</h4>
                        <p className="text-zinc-400 leading-relaxed text-[11px]">
                          Commissions are credited directly into your wallet balance instantly in Naira cash as soon as your direct or indirect partners lease computing servers.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Subpage 3: LEDGER LOGS */}
                  {profileSubPage === 'transaction-history' && (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-widest block">LEDGER STATUS</span>
                        <h3 className="text-base font-black text-white uppercase mt-1">Transaction History</h3>
                      </div>

                      {transactions.length === 0 ? (
                        <div className="py-12 text-center text-zinc-500 font-mono text-xs">No transactions recorded.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse font-mono text-[11px] text-zinc-300">
                            <thead>
                              <tr className="border-b border-zinc-900 text-zinc-500 text-[8px] uppercase">
                                <th className="py-2 px-2">ID</th>
                                <th className="py-2 px-2">Type</th>
                                <th className="py-2 px-2">Amount</th>
                                <th className="py-2 px-2">Detail</th>
                                <th className="py-2 px-2">Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                              {transactions.map((t) => (
                                <tr key={t.id} className="hover:bg-zinc-900/40">
                                  <td className="py-2.5 px-2 text-zinc-500">#{t.id.substring(0,6)}</td>
                                  <td className="py-2.5 px-2 uppercase">
                                    <span className={`px-1 rounded text-[8px] font-bold ${
                                      t.type === 'deposit' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/20' :
                                      t.type === 'withdrawal' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                      'bg-zinc-800 text-zinc-300'
                                    }`}>
                                      {t.type}
                                    </span>
                                  </td>
                                  <td className={`py-2.5 px-2 font-bold ${t.amount >= 0 ? 'text-lime-400' : 'text-red-400'}`}>
                                    ₦{t.amount.toLocaleString()}
                                  </td>
                                  <td className="py-2.5 px-2 text-zinc-400">{t.description}</td>
                                  <td className="py-2.5 px-2 text-zinc-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subpage 4: DEPOSIT REQUESTS */}
                  {profileSubPage === 'deposit-history' && (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-widest block">PAYMENT NOTIFICATIONS</span>
                        <h3 className="text-base font-black text-white uppercase mt-1">Deposit History</h3>
                      </div>

                      {deposits.length === 0 ? (
                        <div className="py-12 text-center text-zinc-500 font-mono text-xs">No manual deposits submitted yet.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse font-mono text-[11px] text-zinc-300">
                            <thead>
                              <tr className="border-b border-zinc-900 text-zinc-500 text-[8px] uppercase">
                                <th className="py-2 px-2">ID</th>
                                <th className="py-2 px-2">Amount</th>
                                <th className="py-2 px-2">Sender Name</th>
                                <th className="py-2 px-2">Status</th>
                                <th className="py-2 px-2">Submitted Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                              {deposits.map((d) => (
                                <tr key={d.id} className="hover:bg-zinc-900/40">
                                  <td className="py-2.5 px-2 text-zinc-500">#{d.id.substring(0, 8)}</td>
                                  <td className="py-2.5 px-2 font-bold text-lime-400">₦{d.amount.toLocaleString()}</td>
                                  <td className="py-2.5 px-2 text-zinc-400">{d.senderName || 'Anonymous'}</td>
                                  <td className="py-2.5 px-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                      d.status === 'approved' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/20' :
                                      d.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                      'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                    }`}>
                                      {d.status.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-2 text-zinc-500">{new Date(d.createdAt).toLocaleDateString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subpage 5: WITHDRAWAL REQUESTS */}
                  {profileSubPage === 'withdrawal-history' && (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-widest block">PAYOUT TRANSFERS</span>
                        <h3 className="text-base font-black text-white uppercase mt-1">Withdrawal History</h3>
                      </div>

                      {withdrawals.length === 0 ? (
                        <div className="py-12 text-center text-zinc-500 font-mono text-xs">No withdrawal payouts requested yet.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse font-mono text-[11px] text-zinc-300">
                            <thead>
                              <tr className="border-b border-zinc-900 text-zinc-500 text-[8px] uppercase">
                                <th className="py-2 px-2">ID</th>
                                <th className="py-2 px-2">Amount</th>
                                <th className="py-2 px-2">Bank Detail</th>
                                <th className="py-2 px-2">Status</th>
                                <th className="py-2 px-2">Requested Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                              {withdrawals.map((w) => (
                                <tr key={w.id} className="hover:bg-zinc-900/40">
                                  <td className="py-2.5 px-2 text-zinc-500">#{w.id.substring(0, 8)}</td>
                                  <td className="py-2.5 px-2 font-bold text-red-400">₦{w.amount.toLocaleString()}</td>
                                  <td className="py-2.5 px-2 text-zinc-400 truncate max-w-[120px]" title={`${w.bankName} - ${w.accountNumber}`}>{w.bankName}</td>
                                  <td className="py-2.5 px-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                      w.status === 'approved' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/20' :
                                      w.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                      'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                    }`}>
                                      {w.status.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-2 text-zinc-500">{new Date(w.createdAt).toLocaleDateString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subpage 6: PROFILE INFORMATION */}
                  {profileSubPage === 'profile-info' && (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-widest block">PERSONAL PARAMETERS</span>
                        <h3 className="text-base font-black text-white uppercase mt-1">Profile Details</h3>
                      </div>

                      <div className="bg-[#0b0b0b] border border-zinc-900 rounded-xl divide-y divide-zinc-900 overflow-hidden font-mono text-xs">
                        <div className="p-3 flex justify-between">
                          <span className="text-zinc-500">EMAIL ADDRESS</span>
                          <span className="text-white font-bold">{user.email}</span>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-zinc-500">USER UNIQUE ID</span>
                          <span className="text-lime-400 font-bold uppercase">{user.uid}</span>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-zinc-500">ACCOUNT STATUS</span>
                          <span className="text-emerald-400 font-bold">VERIFIED SECURE</span>
                        </div>
                        <div className="p-3 flex justify-between">
                          <span className="text-zinc-500">REFERRAL LINK CODE</span>
                          <span className="text-[#76b900] font-bold">{user.uid.substring(0, 8).toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subpage 7: BANK SETUP WITHDRAWALS */}
                  {profileSubPage === 'bank-details' && (
                    <div className="space-y-6">
                      <div>
                        <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-widest block">PAYOUT SETTINGS</span>
                        <h3 className="text-base font-black text-white uppercase mt-1">Withdrawal Bank Accounts</h3>
                        <p className="text-xs text-zinc-400 mt-1">Add, update, or delete bank accounts to pick from when requesting withdrawal payouts.</p>
                      </div>

                      {/* Add bank button */}
                      <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                        <span className="text-xs font-bold text-zinc-300">Saved Bank Cards</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSavedBankId(null);
                            setSavedBankName('');
                            setSavedAcctNum('');
                            setSavedAcctName('');
                            setShowAddSavedBankForm(!showAddSavedBankForm);
                          }}
                          className="px-3 py-1 bg-lime-500/10 border border-lime-500/35 hover:bg-lime-500/25 text-lime-400 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer"
                        >
                          {showAddSavedBankForm ? 'Close Editor' : '+ Add New Bank'}
                        </button>
                      </div>

                      {/* Add/Edit saved bank details form */}
                      {showAddSavedBankForm && (
                        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3.5">
                          <span className="text-[10px] font-mono text-lime-400 font-bold uppercase block">
                            {editingSavedBankId ? '✏️ Edit Saved Account' : '➕ Save New Account'}
                          </span>
                          
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">Bank Name:</label>
                            <input
                              type="text"
                              value={savedBankName}
                              required
                              onChange={(e) => setSavedBankName(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-lime-500"
                              placeholder="e.g. Access Bank Nigeria"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">Account Number:</label>
                            <input
                              type="text"
                              value={savedAcctNum}
                              required
                              onChange={(e) => setSavedAcctNum(e.target.value)}
                              className="w-full bg-zinc-955 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-lime-500 font-mono"
                              placeholder="e.g. 0102345678"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-mono font-bold text-zinc-400 uppercase block">Account Name:</label>
                            <input
                              type="text"
                              value={savedAcctName}
                              required
                              onChange={(e) => setSavedAcctName(e.target.value)}
                              className="w-full bg-zinc-955 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-lime-500"
                              placeholder="e.g. Johnathan Doe"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleAddOrUpdateSavedBank}
                            disabled={walletLoading}
                            className="w-full py-1.5 bg-lime-500 hover:bg-lime-400 text-black font-bold uppercase rounded text-[10px] transition font-mono cursor-pointer"
                          >
                            {walletLoading ? 'Saving...' : editingSavedBankId ? 'Update Bank Account' : 'Save Bank Account'}
                          </button>
                        </div>
                      )}

                      {/* List of accounts */}
                      {user.savedBanks && user.savedBanks.length > 0 ? (
                        <div className="space-y-2">
                          {user.savedBanks.map((b) => (
                            <div key={b.id} className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl flex items-center justify-between text-xs font-mono">
                              <div>
                                <span className="block font-bold text-white font-sans text-xs">{b.bankName}</span>
                                <span className="block text-zinc-450 text-[10px]">{b.accountNumber} | {b.accountName}</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditSavedBank(b)}
                                  className="text-[10px] font-mono font-bold uppercase text-lime-400 hover:underline cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSavedBank(b.id)}
                                  className="text-[10px] font-mono font-bold uppercase text-red-400 hover:underline cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-zinc-600 font-mono text-xs">No bank accounts saved yet. Add one above!</div>
                      )}
                    </div>
                  )}

                  {/* Subpage 8: CHANGE PASSWORD */}
                  {profileSubPage === 'change-password' && (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-widest block">SECURITY INTEGRITY</span>
                        <h3 className="text-base font-black text-white uppercase mt-1">Change Account Password</h3>
                      </div>

                      <form onSubmit={handleChangePasswordSubmit} className="space-y-4 max-w-sm">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block">New Password:</label>
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-lime-500 font-mono"
                            placeholder="Min. 6 characters"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block">Confirm New Password:</label>
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-lime-500 font-mono"
                            placeholder="Re-type new password"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={passwordLoading}
                          className="w-full py-2 bg-[#76b900] hover:bg-[#86c910] disabled:bg-zinc-800 text-black font-black uppercase text-xs rounded-lg transition tracking-wide cursor-pointer"
                        >
                          {passwordLoading ? 'Encrypting...' : 'Update Password'}
                        </button>
                      </form>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* Sticky Bottom Navigation Bar (Visible on all tabs to ensure mobile-app premium standard) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0c0c0c]/90 backdrop-blur-md border-t border-zinc-900/80 shadow-[0_-8px_30px_rgba(0,0,0,0.8)] pb-safe py-2 px-3">
        <div className="max-w-md mx-auto flex justify-between items-center px-4">
          {[
            { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
            { id: 'plans', label: 'Plans', icon: <TrendingUp className="w-5 h-5" /> },
            { id: 'deposit', label: 'Deposit', icon: <PlusCircle className="w-5 h-5" /> },
            { id: 'tasks', label: 'Tasks', icon: <ListTodo className="w-5 h-5" /> },
            { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
          ].map((tab) => {
            const isSelected = 
              (activeTab === tab.id) ||
              (tab.id === 'home' && activeTab === 'overview') ||
              (tab.id === 'deposit' && activeTab === 'wallet');

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'profile') setProfileSubPage(null);
                  setActiveTab(tab.id as any);
                }}
                className={`flex flex-col items-center gap-1 text-[9px] font-mono uppercase font-black tracking-tight transition-all cursor-pointer ${
                  isSelected ? 'text-lime-400 scale-105' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
