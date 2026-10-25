import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type UserRole = 'admin' | 'auditor' | 'sales_agent' | 'sales_rep' | 'sales' | 'store_keeper';

export interface CustomUser {
  username: string;
  name: string;
  role: UserRole;
  phone?: string;
  pricingTier?: 'bronze' | 'silver' | 'gold';
}

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  isAdmin: boolean;
  isAuditor: boolean;
  isSalesAgent: boolean;
  isSalesRep: boolean;
  isStoreKeeper: boolean;
  canViewWholesale: boolean;
  canViewCommission: boolean;
  hasPackages: boolean;
  login: (username: string, pin: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  isAdmin: false, 
  isAuditor: false,
  isSalesAgent: false,
  isSalesRep: false,
  isStoreKeeper: false,
  canViewWholesale: false,
  canViewCommission: false,
  hasPackages: false,
  login: async () => {}, 
  logout: () => {} 
});

const resolveRole = (role: string | undefined, username: string): UserRole => {
  const normU = username.toLowerCase().trim();
  const normR = (role || '').toLowerCase().trim();
  if (normU === 'admin' || normR === 'admin') return 'admin';
  if (normU === 'auditor' || normR === 'auditor') return 'auditor';
  if (normU === 'storekeeper' || normU === 'store_keeper' || normR === 'store_keeper') return 'store_keeper';
  if (normR === 'sales_rep') return 'sales_rep';
  if (normR === 'sales_agent' || normR === 'sales') return 'sales_agent';
  return normR as UserRole || 'sales_agent';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CustomUser | null>(() => {
    try {
      if (typeof window === 'undefined') return null;
      const stored = localStorage.getItem('gcis_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && typeof parsed.username === 'string' && parsed.username.trim().length > 0) {
          const uName = parsed.username.toLowerCase().trim();
          const role = resolveRole(parsed.role, uName);
          return {
            username: uName,
            name: parsed.name || parsed.username,
            role,
            phone: parsed.phone || '',
            pricingTier: parsed.pricingTier || 'bronze'
          };
        }
        localStorage.removeItem('gcis_user');
      }
    } catch (e) {
      console.error("Auth init error:", e);
      try { localStorage.removeItem('gcis_user'); } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  const safeStoreUser = (userData: CustomUser) => {
    try {
      localStorage.setItem('gcis_user', JSON.stringify(userData));
    } catch {
      try {
        // Clear cached products or stale keys if quota was exceeded
        localStorage.removeItem('gcis_cached_products');
        localStorage.setItem('gcis_user', JSON.stringify(userData));
      } catch {}
    }
  };

  const login = async (username: string, pin: string) => {    
    const normalized = username.toLowerCase().trim();
    
    // Default master admin fallback
    if (normalized === 'admin' && (pin === '123456' || pin === 'admin')) {
      const userData: CustomUser = { username: 'admin', role: 'admin', name: 'Administrator' };
      setUser(userData);
      safeStoreUser(userData);
      return;
    }

    try {
      const { data: supaUser, error: supaErr } = await supabase
        .from('users')
        .select('*')
        .eq('username', normalized)
        .maybeSingle();

      if (supaErr) {
        throw new Error(supaErr.message || "Failed to communicate with authentication database.");
      }

      if (supaUser) {
        if (supaUser.pin === pin) {
          const role = resolveRole(supaUser.role, normalized);
          const userData: CustomUser = { 
            username: normalized, 
            role, 
            name: supaUser.name || normalized,
            phone: supaUser.phone || '',
            pricingTier: (supaUser.pricing_tier as any) || 'bronze'
          };
          setUser(userData);
          safeStoreUser(userData);
          return;
        } else {
          throw new Error("Incorrect PIN.");
        }
      }

      throw new Error("User not found.");
    } catch (error: any) {
      console.warn("Login error:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('gcis_user');
      localStorage.removeItem('gcis_session_id');
    } catch {}
  };

  const isAdmin = user?.role === 'admin';
  const isAuditor = user?.role === 'auditor';
  const isSalesRep = user?.role === 'sales_rep';
  const isSalesAgent = user?.role === 'sales_agent' || (user?.role === 'sales' && !isSalesRep);
  const isStoreKeeper = user?.role === 'store_keeper';
  
  // Sales Rep gets to see ONLY the unit price because they are staff paid salaries so they don't need wholesale prices
  const canViewWholesale = isAdmin || isAuditor || isSalesAgent || isStoreKeeper;
  // Sales Agent has access to the commission
  const canViewCommission = isAdmin || isAuditor || isSalesAgent;
  // Sales Agent has access to the packages of Bronze, Silver, Gold
  const hasPackages = isAdmin || isSalesAgent || isStoreKeeper;

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAdmin, 
      isAuditor, 
      isSalesAgent, 
      isSalesRep, 
      isStoreKeeper,
      canViewWholesale, 
      canViewCommission, 
      hasPackages,
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
