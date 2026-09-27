import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface CustomUser {
  username: string;
  name: string;
  role: 'admin' | 'sales';
  phone?: string;
  pricingTier?: 'bronze' | 'silver' | 'gold';
}

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  isAdmin: boolean;
  login: (username: string, pin: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  isAdmin: false, 
  login: async () => {}, 
  logout: () => {} 
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CustomUser | null>(() => {
    try {
      if (typeof window === 'undefined') return null;
      const stored = localStorage.getItem('gcis_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && typeof parsed.username === 'string' && parsed.username.trim().length > 0) {
          return {
            username: parsed.username.toLowerCase().trim(),
            name: parsed.name || parsed.username,
            role: parsed.role === 'admin' ? 'admin' : 'sales',
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
    const userDoc = await getDoc(doc(db, 'users', normalized));
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.pin === pin) {
        const userData: CustomUser = { 
          username: normalized, 
          role: data.role === 'admin' ? 'admin' : 'sales', 
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
      // Bootstrap the first admin account
      if (normalized === 'admin' && pin === '123456') {
        const userData: CustomUser = { username: 'admin', role: 'admin', name: 'Administrator' };
        await setDoc(doc(db, 'users', 'admin'), { ...userData, pin, createdAt: new Date().toISOString() });
        setUser(userData);
        localStorage.setItem('gcis_user', JSON.stringify(userData));
      } else {
        throw new Error("User not found.");
      }
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('gcis_user');
    } catch {}
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
