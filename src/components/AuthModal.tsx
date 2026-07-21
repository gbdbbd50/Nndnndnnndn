import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Sparkles, Key, Shield } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  welcomeBonus: number;
  initialRefCode?: string;
}

export default function AuthModal({ isOpen, onClose, welcomeBonus, initialRefCode = '' }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(!!initialRefCode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(initialRefCode);
  const [hasReferral, setHasReferral] = useState(!!initialRefCode);
  const [isReferralValid, setIsReferralValid] = useState<boolean | null>(initialRefCode ? true : null);
  const [checkingReferral, setCheckingReferral] = useState(false);
  const [sponsorEmail, setSponsorEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Trigger automatic referral check if initialRefCode is loaded
  useEffect(() => {
    if (initialRefCode) {
      setReferralCode(initialRefCode);
      setHasReferral(true);
      setIsSignUp(true);
      verifyReferralCode(initialRefCode);
    }
  }, [initialRefCode]);

  // Validates a referral code by querying users collection
  const verifyReferralCode = async (code: string) => {
    if (!code.trim()) {
      setIsReferralValid(null);
      setSponsorEmail(null);
      return;
    }
    setCheckingReferral(true);
    setError(null);
    try {
      const cleanCode = code.trim().toUpperCase();
      
      // 1. Direct UID document match
      const parentSnap = await getDoc(doc(db, 'users', code.trim()));
      if (parentSnap.exists()) {
        setIsReferralValid(true);
        setSponsorEmail(parentSnap.data().email);
        return;
      }

      // 2. Short code query match
      const q = query(collection(db, 'users'), where('referralCode', '==', cleanCode));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const sponsorDoc = qSnap.docs[0];
        setIsReferralValid(true);
        setSponsorEmail(sponsorDoc.data().email);
      } else {
        setIsReferralValid(false);
        setSponsorEmail(null);
      }
    } catch (e) {
      console.warn('Sponsor validation query failed', e);
      setIsReferralValid(false);
      setSponsorEmail(null);
    } finally {
      setCheckingReferral(false);
    }
  };

  if (!isOpen) return null;

  // Handles normal email password login
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up logic
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const { user } = userCredential;

        // Generate a 6 character referral code
        const myReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        let parentUid = '';
        let level2Uid = '';
        let level3Uid = '';

        // If a referral code was submitted, find the parent
        if (hasReferral) {
          if (!referralCode.trim()) {
            setError('Please enter a referral code or uncheck the "I have a referral code" checkbox.');
            setLoading(false);
            return;
          }
          const cleanCode = referralCode.trim().toUpperCase();
          let parentSnap = await getDoc(doc(db, 'users', referralCode.trim()));
          let sponsorData: any = null;

          if (parentSnap.exists()) {
            sponsorData = parentSnap.data();
          } else {
            const q = query(collection(db, 'users'), where('referralCode', '==', cleanCode));
            const qSnap = await getDocs(q);
            if (!qSnap.empty) {
              sponsorData = qSnap.docs[0].data();
            }
          }

          if (sponsorData) {
            parentUid = sponsorData.uid;
            level2Uid = sponsorData.referredBy || '';
            level3Uid = sponsorData.referredByLevel2 || '';
          } else {
            setError('The referral code entered is invalid. Please verify the code first or uncheck the referral box.');
            setLoading(false);
            return;
          }
        }

        // Create standard User profile
        const isDefaultAdmin = email.toLowerCase() === 'gbdbbd50@gmail.com';
        const userProfile = {
          uid: user.uid,
          email: user.email || email,
          role: isDefaultAdmin ? UserRole.ADMIN : UserRole.USER,
          balance: welcomeBonus, // User/Admin starts with welcome bonus set by admin (defaulting to 0)
          referralCode: user.uid.substring(0, 6).toUpperCase(), // Use start of UID as easy unique code
          referredBy: parentUid,
          referredByLevel2: level2Uid,
          referredByLevel3: level3Uid,
          welcomeBonusClaimed: true,
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'users', user.uid), userProfile);

        // Also log a transaction for the Welcome Bonus if it's a standard user
        if (!isDefaultAdmin && welcomeBonus > 0) {
          const transId = 'welcome_' + Math.random().toString(36).substring(2, 9);
          await setDoc(doc(db, 'transactions', transId), {
            id: transId,
            userId: user.uid,
            amount: welcomeBonus,
            type: 'bonus',
            description: 'New member welcome bonus',
            createdAt: new Date().toISOString()
          });
        }
      } else {
        // Sign in logic
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email. Click "Sign Up" above.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" id="auth-modal-wrapper">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden relative shadow-[0_0_50px_rgba(118,185,0,0.25)]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lime-500 to-emerald-500" />
        
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-zinc-900 bg-zinc-900/40">
          <div className="text-left">
            <h3 className="text-lg font-sans font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="w-5 h-5 text-lime-500 animate-pulse" />
              {isSignUp ? 'New Account (Sign Up)' : 'Welcome Back (Sign In)'}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">Simple English login. Safe and encrypted.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 text-zinc-500 hover:text-white border border-zinc-800 hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Area */}
        <form onSubmit={handleAuthSubmit} className="p-6 space-y-4 text-left">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs font-mono text-red-400">
              ⚠️ {error}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider block">Email Address:</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Mail className="w-4 h-4" /></span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 font-mono"
                placeholder="example@gmail.com"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider block">Secret Password:</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Lock className="w-4 h-4" /></span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 font-mono"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Referral checkbox and field (Sign Up only) */}
          {isSignUp && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="has-referral"
                  checked={hasReferral}
                  onChange={(e) => {
                    setHasReferral(e.target.checked);
                    if (!e.target.checked) {
                      setReferralCode('');
                      setIsReferralValid(null);
                      setSponsorEmail(null);
                    }
                  }}
                  className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-lime-500 focus:ring-lime-500 cursor-pointer"
                />
                <label htmlFor="has-referral" className="text-xs text-zinc-400 font-mono select-none cursor-pointer">
                  I have a referral code
                </label>
              </div>

              {hasReferral && (
                <div className="space-y-2 p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                    Referral / Sponsor Code:
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={referralCode}
                        onChange={(e) => {
                          setReferralCode(e.target.value);
                          setIsReferralValid(null);
                          setSponsorEmail(null);
                        }}
                        className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-lime-500 font-mono"
                        placeholder="e.g. SPONSOR_UID"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={checkingReferral || !referralCode.trim()}
                      onClick={() => verifyReferralCode(referralCode)}
                      className="px-3 bg-zinc-900 border border-zinc-800 hover:border-lime-500 rounded-lg text-[10px] font-mono uppercase font-bold text-white transition-all cursor-pointer disabled:opacity-50"
                    >
                      {checkingReferral ? 'Checking...' : 'Verify'}
                    </button>
                  </div>

                  {/* Verification status display */}
                  {isReferralValid === true && (
                    <p className="text-[10px] font-mono text-lime-400 flex items-center gap-1 bg-lime-950/20 p-2 rounded border border-lime-500/20">
                      ✅ Sponsor valid: <span className="font-sans font-bold">{sponsorEmail}</span>
                    </p>
                  )}
                  {isReferralValid === false && (
                    <p className="text-[10px] font-mono text-red-400 flex items-center gap-1 bg-red-950/20 p-2 rounded border border-red-500/20">
                      ❌ Invalid code. Please enter a valid Sponsor ID or uncheck the referral box.
                    </p>
                  )}
                  {isReferralValid === null && referralCode.trim() && (
                    <p className="text-[9px] font-mono text-zinc-500">
                      ⚠️ Please click 'Verify' to validate this referral code before signing up.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-lime-500 hover:bg-lime-400 text-black font-black text-xs uppercase rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(118,185,0,0.2)] tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? 'Please Wait...' : isSignUp ? 'Register Account' : 'Login Securely'}
          </button>

          {/* Toggle between register and login */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-zinc-400 hover:text-white transition underline focus:outline-none"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Do not have an account? Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
