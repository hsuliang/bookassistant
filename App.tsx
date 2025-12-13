import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import { BookingWizard } from './components/BookingWizard';
import { AdminDashboard } from './components/AdminDashboard';
import { ADMIN_PASSWORD } from './constants';
import { StorageService } from './services/storageService';
import { Lock } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'public' | 'admin'>('public');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  useEffect(() => {
    // Initialize demo data if empty (Async now)
    const init = async () => {
        try {
            await StorageService.seedData();
        } catch (e) {
            console.error("Initialization failed (likely due to missing Firebase config)", e);
        }
    };
    init();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const AdminLogin = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-indigo-100 rounded-full">
            <Lock size={32} className="text-indigo-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">管理端後台登入</h2>
        <p className="text-center text-slate-500 mb-6">請輸入管理密碼以存取後台資料</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="password"
              className="w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="請輸入密碼 (預設: admin)"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
            />
            {loginError && <p className="text-red-500 text-sm mt-2 ml-1">密碼錯誤，請重試。</p>}
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all"
          >
            登入系統
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'public' ? (
        <BookingWizard />
      ) : (
        isAdminAuthenticated ? <AdminDashboard /> : <AdminLogin />
      )}
    </Layout>
  );
};

export default App;
