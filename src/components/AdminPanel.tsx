import React, { useState } from 'react';
import { 
  Shield, Settings, CheckCircle2, Sliders
} from 'lucide-react';
import { 
  UserProfile, PlatformSettings, DepositRequest, 
  WithdrawalRequest, UserInvestment 
} from '../types';

interface AdminPanelProps {
  settings: PlatformSettings;
  users: UserProfile[];
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
  investments: UserInvestment[];
  onUpdateSettings: (newSettings: Partial<PlatformSettings>) => Promise<void>;
  onApproveDeposit: (deposit: DepositRequest) => Promise<void>;
  onRejectDeposit: (depositId: string) => Promise<void>;
  onApproveWithdrawal: (withdrawal: WithdrawalRequest) => Promise<void>;
  onRejectWithdrawal: (withdrawal: WithdrawalRequest) => Promise<void>;
  onAdjustUserBalance: (userId: string, amount: number) => Promise<void>;
}

export default function AdminPanel({
  settings,
  users,
  deposits,
  withdrawals,
  investments,
  onUpdateSettings,
  onApproveDeposit,
  onRejectDeposit,
  onApproveWithdrawal,
  onRejectWithdrawal,
  onAdjustUserBalance,
}: AdminPanelProps) {
  // Tabs: config, deposits, withdrawals, users
  const [adminTab, setAdminTab] = useState<'config' | 'deposits' | 'withdrawals' | 'users'>('config');
  
  // Settings edit states
  const [refL1, setRefL1] = useState(String(settings.referralRewardL1));
  const [refL2, setRefL2] = useState(String(settings.referralRewardL2));
  const [refL3, setRefL3] = useState(String(settings.referralRewardL3));
  const [minDep, setMinDep] = useState(String(settings.minDeposit));
  const [minWith, setMinWith] = useState(String(settings.minWithdrawal));
  const [welBonus, setWelBonus] = useState(String(settings.welcomeBonus));
  const [sigBonus, setSigBonus] = useState(String(settings.signBonus));
  const [paystackPub, setPaystackPub] = useState(settings.paystackPublicKey || '');
  const [paystackSec, setPaystackSec] = useState(settings.paystackSecretKey || '');
  const [manualDepositEnabled, setManualDepositEnabled] = useState(settings.manualDepositEnabled !== false);
  const [manualDepBankName, setManualDepBankName] = useState(settings.manualDepositBankName || '');
  const [manualDepAcctNum, setManualDepAcctNum] = useState(settings.manualDepositAccountNumber || '');
  const [manualDepAcctName, setManualDepAcctName] = useState(settings.manualDepositAccountName || '');
  const [saveLoading, setSaveLoading] = useState(false);

  // Balance adjustment states
  const [adjustingUserId, setAdjustingUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustLoading, setAdjustLoading] = useState(false);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      await onUpdateSettings({
        referralRewardL1: parseFloat(refL1) || 0,
        referralRewardL2: parseFloat(refL2) || 0,
        referralRewardL3: parseFloat(refL3) || 0,
        minDeposit: parseFloat(minDep) || 0,
        minWithdrawal: parseFloat(minWith) || 0,
        welcomeBonus: parseFloat(welBonus) || 0,
        signBonus: parseFloat(sigBonus) || 0,
        paystackPublicKey: paystackPub,
        paystackSecretKey: paystackSec,
        manualDepositEnabled,
        manualDepositBankName: manualDepBankName,
        manualDepositAccountNumber: manualDepAcctNum,
        manualDepositAccountName: manualDepAcctName,
      });
      alert('System configurations updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update settings');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleBalanceAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingUserId || !adjustAmount) {
      alert('Please select a user and enter an amount');
      return;
    }
    const amt = parseFloat(adjustAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a positive numeric value');
      return;
    }
    
    setAdjustLoading(true);
    try {
      const finalAmt = adjustType === 'add' ? amt : -amt;
      await onAdjustUserBalance(adjustingUserId, finalAmt);
      setAdjustAmount('');
      setAdjustingUserId('');
      alert('User balance adjusted successfully!');
    } catch (err) {
      console.error(err);
      alert('Error updating user balance');
    } finally {
      setAdjustLoading(false);
    }
  };

  // Pending deposits and withdrawals filter
  const pendingDeposits = deposits.filter(d => d.status === 'pending');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');

  return (
    <div className="bg-black text-white min-h-screen py-8 px-4 sm:px-6 text-left" id="admin-panel-wrapper">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Title Badge */}
        <div className="flex items-center gap-3 bg-zinc-950 border border-lime-500/20 p-5 rounded-2xl relative overflow-hidden animate-fade-in" id="admin-banner">
          <div className="p-3.5 bg-lime-500/10 border border-lime-500 rounded-xl text-lime-400">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              NVIDIA Platform Administrator
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              Root configuration controls. Set platform limits, review ledger, and approve requests.
            </p>
          </div>
        </div>

        {/* Dynamic Admin stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="admin-stats-grid">
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-left">
            <span className="block text-[10px] font-mono text-zinc-500 uppercase font-bold">Total Platform Users</span>
            <span className="block text-2xl font-black text-white font-mono">{users.length}</span>
          </div>
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-left">
            <span className="block text-[10px] font-mono text-zinc-500 uppercase font-bold">Pending Deposits</span>
            <span className={`block text-2xl font-black font-mono ${pendingDeposits.length > 0 ? 'text-lime-400 animate-pulse' : 'text-white'}`}>
              {pendingDeposits.length}
            </span>
          </div>
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-left">
            <span className="block text-[10px] font-mono text-zinc-500 uppercase font-bold">Pending Withdrawals</span>
            <span className={`block text-2xl font-black font-mono ${pendingWithdrawals.length > 0 ? 'text-red-450 animate-pulse' : 'text-white'}`}>
              {pendingWithdrawals.length}
            </span>
          </div>
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-left">
            <span className="block text-[10px] font-mono text-zinc-500 uppercase font-bold">Active GPU Leases</span>
            <span className="block text-2xl font-black text-white font-mono">
              {investments.filter(i => i.status === 'active').length}
            </span>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-zinc-900 overflow-x-auto scrollbar-none" id="admin-tabs">
          {[
            { id: 'config', label: 'System Settings' },
            { id: 'deposits', label: `Deposits (${pendingDeposits.length})` },
            { id: 'withdrawals', label: `Withdrawals (${pendingWithdrawals.length})` },
            { id: 'users', label: 'Users & Balance overrides' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id as any)}
              className={`px-5 py-3 border-b-2 text-xs font-mono font-bold uppercase transition shrink-0 cursor-pointer ${
                adminTab === tab.id
                  ? 'border-lime-500 text-lime-400 bg-lime-500/5'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        <div className="space-y-6" id="admin-tab-panels">
          
          {/* TAB 1: SYSTEM PROPERTIES (CONFIG) */}
          {adminTab === 'config' && (
            <form onSubmit={handleSettingsSubmit} className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 space-y-6 text-left relative">
              <div className="absolute top-0 right-0 p-4 text-zinc-700 pointer-events-none">
                <Sliders className="w-16 h-16 opacity-10" />
              </div>
              <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-3 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-lime-500" /> Platform Configuration
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Referral commissions */}
                <div className="space-y-4 border border-zinc-900 p-4 rounded-xl bg-zinc-900/10">
                  <span className="text-xs font-mono text-lime-400 font-bold uppercase tracking-wider block">1. Referral Rewards (%)</span>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold block">Level 1 (%):</label>
                      <input
                        type="number"
                        value={refL1}
                        onChange={(e) => setRefL1(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold block">Level 2 (%):</label>
                      <input
                        type="number"
                        value={refL2}
                        onChange={(e) => setRefL2(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold block">Level 3 (%):</label>
                      <input
                        type="number"
                        value={refL3}
                        onChange={(e) => setRefL3(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Percentage payout added to sponsor when referrals lease a plan.
                  </p>
                </div>

                {/* Transfer constraints */}
                <div className="space-y-4 border border-zinc-900 p-4 rounded-xl bg-zinc-900/10">
                  <span className="text-xs font-mono text-lime-400 font-bold uppercase tracking-wider block">2. Deposit & Withdraw limits</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold block">Min Deposit (₦):</label>
                      <input
                        type="number"
                        value={minDep}
                        onChange={(e) => setMinDep(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold block">Min Withdraw (₦):</label>
                      <input
                        type="number"
                        value={minWith}
                        onChange={(e) => setMinWith(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Minimum threshold values for user funding and payments.
                  </p>
                </div>

                {/* Platform Gifts */}
                <div className="space-y-4 border border-zinc-900 p-4 rounded-xl bg-zinc-900/10">
                  <span className="text-xs font-mono text-lime-400 font-bold uppercase tracking-wider block">3. Welcome & Daily Sign Bonuses</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold block">New Member Gift (₦):</label>
                      <input
                        type="number"
                        value={welBonus}
                        onChange={(e) => setWelBonus(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold block">Daily Sign Bonus (₦):</label>
                      <input
                        type="number"
                        value={sigBonus}
                        onChange={(e) => setSigBonus(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Automatic bonus funds credited to users. Defaults to 0 if unset.
                  </p>
                </div>

                {/* Paystack integrations */}
                <div className="space-y-4 border border-zinc-900 p-4 rounded-xl bg-zinc-900/10">
                  <span className="text-xs font-mono text-lime-400 font-bold uppercase tracking-wider block">4. Paystack API Credentials</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase block font-bold">Public Key:</label>
                      <input
                        type="text"
                        value={paystackPub}
                        onChange={(e) => setPaystackPub(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
                        placeholder="pk_test_..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase block font-bold">Secret Key:</label>
                      <input
                        type="password"
                        value={paystackSec}
                        onChange={(e) => setPaystackSec(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
                        placeholder="sk_test_..."
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Integrate your Paystack merchant keys to enable automated deposits.
                  </p>
                </div>

                {/* Manual Deposit settings */}
                <div className="space-y-4 border border-zinc-900 p-4 rounded-xl bg-zinc-900/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-lime-400 font-bold uppercase tracking-wider block">5. Manual Deposit Details</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={manualDepositEnabled}
                        onChange={(e) => setManualDepositEnabled(e.target.checked)}
                        className="rounded border-zinc-850 bg-zinc-950 text-lime-500 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase select-none">Enabled</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase block font-bold">Merchant Bank:</label>
                      <input
                        type="text"
                        value={manualDepBankName}
                        onChange={(e) => setManualDepBankName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        placeholder="e.g. Access Bank"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase block font-bold">Account Number:</label>
                      <input
                        type="text"
                        value={manualDepAcctNum}
                        onChange={(e) => setManualDepAcctNum(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
                        placeholder="e.g. 0123456789"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-zinc-400 uppercase block font-bold">Account Name:</label>
                      <input
                        type="text"
                        value={manualDepAcctName}
                        onChange={(e) => setManualDepAcctName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        placeholder="e.g. NVIDIA LEASING LTD"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Show these details in user dashboard for direct manual bank deposit funding.
                  </p>
                </div>

              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="w-full py-3 bg-lime-500 hover:bg-lime-400 text-black font-black uppercase rounded-lg text-xs tracking-wider cursor-pointer transition-all duration-300"
                >
                  {saveLoading ? 'Saving...' : 'Save Configuration Changes'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: REVIEW DEPOSITS */}
          {adminTab === 'deposits' && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 text-left space-y-4">
              <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">
                Pending Deposits ({pendingDeposits.length})
              </h3>

              {pendingDeposits.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 font-mono text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-zinc-800 mb-2" />
                  No pending deposit requests.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-xs text-zinc-300">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 text-[9px] uppercase">
                        <th className="py-2.5 px-3">User</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Reference / Sender</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {pendingDeposits.map((dep) => (
                        <tr key={dep.id} className="hover:bg-zinc-900/40 transition">
                          <td className="py-3 px-3 font-bold text-white break-all">{dep.userEmail}</td>
                          <td className="py-3 px-3 text-lime-400 font-bold">₦{dep.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 px-3 text-zinc-400">
                            <div>#{dep.reference || 'N/A'}</div>
                            {dep.senderName && <div className="text-[10px] text-zinc-500 font-sans mt-0.5">Sender: {dep.senderName}</div>}
                          </td>
                          <td className="py-3 px-3 text-zinc-500">{new Date(dep.createdAt).toLocaleString()}</td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => onApproveDeposit(dep)}
                                className="px-2.5 py-1 bg-lime-500 text-black font-bold rounded text-[10px] uppercase cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => onRejectDeposit(dep.id)}
                                className="px-2.5 py-1 bg-red-950 border border-red-900/30 text-red-400 font-bold rounded text-[10px] uppercase cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REVIEW WITHDRAWALS */}
          {adminTab === 'withdrawals' && (
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 text-left space-y-4">
              <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">
                Pending Withdrawals ({pendingWithdrawals.length})
              </h3>

              {pendingWithdrawals.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 font-mono text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-zinc-800 mb-2" />
                  No pending withdrawal requests.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-xs text-zinc-300">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 text-[9px] uppercase">
                        <th className="py-2.5 px-3">User</th>
                        <th className="py-2.5 px-3">Payout</th>
                        <th className="py-2.5 px-3">Destination Details</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {pendingWithdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-zinc-900/40 transition">
                          <td className="py-3 px-3 font-bold text-white break-all">{w.userEmail}</td>
                          <td className="py-3 px-3 text-red-400 font-bold">₦{w.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 px-3 space-y-0.5">
                            <span className="block font-bold text-white uppercase text-[10px]">{w.bankName}</span>
                            <span className="block text-[10px] text-zinc-400">Acct: {w.accountNumber}</span>
                            <span className="block text-[10px] text-zinc-400">Name: {w.accountName}</span>
                          </td>
                          <td className="py-3 px-3 text-zinc-500">{new Date(w.createdAt).toLocaleString()}</td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => onApproveWithdrawal(w)}
                                className="px-2.5 py-1 bg-lime-500 text-black font-bold rounded text-[10px] uppercase cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => onRejectWithdrawal(w)}
                                className="px-2.5 py-1 bg-red-950 border border-red-900/30 text-red-400 font-bold rounded text-[10px] uppercase cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MANAGE USERS LEDGER */}
          {adminTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Users Ledger Adjustment Form */}
              <div className="lg:col-span-1 bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-left space-y-4">
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">
                  Balance Manual Adjustment
                </h3>

                <form onSubmit={handleBalanceAdjustSubmit} className="space-y-4 font-mono text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Select Target User:</label>
                    <select
                      value={adjustingUserId}
                      onChange={(e) => setAdjustingUserId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-2 text-white focus:outline-none"
                    >
                      <option value="">-- Choose User --</option>
                      {users.map(u => (
                        <option key={u.uid} value={u.uid}>
                          {u.email} (₦{u.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Adjustment Type:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjustType('add')}
                        className={`py-2 border rounded font-bold text-center cursor-pointer ${
                          adjustType === 'add'
                            ? 'bg-lime-500/10 border-lime-500 text-lime-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        Add (+)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustType('subtract')}
                        className={`py-2 border rounded font-bold text-center cursor-pointer ${
                          adjustType === 'subtract'
                            ? 'bg-red-500/10 border-red-500 text-red-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        Subtract (-)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Amount (₦):</label>
                    <input
                      type="number"
                      required
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-2 text-white focus:outline-none"
                      placeholder="e.g. 5000"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={adjustLoading}
                    className="w-full py-2.5 bg-lime-500 hover:bg-lime-400 text-black font-black uppercase rounded text-[10px] tracking-wider transition cursor-pointer"
                  >
                    {adjustLoading ? 'Executing...' : 'Apply adjustment'}
                  </button>
                </form>
              </div>

              {/* Users profile directories */}
              <div className="lg:col-span-2 bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-left space-y-4">
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">
                  System User Directory ({users.length})
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-[10px] text-zinc-300">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 uppercase text-[8px]">
                        <th className="py-2 px-2.5">Email</th>
                        <th className="py-2 px-2.5">Role</th>
                        <th className="py-2 px-2.5">Wallet Balance</th>
                        <th className="py-2 px-2.5">Referral Code</th>
                        <th className="py-2 px-2.5">Sponsor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {users.map((u) => (
                        <tr key={u.uid} className="hover:bg-zinc-900/40 transition">
                          <td className="py-2 px-2.5 font-bold text-white break-all">{u.email}</td>
                          <td className="py-2 px-2.5 uppercase">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                              u.role === 'admin' ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-lime-400 font-bold">₦{u.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-2 px-2.5 text-zinc-400">{u.uid.substring(0, 6).toUpperCase()}</td>
                          <td className="py-2 px-2.5 text-zinc-500 break-all">{u.referredBy || 'Direct'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
