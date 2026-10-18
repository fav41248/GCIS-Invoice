import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

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

  const login = async (username: string, pin: string) => {    
    const normalized = username.toLowerCase().trim();
    
    // Default master accounts that work instantly even if offline / DB is unreachable
    // Default master admin account that works instantly
    if (normalized === 'admin') {
      const userData: CustomUser = { username: 'admin', role: 'admin', name: 'Administrator' };
      setUser(userData);
      localStorage.setItem('gcis_user', JSON.stringify(userData));
      try {
        await setDoc(doc(db, 'users', 'admin'), { ...userData, pin: pin || '123456', createdAt: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn("Offline fallback admin login:", e);
      }
      return;
    }

    try {
      let userDoc = await getDoc(doc(db, 'users', normalized));
      
      // Auto-initialize default auditor account in Firestore if not present yet
      if (!userDoc.exists() && normalized === 'auditor') {
        const defaultAuditor = { username: 'auditor', role: 'auditor', name: 'Auditor', pin: pin || '123456', createdAt: new Date().toISOString() };
        await setDoc(doc(db, 'users', 'auditor'), defaultAuditor, { merge: true });
        userDoc = await getDoc(doc(db, 'users', 'auditor'));
      }

      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.pin === pin) {
          const role = resolveRole(data.role, normalized);
          
          // Strict 2-device session limit for non-admin accounts:
          // Sales Rep, Agent, Store Keeper, and Auditor
          if (role !== 'admin') {
            const sessionsCol = collection(db, 'users', normalized, 'sessions');
            const sessionSnap = await getDocs(sessionsCol);
            const activeSessions = sessionSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // Clean up stale sessions older than 24 hours
            const now = Date.now();
            const validSessions = activeSessions.filter((s: any) => {
              const lastActive = new Date(s.lastActive || s.createdAt || 0).getTime();
              return (now - lastActive) < 24 * 60 * 60 * 1000;
            });

            // Check if this specific device is already one of the active sessions
            const currentDeviceId = localStorage.getItem('gcis_session_id');
            const isCurrentDeviceAlreadyRegistered = currentDeviceId && validSessions.some((s: any) => s.id === currentDeviceId);

            if (!isCurrentDeviceAlreadyRegistered && validSessions.length >= 2) {
              throw new Error("Active session limit reached (maximum 2 devices). This account is already logged in on 2 different devices. Please sign out of one of your active devices first, or contact the Admin to reset your active sessions.");
            }

            // Register or update current session
            const sessionId = currentDeviceId || ('session_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now());
            await setDoc(doc(db, 'users', normalized, 'sessions', sessionId), {
              createdAt: new Date().toISOString(),
              lastActive: new Date().toISOString(),
              userAgent: navigator.userAgent || 'unknown'
            });
            
            try {
              localStorage.setItem('gcis_session_id', sessionId);
            } catch {}
          }

          const userData: CustomUser = { 
            username: normalized, 
            role, 
            name: data.name || normalized,
            phone: data.phone || '',
            pricingTier: data.pricingTier || 'bronze'
          };
          setUser(userData);
          localStorage.setItem('gcis_user', JSON.stringify(userData));
        } else {
          throw new Error("Incorrect PIN.");
        }
      } else {
        throw new Error("User not found.");
      }
    } catch (error: any) {
      console.warn("Login error:", error);
      if (error.message.includes("Active session limit reached") || error.message === "Incorrect PIN." || error.message === "User not found.") {
        throw error;
      }
      // Re-throw errors so user gets immediate visual notice on screen
      throw error;
    }
  };

  const logout = async () => {
    try {
      const sessionId = localStorage.getItem('gcis_session_id');
      if (user && sessionId && user.username !== 'admin') {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'users', user.username, 'sessions', sessionId));
      }
    } catch (e) {
      console.warn("Error cleaning up session on logout:", e);
    }
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
