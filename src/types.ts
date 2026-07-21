export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export interface SavedBank {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  balance: number;
  referralCode: string;
  referredBy?: string; // UID of level 1 sponsor
  referredByLevel2?: string; // UID of level 2 sponsor
  referredByLevel3?: string; // UID of level 3 sponsor
  welcomeBonusClaimed?: boolean;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  savedBanks?: SavedBank[];
  createdAt: string;
}

export interface PlatformSettings {
  id: string;
  referralRewardL1: number; // e.g. 10 for 10%
  referralRewardL2: number; // e.g. 5 for 5%
  referralRewardL3: number; // e.g. 2 for 2%
  minDeposit: number; // e.g. 20
  minWithdrawal: number; // e.g. 10
  welcomeBonus: number; // e.g. 5
  signBonus: number; // e.g. 1 (Daily sign bonus)
  paystackPublicKey?: string;
  paystackSecretKey?: string;
  manualDepositEnabled?: boolean;
  manualDepositBankName?: string;
  manualDepositAccountNumber?: string;
  manualDepositAccountName?: string;
  updatedAt: string;
}

export interface InvestmentPlan {
  id: string;
  name: string;
  dailyProfitPercent: number;
  minAmount: number;
  maxAmount: number;
  durationDays: number;
  description: string;
}

export interface UserInvestment {
  id: string;
  userId: string;
  planName: string;
  amount: number;
  dailyProfitPercent: number;
  totalEarnings: number;
  status: 'active' | 'completed';
  createdAt: string;
  lastTickedAt: string;
}

export interface DepositRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  reference: string;
  senderName?: string;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface TransactionLog {
  id: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'bonus' | 'referral_reward';
  description: string;
  createdAt: string;
}

export interface RealTimePrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}
