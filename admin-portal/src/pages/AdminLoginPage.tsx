import React, { useState } from 'react';
import { Radio, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminUser } from '../types';

interface AdminLoginPageProps {
  onLoginSuccess: (user: AdminUser) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin.dispatch@metropol.gov');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter your official administrator credentials.');
      return;
    }

    setIsLoading(true);

    // Mock Admin Authentication (Ready for FastAPI integration)
    setTimeout(() => {
      const user: AdminUser = {
        id: 'admin-hq-01',
        name: 'Inspector R. Sterling',
        email,
        department_code: 'ALL',
        badge_number: 'HQ-DISPATCH-9901',
        role: 'SUPER_ADMIN'
      };

      localStorage.setItem('civic_admin_user', JSON.stringify(user));
      onLoginSuccess(user);
      navigate('/');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-sky-500 p-0.5 shadow-2xl shadow-indigo-500/30 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
            <Radio className="w-7 h-7 text-indigo-400" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Department & Admin Command Login
        </h2>
        <p className="text-xs text-slate-400">
          Authorized access for First Responders, Police Dispatchers, and Municipal Engineers.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900/90 border border-slate-800 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl space-y-6 backdrop-blur-md">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Official Department Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="officer@department.gov"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Security Passcode
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2"
            >
              <span>{isLoading ? 'Verifying Department Clearance...' : 'Login to Admin Command Center'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Clean Citizen Portal Link (No registration button on Admin Login) */}
          <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
            <span>Are you a citizen filing a report or SOS? </span>
            <a
              href="http://localhost:3000/login"
              className="font-bold text-sky-400 hover:text-sky-300 underline block mt-1"
            >
              Go to Citizen Portal (Port 3000) →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
