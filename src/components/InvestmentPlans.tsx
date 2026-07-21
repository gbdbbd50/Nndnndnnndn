import React, { useState } from 'react';
import { Cpu, Server, Layers, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { InvestmentPlan, UserProfile } from '../types';
import { generatePlanChartData } from '../lib/prices';

interface InvestmentPlansProps {
  plans: InvestmentPlan[];
  user: UserProfile | null;
  onInvest: (plan: InvestmentPlan, amount: number) => void;
  onOpenAuth: () => void;
  minDeposit: number;
}

export default function InvestmentPlans({
  plans,
  user,
  onInvest,
  onOpenAuth,
  minDeposit,
}: InvestmentPlansProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id || '');
  const [investAmounts, setInvestAmounts] = useState<Record<string, number>>({});

  const handleAmountChange = (planId: string, val: string) => {
    const num = parseFloat(val);
    setInvestAmounts((prev) => ({
      ...prev,
      [planId]: isNaN(num) ? 0 : num,
    }));
  };

  const currentSelectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const handleInvestSubmit = (plan: InvestmentPlan) => {
    const amount = investAmounts[plan.id] || plan.minAmount;
    if (amount < plan.minAmount) {
      alert(`Min investment for this plan is ₦${plan.minAmount.toLocaleString()}`);
      return;
    }
    if (amount > plan.maxAmount) {
      alert(`Max investment for this plan is ₦${plan.maxAmount.toLocaleString()}`);
      return;
    }
    if (user && user.balance < amount) {
      alert(`You do not have enough money in your wallet! Please add at least ₦${(amount - user.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })} to start.`);
      return;
    }
    onInvest(plan, amount);
  };

  return (
    <div className="bg-zinc-950 py-12 px-4 sm:px-6 text-white text-left" id="plans-section">
      <div className="max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-lime-500/10 border border-lime-500/20 text-lime-400 text-[10px] font-mono uppercase tracking-wider">
            High Efficiency GPU Mining
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight uppercase">
            NVIDIA GPU <span className="text-lime-500">Lease Plans</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Select a plan to lease active GPU computing power and collect daily rewards.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Plan Selector Column */}
          <div className="lg:col-span-5 space-y-3">
            <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2 font-bold">
              1. Select Lease Core:
            </span>
            {plans.map((plan) => {
              const isSelected = plan.id === selectedPlanId;
              const inputAmount = investAmounts[plan.id] ?? plan.minAmount;

              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group ${
                    isSelected
                      ? 'bg-zinc-900 border-lime-500 shadow-[0_0_15px_rgba(118,185,0,0.1)]'
                      : 'bg-zinc-900/40 border-zinc-850 hover:border-zinc-750'
                  }`}
                  id={`plan-card-${plan.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg border transition-all shrink-0 ${
                      isSelected ? 'bg-lime-500 text-black border-lime-400' : 'bg-zinc-950 text-lime-500 border-zinc-850'
                    }`}>
                      {plan.name.includes('4090') ? (
                        <Cpu className="w-4 h-4" />
                      ) : plan.name.includes('A100') ? (
                        <Layers className="w-4 h-4" />
                      ) : (
                        <Server className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                        {plan.name}
                        {isSelected && <span className="w-1.5 h-1.5 bg-lime-500 rounded-full animate-pulse"></span>}
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{plan.description}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-zinc-500">
                        <span>Lease: {plan.durationDays} Days</span>
                        <span>•</span>
                        <span className="text-lime-400 font-bold">{plan.dailyProfitPercent}% Daily Yield</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 border-t sm:border-t-0 border-zinc-850 pt-2 sm:pt-0">
                    <span className="block text-[9px] text-zinc-500 uppercase font-mono">Limits</span>
                    <span className="block text-xs font-bold text-zinc-300 font-mono">
                      ₦{plan.minAmount.toLocaleString()} - ₦{plan.maxAmount.toLocaleString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Calculator and Chart Area */}
          <div className="lg:col-span-7 bg-zinc-900/50 border border-zinc-850 rounded-2xl p-5 sm:p-6 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-lime-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-850 pb-4">
              <div>
                <span className="text-[10px] font-mono text-lime-400 font-bold uppercase">2. Lease Calculator</span>
                <h3 className="text-lg font-bold mt-0.5 text-white">{currentSelectedPlan.name}</h3>
              </div>
              <div className="bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-850 text-center font-mono shrink-0">
                <span className="block text-[8px] text-zinc-500 uppercase">Daily rate</span>
                <span className="block text-xs font-black text-lime-400">{currentSelectedPlan.dailyProfitPercent}% daily</span>
              </div>
            </div>

            {/* Live Interactive Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Investment Amount (₦):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">₦</span>
                  <input
                    type="number"
                    min={currentSelectedPlan.minAmount}
                    max={currentSelectedPlan.maxAmount}
                    value={investAmounts[currentSelectedPlan.id] ?? currentSelectedPlan.minAmount}
                    onChange={(e) => handleAmountChange(currentSelectedPlan.id, e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg pl-8 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-lime-500"
                    placeholder="Enter amount"
                  />
                </div>
                <p className="text-[9px] text-zinc-500 mt-1 font-mono">
                  Range: ₦{currentSelectedPlan.minAmount.toLocaleString()} to ₦{currentSelectedPlan.maxAmount.toLocaleString()}
                </p>
              </div>

              {/* Calculations */}
              <div className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-xl space-y-2 text-left font-mono text-xs">
                <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider block">Yield Projections</span>
                <div className="flex justify-between text-zinc-400">
                  <span>Lease Fee:</span>
                  <span className="text-white font-bold">₦{(investAmounts[currentSelectedPlan.id] || currentSelectedPlan.minAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Daily Profit Rate:</span>
                  <span className="text-lime-400 font-bold">+{currentSelectedPlan.dailyProfitPercent}%</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Daily Earnings:</span>
                  <span className="text-lime-400 font-bold">
                    +₦{(((investAmounts[currentSelectedPlan.id] || currentSelectedPlan.minAmount) * currentSelectedPlan.dailyProfitPercent) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t border-zinc-850 pt-1.5 flex justify-between font-bold text-sm">
                  <span className="text-white">Total Return:</span>
                  <span className="text-lime-400">
                    ₦{(((investAmounts[currentSelectedPlan.id] || currentSelectedPlan.minAmount) * currentSelectedPlan.dailyProfitPercent / 100) * currentSelectedPlan.durationDays).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Trajectory Projection Chart */}
            <div className="space-y-1.5 text-left">
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-lime-500" /> projected growth over lease (Days 1 to 7)
              </span>
              <div className="h-32 bg-zinc-950 rounded-xl border border-zinc-850/60 p-3 flex items-center justify-center relative overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={generatePlanChartData(
                      currentSelectedPlan.dailyProfitPercent,
                      investAmounts[currentSelectedPlan.id] || currentSelectedPlan.minAmount
                    )}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#76b900" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#76b900" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" stroke="#52525b" fontSize={8} tickLine={false} />
                    <YAxis stroke="#52525b" fontSize={8} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '6px' }}
                      labelStyle={{ color: '#a1a1aa', fontSize: '10px', fontFamily: 'monospace' }}
                      itemStyle={{ color: '#84cc16', fontSize: '11px', fontFamily: 'monospace' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#84cc16" strokeWidth={1.5} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Invest Button */}
            <div className="pt-1">
              {user ? (
                <button
                  onClick={() => handleInvestSubmit(currentSelectedPlan)}
                  className="w-full py-3 bg-lime-500 hover:bg-lime-400 text-black font-black text-xs uppercase rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(118,185,0,0.25)] tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  id={`purchase-btn-${currentSelectedPlan.id}`}
                >
                  <Cpu className="w-3.5 h-3.5" /> Lease GPU Core
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-750 text-white font-bold text-xs uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-700"
                >
                  Sign In to Purchase Plan
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
