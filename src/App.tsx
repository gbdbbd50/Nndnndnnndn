import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, updatePassword } from 'firebase/auth';
import { 
  collection, doc, getDoc, getDocFromServer, setDoc, updateDoc, 
  onSnapshot, query, where, orderBy, getDocs 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { fetchRealTimePrices } from './lib/prices';

// Import UI components
import NvidiaHeader from './components/NvidiaHeader';
import HeroSection from './components/HeroSection';
import InvestmentPlans from './components/InvestmentPlans';
import AuthModal from './components/AuthModal';
import UserDashboard from './components/UserDashboard';
import AdminPanel from './components/AdminPanel';
import { useToast } from './components/Toast';
import { 
  UserProfile, PlatformSettings, UserInvestment, 
  DepositRequest, WithdrawalRequest, TransactionLog, 
  RealTimePrice, InvestmentPlan, UserRole, SavedBank 
} from './types';
import { Cpu, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';

// Static Investment Plans
const STATIC_PLANS: InvestmentPlan[] = [
  {
    id: 'plan_4090',
    name: 'RTX 4090 Workstation Core',
    dailyProfitPercent: 1.5,
    minAmount: 30,
    maxAmount: 199,
    durationDays: 30,
    description: 'Perfect for basic machine learning workloads and micro scale compute.',
  },
  {
    id: 'plan_a100',
    name: 'A100 Enterprise Node Cluster',
    dailyProfitPercent: 2.5,
    minAmount: 200,
    maxAmount: 1499,
    durationDays: 45,
    description: 'Enterprise grade cores for medium scale AI models and deep training.',
  },
  {
    id: 'plan_h100',
    name: 'H100 Supercomputer Cluster',
    dailyProfitPercent: 3.8,
    minAmount: 1500,
    maxAmount: 20000,
    durationDays: 60,
    description: 'State-of-the-art supercomputers designed for massive generative LLM processing.',
  },
];

// Default fallback platform configurations
const DEFAULT_SETTINGS: PlatformSettings = {
  id: 'global',
  referralRewardL1: 0,
  referralRewardL2: 0,
  referralRewardL3: 0,
  minDeposit: 0,
  minWithdrawal: 0,
  welcomeBonus: 0,
  signBonus: 0,
  paystackPublicKey: '',
  paystackSecretKey: '',
  manualDepositEnabled: true,
  manualDepositBankName: '',
  manualDepositAccountNumber: '',
  manualDepositAccountName: '',
  updatedAt: new Date().toISOString(),
};

export default function App() {
  const { showToast } = useToast();
  
  // Core user state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // App states
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [prices, setPrices] = useState<RealTimePrice[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [initialRefCode, setInitialRefCode] = useState('');
  
  // Collection listeners state
  const [userInvestments, setUserInvestments] = useState<UserInvestment[]>([]);
  const [userDeposits, setUserDeposits] = useState<DepositRequest[]>([]);
  const [userWithdrawals, setUserWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [userTransactions, setUserTransactions] = useState<TransactionLog[]>([]);
  const [referralCounts, setReferralCounts] = useState({ l1: 0, l2: 0, l3: 0 });

  // Admin global views
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allDeposits, setAllDeposits] = useState<DepositRequest[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [allInvestments, setAllInvestments] = useState<UserInvestment[]>([]);

  // Loading flags
  const [appLoading, setAppLoading] = useState(true);
  const [loadingDaily, setLoadingDaily] = useState(false);

  // 1. Connection check on startup (as requested by SKILL.md)
  useEffect(() => {
    async function checkFirebaseConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration and network parameters.");
        }
      }
    }
    checkFirebaseConnection();
  }, []);

  // 1b. Check URL referral parameter and auto-redirect to signup
  useEffect(() => {
    if (appLoading) return;
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      setInitialRefCode(ref);
      if (!currentUser) {
        setAuthModalOpen(true);
        showToast('Welcome to NVIDIA Lease! Please sign up using your referral link to secure your bonus.', 'success');
      }
    }
  }, [currentUser, appLoading]);

  // 2. Real-time Market Ticker Update Loop
  useEffect(() => {
    async function updateRates() {
      const data = await fetchRealTimePrices();
      setPrices(data);
    }
    updateRates();
    const interval = setInterval(updateRates, 4000); // Poll rates every 4 seconds
    return () => clearInterval(interval);
  }, []);

  // 3. Platform Settings listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as PlatformSettings);
      } else {
        // Bootstrap global properties document if it doesn't exist
        try {
          setDoc(doc(db, 'settings', 'global'), DEFAULT_SETTINGS);
        } catch (e) {
          console.warn('Bootstrap settings failed, probably waiting for Auth', e);
        }
      }
    }, (error) => {
      console.warn('Settings stream permissions restriction', error);
    });
    return () => unsub();
  }, []);

  // 4. Handle Firebase Authentication State Changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          // Find or create profile
          const profileRef = doc(db, 'users', user.uid);
          const profileSnap = await getDoc(profileRef);
          
          let profile: UserProfile;

          if (profileSnap.exists()) {
            profile = profileSnap.data() as UserProfile;
          } else {
            // If no profile, create standard one (check if bootstrapped admin email)
            const isDefaultAdmin = user.email?.toLowerCase() === 'gbdbbd50@gmail.com';
            
            // Detect referral code from URL if present
            let referredBy = '';
            let referredByLevel2 = '';
            let referredByLevel3 = '';

            const urlParams = new URLSearchParams(window.location.search);
            const refCode = urlParams.get('ref');
            if (refCode) {
              try {
                const sponsorSnap = await getDoc(doc(db, 'users', refCode));
                if (sponsorSnap.exists()) {
                  const sponsorData = sponsorSnap.data();
                  referredBy = sponsorData.uid;
                  referredByLevel2 = sponsorData.referredBy || '';
                  referredByLevel3 = sponsorData.referredByLevel2 || '';
                }
              } catch (e) {
                console.warn('Referral check on URL parameter failed', e);
              }
            }

            profile = {
              uid: user.uid,
              email: user.email || 'investor@greentech.com',
              role: isDefaultAdmin ? UserRole.ADMIN : UserRole.USER,
              balance: settings.welcomeBonus,
              referralCode: user.uid.substring(0, 6).toUpperCase(),
              referredBy,
              referredByLevel2,
              referredByLevel3,
              welcomeBonusClaimed: true,
              createdAt: new Date().toISOString(),
            };

            await setDoc(profileRef, profile);

            // Log welcome bonus transaction
            if (!isDefaultAdmin && settings.welcomeBonus > 0) {
              const transId = 'welcome_' + Math.random().toString(36).substring(2, 9);
              await setDoc(doc(db, 'transactions', transId), {
                id: transId,
                userId: user.uid,
                amount: settings.welcomeBonus,
                type: 'bonus',
                description: 'New member welcome bonus',
                createdAt: new Date().toISOString()
              });
            }
          }
          
          setUserProfile(profile);
        } catch (error) {
          console.warn('Profile loading failed (client may be offline). Using a fallback profile:', error);
          // Standard resilient fallback profile for offline/unreachable states
          setUserProfile({
            uid: user.uid,
            email: user.email || 'investor@greentech.com',
            role: user.email?.toLowerCase() === 'gbdbbd50@gmail.com' ? UserRole.ADMIN : UserRole.USER,
            balance: 0,
            referralCode: user.uid.substring(0, 6).toUpperCase(),
            referredBy: '',
            referredByLevel2: '',
            referredByLevel3: '',
            welcomeBonusClaimed: false,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        setUserProfile(null);
        setIsAdminMode(false);
      }
      setAppLoading(false);
    });

    return () => unsubscribeAuth();
  }, [settings.welcomeBonus]);

  // 5. Setup data snapshots for logged-in user
  useEffect(() => {
    if (!currentUser || !userProfile) return;

    const userId = currentUser.uid;

    // A. Live profile observer
    const unsubProfile = onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) {
        setUserProfile(snap.data() as UserProfile);
      }
    });

    // B. Live active/completed investments observer
    const invQuery = query(collection(db, 'investments'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const unsubInv = onSnapshot(invQuery, (snap) => {
      const items: UserInvestment[] = [];
      snap.forEach((d) => items.push(d.data() as UserInvestment));
      setUserInvestments(items);
    }, (error) => {
      console.warn('Investment read permission block', error);
    });

    // C. Live user deposits observer
    const depQuery = query(collection(db, 'deposits'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const unsubDep = onSnapshot(depQuery, (snap) => {
      const items: DepositRequest[] = [];
      snap.forEach((d) => items.push(d.data() as DepositRequest));
      setUserDeposits(items);
    }, (error) => {
      console.warn('Deposits read permission block', error);
    });

    // D. Live user withdrawals observer
    const withQuery = query(collection(db, 'withdrawals'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const unsubWith = onSnapshot(withQuery, (snap) => {
      const items: WithdrawalRequest[] = [];
      snap.forEach((d) => items.push(d.data() as WithdrawalRequest));
      setUserWithdrawals(items);
    }, (error) => {
      console.warn('Withdrawals read permission block', error);
    });

    // E. Live transactions observer
    const transQuery = query(collection(db, 'transactions'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const unsubTrans = onSnapshot(transQuery, (snap) => {
      const items: TransactionLog[] = [];
      snap.forEach((d) => items.push(d.data() as TransactionLog));
      setUserTransactions(items);
    }, (error) => {
      console.warn('Transactions read permission block', error);
    });

    // F. Count 3 levels of referrals via secure, scoped queries
    const q1 = query(collection(db, 'users'), where('referredBy', '==', userId));
    const q2 = query(collection(db, 'users'), where('referredByLevel2', '==', userId));
    const q3 = query(collection(db, 'users'), where('referredByLevel3', '==', userId));

    const unsubRefs1 = onSnapshot(q1, (snap) => {
      setReferralCounts((prev) => ({ ...prev, l1: snap.size }));
    }, (error) => {
      console.warn('Referral Level 1 count query issue', error);
    });

    const unsubRefs2 = onSnapshot(q2, (snap) => {
      setReferralCounts((prev) => ({ ...prev, l2: snap.size }));
    }, (error) => {
      console.warn('Referral Level 2 count query issue', error);
    });

    const unsubRefs3 = onSnapshot(q3, (snap) => {
      setReferralCounts((prev) => ({ ...prev, l3: snap.size }));
    }, (error) => {
      console.warn('Referral Level 3 count query issue', error);
    });

    return () => {
      unsubProfile();
      unsubInv();
      unsubDep();
      unsubWith();
      unsubTrans();
      unsubRefs1();
      unsubRefs2();
      unsubRefs3();
    };
  }, [currentUser, userProfile?.uid]);

  // 6. Setup global admin listeners if administrator is connected
  useEffect(() => {
    if (!currentUser || !userProfile || userProfile.role !== UserRole.ADMIN || !isAdminMode) return;

    // Admin observer 1: All registered profiles
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach((d) => list.push(d.data() as UserProfile));
      setAllUsers(list);
    });

    // Admin observer 2: All deposits
    const unsubAllDep = onSnapshot(query(collection(db, 'deposits'), orderBy('createdAt', 'desc')), (snap) => {
      const list: DepositRequest[] = [];
      snap.forEach((d) => list.push(d.data() as DepositRequest));
      setAllDeposits(list);
    });

    // Admin observer 3: All withdrawals
    const unsubAllWith = onSnapshot(query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc')), (snap) => {
      const list: WithdrawalRequest[] = [];
      snap.forEach((d) => list.push(d.data() as WithdrawalRequest));
      setAllWithdrawals(list);
    });

    // Admin observer 4: All investments
    const unsubAllInv = onSnapshot(collection(db, 'investments'), (snap) => {
      const list: UserInvestment[] = [];
      snap.forEach((d) => list.push(d.data() as UserInvestment));
      setAllInvestments(list);
    });

    return () => {
      unsubUsers();
      unsubAllDep();
      unsubAllWith();
      unsubAllInv();
    };
  }, [currentUser, userProfile?.role, isAdminMode]);

  // --- ACTIONS ENGINE ---

  // 1. Log out
  const handleLogout = async () => {
    await signOut(auth);
    setUserProfile(null);
    setIsAdminMode(false);
  };

  // 2. Claim free daily reward
  const handleClaimDailyBonus = async () => {
    if (!currentUser || !userProfile) return;
    setLoadingDaily(true);
    
    // Check if claimed already today (we can store simple lastClaimed timestamp or transaction history)
    const todayStr = new Date().toISOString().split('T')[0];
    const hasClaimedToday = userTransactions.some(
      (t) => t.type === 'bonus' && t.description.includes('Daily sign bonus') && t.createdAt.startsWith(todayStr)
    );

    if (hasClaimedToday) {
      showToast('You already claimed your free daily cash today! Please come back tomorrow.', 'error');
      setLoadingDaily(false);
      return;
    }

    try {
      const userId = currentUser.uid;
      const bonusAmount = settings.signBonus;
      const transId = 'daily_' + Math.random().toString(36).substring(2, 9);

      // Write daily transaction
      await setDoc(doc(db, 'transactions', transId), {
        id: transId,
        userId,
        amount: bonusAmount,
        type: 'bonus',
        description: 'Daily sign bonus claimed',
        createdAt: new Date().toISOString(),
      });

      // Update user wallet balance
      await updateDoc(doc(db, 'users', userId), {
        balance: userProfile.balance + bonusAmount,
      });

      showToast(`Congratulations! You claimed your free Daily Gift of ₦${bonusAmount.toLocaleString()}!`, 'success');
    } catch (error) {
      showToast('Failed to claim daily bonus. Please try again.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'users');
    } finally {
      setLoadingDaily(false);
    }
  };

  // 3. Purchase / lease a GPU investment plan
  const handlePurchasePlan = async (plan: InvestmentPlan, amount: number) => {
    if (!currentUser || !userProfile) return;

    try {
      const userId = currentUser.uid;
      const invId = 'lease_' + Math.random().toString(36).substring(2, 9);
      
      const newInvestment: UserInvestment = {
        id: invId,
        userId,
        planName: plan.name,
        amount,
        dailyProfitPercent: plan.dailyProfitPercent,
        totalEarnings: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastTickedAt: new Date().toISOString(),
      };

      // 1. Create investment record
      await setDoc(doc(db, 'investments', invId), newInvestment);

      // 2. Deduct fee from wallet balance
      await updateDoc(doc(db, 'users', userId), {
        balance: userProfile.balance - amount,
      });

      // 3. Log debit transaction
      const transId = 'inv_debit_' + Math.random().toString(36).substring(2, 9);
      await setDoc(doc(db, 'transactions', transId), {
        id: transId,
        userId,
        amount: -amount,
        type: 'withdrawal',
        description: `Lease payment for ${plan.name}`,
        createdAt: new Date().toISOString(),
      });

      showToast(`Success! You have leased the ${plan.name} for ₦${amount.toLocaleString()}!`, 'success');
    } catch (error) {
      showToast('Failed to lease GPU cluster. Please try again.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'investments');
    }
  };

  // 4. Place a deposit request
  const handleNewDeposit = async (amount: number, senderName?: string) => {
    if (!currentUser || !userProfile) return;
    try {
      const depId = 'dep_' + Math.random().toString(36).substring(2, 9);
      const randomRef = 'REF_' + Math.floor(100000 + Math.random() * 900000);
      
      const newDeposit: DepositRequest = {
        id: depId,
        userId: currentUser.uid,
        userEmail: userProfile.email,
        amount,
        status: 'pending',
        reference: randomRef,
        senderName: senderName || '',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'deposits', depId), newDeposit);
      showToast(`Deposit notification for ₦${amount.toLocaleString()} submitted successfully! Waiting for administrator verification.`, 'success');
    } catch (error) {
      showToast('Failed to submit deposit details.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'deposits');
    }
  };

  // Update persistent bank details on user profile
  const handleUpdateBankDetails = async (bank: string, acctNum: string, acctName: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        bankName: bank,
        accountNumber: acctNum,
        accountName: acctName,
      });
      showToast('Default bank details updated successfully!', 'success');
    } catch (error) {
      showToast('Failed to save default bank details.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  // Update or save list of multiple bank accounts for withdrawal selection
  const handleUpdateSavedBanks = async (updatedBanks: SavedBank[]) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        savedBanks: updatedBanks,
      });
      showToast('Your saved bank accounts have been updated successfully!', 'success');
    } catch (error) {
      showToast('Failed to update saved bank accounts list.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  // Update password for logged-in user
  const handleUpdatePassword = async (newPassword: string) => {
    if (!currentUser) return;
    try {
      await updatePassword(currentUser, newPassword);
      showToast('Password updated successfully!', 'success');
    } catch (error: any) {
      console.error(error);
      if (error?.code === 'auth/requires-recent-login') {
        showToast('For security, please sign out and sign back in to change your password.', 'error');
      } else {
        showToast(error?.message || 'Failed to update password.', 'error');
      }
      throw error;
    }
  };

  // 5. Place a withdrawal request
  const handleNewWithdrawal = async (amount: number, bank: string, acctNum: string, acctName: string) => {
    if (!currentUser || !userProfile) return;
    try {
      const withId = 'with_' + Math.random().toString(36).substring(2, 9);

      // Deduct balance instantly to lock it from double spend
      await updateDoc(doc(db, 'users', currentUser.uid), {
        balance: userProfile.balance - amount,
      });

      const newWith: WithdrawalRequest = {
        id: withId,
        userId: currentUser.uid,
        userEmail: userProfile.email,
        amount,
        bankName: bank,
        accountNumber: acctNum,
        accountName: acctName,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'withdrawals', withId), newWith);

      // Log transaction debit
      const transId = 'with_pending_' + Math.random().toString(36).substring(2, 9);
      await setDoc(doc(db, 'transactions', transId), {
        id: transId,
        userId: currentUser.uid,
        amount: -amount,
        type: 'withdrawal',
        description: `Withdrawal payout request (${bank})`,
        createdAt: new Date().toISOString(),
      });

      showToast(`Withdrawal request of ₦${amount.toLocaleString()} submitted successfully!`, 'success');
    } catch (error) {
      showToast('Failed to place withdrawal request.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'withdrawals');
    }
  };

  // --- ADMINISTRATOR OVERRIDES ENGINE ---

  // A. Save Global System settings
  const handleUpdateSettings = async (newSettings: Partial<PlatformSettings>) => {
    if (!currentUser || !userProfile || userProfile.role !== UserRole.ADMIN) return;
    try {
      await updateDoc(doc(db, 'settings', 'global'), {
        ...newSettings,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings');
    }
  };

  // B. Approve User Deposit (Executes 3-level Referral payouts!)
  const handleApproveDeposit = async (dep: DepositRequest) => {
    if (!currentUser || !userProfile || userProfile.role !== UserRole.ADMIN) return;
    try {
      // 1. Update deposit status to approved
      await updateDoc(doc(db, 'deposits', dep.id), { status: 'approved' });

      // 2. Add amount to target user balance
      const targetUserRef = doc(db, 'users', dep.userId);
      const targetSnap = await getDoc(targetUserRef);
      if (targetSnap.exists()) {
        const targetProfile = targetSnap.data() as UserProfile;
        const previousBal = targetProfile.balance;
        await updateDoc(targetUserRef, {
          balance: previousBal + dep.amount,
        });

        // 3. Log deposit transaction
        const transId = 'dep_approve_' + Math.random().toString(36).substring(2, 9);
        await setDoc(doc(db, 'transactions', transId), {
          id: transId,
          userId: dep.userId,
          amount: dep.amount,
          type: 'deposit',
          description: `Deposit credit approved`,
          createdAt: new Date().toISOString(),
        });

        // 4. MULTI-LEVEL REFERRAL PAYOUT TRIGGERS (3 levels)
        const amount = dep.amount;

        // Level 1 Sponsor
        if (targetProfile.referredBy) {
          const l1SponsorRef = doc(db, 'users', targetProfile.referredBy);
          const l1Snap = await getDoc(l1SponsorRef);
          if (l1Snap.exists()) {
            const l1Profile = l1Snap.data() as UserProfile;
            const l1Bonus = amount * (settings.referralRewardL1 / 100);
            
            await updateDoc(l1SponsorRef, { balance: l1Profile.balance + l1Bonus });
            const ref1Trans = 'ref1_' + Math.random().toString(36).substring(2, 9);
            await setDoc(doc(db, 'transactions', ref1Trans), {
              id: ref1Trans,
              userId: l1Profile.uid,
              amount: l1Bonus,
              type: 'referral_reward',
              description: `Level 1 referral bonus from ${targetProfile.email}`,
              createdAt: new Date().toISOString(),
            });
          }
        }

        // Level 2 Sponsor
        if (targetProfile.referredByLevel2) {
          const l2SponsorRef = doc(db, 'users', targetProfile.referredByLevel2);
          const l2Snap = await getDoc(l2SponsorRef);
          if (l2Snap.exists()) {
            const l2Profile = l2Snap.data() as UserProfile;
            const l2Bonus = amount * (settings.referralRewardL2 / 100);
            
            await updateDoc(l2SponsorRef, { balance: l2Profile.balance + l2Bonus });
            const ref2Trans = 'ref2_' + Math.random().toString(36).substring(2, 9);
            await setDoc(doc(db, 'transactions', ref2Trans), {
              id: ref2Trans,
              userId: l2Profile.uid,
              amount: l2Bonus,
              type: 'referral_reward',
              description: `Level 2 referral bonus triggered by ${targetProfile.email}`,
              createdAt: new Date().toISOString(),
            });
          }
        }

        // Level 3 Sponsor
        if (targetProfile.referredByLevel3) {
          const l3SponsorRef = doc(db, 'users', targetProfile.referredByLevel3);
          const l3Snap = await getDoc(l3SponsorRef);
          if (l3Snap.exists()) {
            const l3Profile = l3Snap.data() as UserProfile;
            const l3Bonus = amount * (settings.referralRewardL3 / 100);
            
            await updateDoc(l3SponsorRef, { balance: l3Profile.balance + l3Bonus });
            const ref3Trans = 'ref3_' + Math.random().toString(36).substring(2, 9);
            await setDoc(doc(db, 'transactions', ref3Trans), {
              id: ref3Trans,
              userId: l3Profile.uid,
              amount: l3Bonus,
              type: 'referral_reward',
              description: `Level 3 referral bonus triggered by ${targetProfile.email}`,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      showToast('Deposit approved! Funds and 3-level sponsor commissions distributed.', 'success');
    } catch (error) {
      showToast('Deposit approval failed.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'deposits');
    }
  };

  // C. Reject User Deposit
  const handleRejectDeposit = async (depositId: string) => {
    if (!currentUser || !userProfile || userProfile.role !== UserRole.ADMIN) return;
    try {
      await updateDoc(doc(db, 'deposits', depositId), { status: 'rejected' });
      showToast('Deposit request rejected.', 'info');
    } catch (error) {
      showToast('Failed to reject deposit request.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'deposits');
    }
  };

  // D. Approve User Withdrawal
  const handleApproveWithdrawal = async (w: WithdrawalRequest) => {
    if (!currentUser || !userProfile || userProfile.role !== UserRole.ADMIN) return;
    try {
      await updateDoc(doc(db, 'withdrawals', w.id), { status: 'approved' });
      showToast('Withdrawal marked as approved! Please transfer the cash to the user’s bank details.', 'success');
    } catch (error) {
      showToast('Failed to approve withdrawal.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'withdrawals');
    }
  };

  // E. Reject User Withdrawal (Refunds funds back to their wallet!)
  const handleRejectWithdrawal = async (w: WithdrawalRequest) => {
    if (!currentUser || !userProfile || userProfile.role !== UserRole.ADMIN) return;
    try {
      // 1. Reject request
      await updateDoc(doc(db, 'withdrawals', w.id), { status: 'rejected' });

      // 2. Refund balance back to user profile
      const targetUserRef = doc(db, 'users', w.userId);
      const targetSnap = await getDoc(targetUserRef);
      if (targetSnap.exists()) {
        const targetProfile = targetSnap.data() as UserProfile;
        await updateDoc(targetUserRef, {
          balance: targetProfile.balance + w.amount,
        });

        // 3. Log transaction credit refund
        const transId = 'refund_' + Math.random().toString(36).substring(2, 9);
        await setDoc(doc(db, 'transactions', transId), {
          id: transId,
          userId: w.userId,
          amount: w.amount,
          type: 'deposit',
          description: `Refund: Withdrawal payout rejected (${w.bankName})`,
          createdAt: new Date().toISOString(),
        });
      }

      showToast('Withdrawal rejected. Funds have been refunded to user wallet.', 'info');
    } catch (error) {
      showToast('Failed to reject withdrawal.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'withdrawals');
    }
  };

  // F. Direct Balance Adjustments for Users
  const handleAdjustUserBalance = async (userId: string, amount: number) => {
    if (!currentUser || !userProfile || userProfile.role !== UserRole.ADMIN) return;
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        const newBal = profile.balance + amount;
        
        await updateDoc(userRef, { balance: Math.max(0, newBal) });

        const transId = 'adjust_' + Math.random().toString(36).substring(2, 9);
        await setDoc(doc(db, 'transactions', transId), {
          id: transId,
          userId,
          amount,
          type: amount >= 0 ? 'deposit' : 'withdrawal',
          description: `Administrator manual balance adjustment`,
          createdAt: new Date().toISOString(),
        });
        showToast(`User balance adjusted by ₦${amount.toLocaleString()} successfully!`, 'success');
      }
    } catch (error) {
      showToast('Failed to adjust user balance.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  // Render Loader if app is boot checking
  if (appLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white font-mono space-y-4">
        <Cpu className="w-10 h-10 text-lime-500 animate-spin" />
        <span className="text-xs uppercase tracking-widest text-zinc-400">Booting NVIDIA AI Compute leasing platform...</span>
      </div>
    );
  }

  return (
    <div className="bg-black text-zinc-100 min-h-screen selection:bg-lime-500 selection:text-black font-sans antialiased">
      {/* Header */}
      <NvidiaHeader
        user={userProfile}
        prices={prices}
        onLogout={handleLogout}
        onOpenAuth={() => setAuthModalOpen(true)}
        onNavigateToAdmin={() => setIsAdminMode(true)}
        onNavigateToHome={() => setIsAdminMode(false)}
        isAdminMode={isAdminMode}
      />

      {/* Main workspace */}
      <main className="pb-24">
        {isAdminMode && userProfile?.role === UserRole.ADMIN ? (
          <AdminPanel
            settings={settings}
            users={allUsers}
            deposits={allDeposits}
            withdrawals={allWithdrawals}
            investments={allInvestments}
            onUpdateSettings={handleUpdateSettings}
            onApproveDeposit={handleApproveDeposit}
            onRejectDeposit={handleRejectDeposit}
            onApproveWithdrawal={handleApproveWithdrawal}
            onRejectWithdrawal={handleRejectWithdrawal}
            onAdjustUserBalance={handleAdjustUserBalance}
          />
        ) : (
          <div className="space-y-6">
            {/* If user is logged in, show their high-yield bento dashboard directly */}
            {userProfile ? (
              <UserDashboard
                user={userProfile}
                settings={settings}
                investments={userInvestments}
                deposits={userDeposits}
                withdrawals={userWithdrawals}
                transactions={userTransactions}
                referralCounts={referralCounts}
                onNewDeposit={handleNewDeposit}
                onNewWithdrawal={handleNewWithdrawal}
                onClaimDailyBonus={handleClaimDailyBonus}
                onUpdateBankDetails={handleUpdateBankDetails}
                onUpdateSavedBanks={handleUpdateSavedBanks}
                onUpdatePassword={handleUpdatePassword}
                onLogout={handleLogout}
                onInvest={handlePurchasePlan}
                loadingDaily={loadingDaily}
              />
            ) : (
              /* If public visitor, show marketing hero and core offerings */
              <>
                <HeroSection
                  onExplorePlans={() => {
                    const elem = document.getElementById('plans-section');
                    elem?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  onOpenAuth={() => setAuthModalOpen(true)}
                  isLoggedIn={false}
                  minDeposit={settings.minDeposit}
                  welcomeBonus={settings.welcomeBonus}
                />
                
                {/* Visual Section: Why Nvidia Lease? */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                  <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-xl space-y-3">
                    <div className="w-10 h-10 bg-lime-500/10 border border-lime-500/30 rounded-lg flex items-center justify-center text-lime-400 font-bold font-mono">1</div>
                    <h3 className="font-bold text-base text-white">All details real-time</h3>
                    <p className="text-xs text-zinc-400">No outdated stats. See actual NVIDIA stock performance and your profit balances update live second by second.</p>
                  </div>
                  <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-xl space-y-3">
                    <div className="w-10 h-10 bg-lime-500/10 border border-lime-500/30 rounded-lg flex items-center justify-center text-lime-400 font-bold font-mono">2</div>
                    <h3 className="font-bold text-base text-white">Simple English</h3>
                    <p className="text-xs text-zinc-400">No complex finance words. Easy explanation of how server renting returns high yields. Accessible for everyone.</p>
                  </div>
                  <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-xl space-y-3">
                    <div className="w-10 h-10 bg-lime-500/10 border border-lime-500/30 rounded-lg flex items-center justify-center text-lime-400 font-bold font-mono">3</div>
                    <h3 className="font-bold text-base text-white">3-Level Invitations</h3>
                    <p className="text-xs text-zinc-400">Share your custom link. Get paid immediately when friends, or friends of friends, start leasing server nodes.</p>
                  </div>
                </div>
              </>
            )}

            {/* Render interactive plan calculator for everyone */}
            <InvestmentPlans
              plans={STATIC_PLANS}
              user={userProfile}
              onInvest={handlePurchasePlan}
              onOpenAuth={() => setAuthModalOpen(true)}
              minDeposit={settings.minDeposit}
            />
          </div>
        )}
      </main>

      {/* Footer footer */}
      <footer className="border-t border-zinc-900 bg-black py-10 text-center text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <p className="flex items-center justify-center gap-1.5 uppercase text-[10px] tracking-widest text-lime-500">
            <UserCheck className="w-4 h-4" /> SECURED BY FIREBASE ENTERPRISE ENCRYPTION
          </p>
          <p>© 2026 NVIDIA Green Compute Leasing Corporation. All rights reserved.</p>
          <p className="text-[9px] text-zinc-600 max-w-lg mx-auto">
            Disclamer: GPU leasing simulation is backed by high-yield platform pools. Principal deposits are secured under security protocol regulations.
          </p>
        </div>
      </footer>

      {/* Authentication Gateway popup */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        welcomeBonus={settings.welcomeBonus}
        initialRefCode={initialRefCode}
      />
    </div>
  );
}
