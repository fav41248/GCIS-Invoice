import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface CustomUser {
  username: string;
  name: string;
  role: 'admin' | 'sales';
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
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const stored = localStorage.getItem('gcis_user');
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (username: string, pin: string) => {    
    const normalized = username.toLowerCase().trim();
    const userDoc = await getDoc(doc(db, 'users', normalized));
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.pin === pin) {
        const userData: CustomUser = { username: normalized, role: data.role, name: data.name };
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
    localStorage.removeItem('gcis_user');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
