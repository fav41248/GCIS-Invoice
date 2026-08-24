const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// The new App layout
const newAppLayout = `import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, FileText, FilePlus, Users, Tag, Settings, LogOut, BookOpen, UserCog, Menu, X, Sparkles } from 'lucide-react';
import { useAuth } from './AuthContext';
import Dashboard from './pages/Dashboard';
import InvoiceGenerator from './pages/InvoiceGenerator';
import Invoices from './pages/Invoices';
import Clients from './pages/Clients';
import PriceList from './pages/PriceList';
import KnowledgeBank from './pages/KnowledgeBank';
import UsersPage from './pages/Users';
import CompanySettings from './pages/Settings';
import ReceiptView from './pages/ReceiptView';
import InvoiceView from './pages/InvoiceView';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen print:h-auto bg-zinc-50 print:bg-white text-zinc-900 font-sans overflow-hidden flex-col md:flex-row antialiased selection:bg-emerald-200 selection:text-emerald-900">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-white border-b border-zinc-200 text-zinc-900 p-4 flex justify-between items-center shrink-0 print:hidden z-30">
        <div className='flex items-center gap-3'>
          <div className='bg-zinc-50 p-1.5 rounded-lg border border-zinc-200 shrink-0'>
            <img src="https://res.cloudinary.com/duwpkzkg1/image/upload/Green_Collar_qf1snd.png" alt="Green Collar Logo" className='w-6 h-6 object-contain' />
          </div>
          <h1 className='text-base font-bold tracking-tight text-zinc-800'>GCIS Portal</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-20 md:hidden transition-opacity" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={\`
        fixed md:static inset-y-0 left-0 z-30
        w-64 bg-white text-zinc-600 flex flex-col print:hidden shrink-0 border-r border-zinc-200
        transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        \${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      \`}>
        <div className="p-6 hidden md:flex items-center gap-3 mt-2">
          <div className='bg-zinc-50 p-2 rounded-xl border border-zinc-200 shadow-sm shrink-0'>
            <img src="https://res.cloudinary.com/duwpkzkg1/image/upload/Green_Collar_qf1snd.png" alt="Green Collar Logo" className='w-8 h-8 object-contain' />
          </div>
          <div>
            <h1 className='text-sm font-bold tracking-tight text-zinc-900'>GCIS Portal</h1>
            <p className='text-[10px] uppercase font-bold tracking-widest text-emerald-600 mt-0.5 flex items-center gap-1'><Sparkles className="w-3 h-3" /> Test Mode</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={\`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 \${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-inset ring-emerald-600/20' 
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                }\`}
              >
                <item.icon className={\`w-5 h-5 \${isActive ? 'text-emerald-600' : 'text-zinc-400'}\`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 m-4 bg-zinc-50 border border-zinc-200 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-white shadow-sm border border-zinc-200 rounded-full flex items-center justify-center text-sm font-bold text-zinc-700 shrink-0">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-900 truncate">{user?.name}</p>
              <p className="text-xs text-zinc-500 font-medium">@{user?.username}</p>
            </div>
          </div>
          <button 
            onClick={logout} 
            className="flex items-center justify-center gap-2 w-full py-2 text-xs font-bold text-zinc-600 bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 rounded-lg transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto print:overflow-visible relative flex flex-col scroll-smooth">
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
    } catch (err) {
      setAuthError(err.message || 'Invalid credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-zinc-50 text-zinc-500 font-medium">Loading workspace...</div>;

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 p-4 antialiased">
        <div className="bg-white p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-md w-full border border-zinc-100 text-center">
          <div className='w-20 h-20 mx-auto mb-8 bg-zinc-50 p-3 rounded-2xl border border-zinc-100 shadow-inner'>
            <img src="https://res.cloudinary.com/duwpkzkg1/image/upload/Green_Collar_qf1snd.png" alt="Green Collar Logo" className='w-full h-full object-contain' />
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight mb-2">Welcome Back</h1>
          <p className="text-zinc-500 mb-8 text-sm font-medium">Sign in to access the GCIS workspace.</p>
          
          {authError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium mb-6 border border-red-100 flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
              {authError}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-5 text-left">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Username</label>
              <input 
                type="text" 
                required 
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-sm font-medium text-zinc-900 focus:bg-white focus:ring-4 focus:ring-emerald-600/10 focus:border-emerald-500 outline-none transition-all"
                value={username} 
                onChange={e => setUsername(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">PIN / Password</label>
              <input 
                type="password" 
                required 
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-sm font-medium text-zinc-900 focus:bg-white focus:ring-4 focus:ring-emerald-600/10 focus:border-emerald-500 outline-none transition-all"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-600/20 transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-600/20"
            >
              {isLoggingIn ? 'Authenticating...' : 'Sign In'}
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
        <Route path="/invoice/:id" element={<InvoiceView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
`;

fs.writeFileSync('src/App.tsx', newAppLayout);
