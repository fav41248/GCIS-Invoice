import React, { useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { LayoutDashboard, FileText, Users, Settings, LogOut, FilePlus, UserCog, BookOpen, Tag } from 'lucide-react';
import InvoiceGenerator from './pages/InvoiceGenerator';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Clients from './pages/Clients';
import CompanySettings from './pages/Settings';
import ReceiptView from './pages/ReceiptView';
import UsersPage from './pages/Users';
import KnowledgeBank from './pages/KnowledgeBank';
import PriceList from './pages/PriceList';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'New Invoice', path: '/generator', icon: FilePlus },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Price List', path: '/price-list', icon: Tag },
    ...(isAdmin ? [
      { name: 'Knowledge Bank', path: '/knowledge', icon: BookOpen },
      { name: 'Sales Reps', path: '/users', icon: UserCog },
      { name: 'Settings', path: '/settings', icon: Settings }
    ] : []),
  ];

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-[#212529] font-sans overflow-hidden">
      <aside className="w-64 bg-[#0F5132] text-white flex flex-col print:hidden shrink-0">
        <div className="p-6 border-b border-[#198754]">
           <div className='flex items-center gap-3'>
            <div className='bg-white p-1 rounded shrink-0'>
              <img src="https://res.cloudinary.com/duwpkzkg1/image/upload/Green_Collar_qf1snd.png" alt="Green Collar Logo" className='w-8 h-8 object-contain rounded-sm' />
            </div>
            <h1 className='text-lg font-bold tracking-tight leading-tight'>Admin Portal</h1>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
             <Link
               key={item.path}
               to={item.path}
               className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${location.pathname === item.path ? 'bg-[#198754] text-white' : 'text-[#D1E7DD] hover:bg-[#198754]/50 hover:text-white'}`}
             >
               <item.icon className="w-5 h-5" />
               {item.name}
             </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-[#198754]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{user?.username?.charAt(0).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
               <p className="text-sm font-medium truncate">{user?.name}</p>
               <p className="text-xs text-[#D1E7DD]">@{user?.username}</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-[#D1E7DD] hover:text-white hover:bg-[#198754]/50 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto print:overflow-visible relative flex flex-col">
         {children}
      </main>
    </div>
  );
};

export default function App() {
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoggingIn(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setAuthError(err.message || 'Invalid credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#F8F9FA]">Loading...</div>;

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FA] p-4">
         <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full border border-gray-100 text-center">
            <div className='w-16 h-16 mx-auto mb-6 bg-white p-1 rounded-lg border border-gray-100 shadow-sm'>
              <img src="https://res.cloudinary.com/duwpkzkg1/image/upload/Green_Collar_qf1snd.png" alt="Green Collar Logo" className='w-full h-full object-contain' />
            </div>
            <h1 className="text-2xl font-bold mb-2">GCIS Portal Login</h1>
            <p className="text-gray-500 mb-8 text-sm">Sign in to access the invoice generator.</p>
            
            {authError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">{authError}</div>}

            <form onSubmit={handleEmailLogin} className="space-y-4 mb-6 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                <input 
                  type="text" 
                  required 
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">PIN / Password</label>
                <input 
                  type="password" 
                  required 
                  className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#198754] outline-none" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
              </div>
              <button 
                type="submit" 
                disabled={isLoggingIn}
                className="w-full bg-[#198754] text-white py-2.5 rounded-lg font-bold hover:bg-[#0F5132] transition-colors mt-2"
              >
                 {isLoggingIn ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
         </div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/generator" element={<InvoiceGenerator />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/price-list" element={<PriceList />} />
        <Route path="/knowledge" element={<KnowledgeBank />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<CompanySettings />} />
        <Route path="/receipt/:id" element={<ReceiptView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
