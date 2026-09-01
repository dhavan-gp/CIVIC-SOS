import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, Mail, ArrowRight, UserPlus, AlertCircle, CheckCircle, Settings, Server, X, Wifi } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { CitizenUser } from '../types';
import { getApiBase, setCustomApiBase, checkServerHealth, autoDiscoverServerUrl } from '../services/api';

interface CitizenLoginPageProps {
  onLoginSuccess: (user: CitizenUser) => void;
}

const DEMO_CITIZENS: CitizenUser[] = [
  {
    id: 'cit-dhaval-01',
    name: 'Dhaval Patel',
    email: 'dhaval.patel@citymail.com',
    phone: '+1 (555) 911-7788',
    role: 'CITIZEN'
  },
  {
    id: 'cit-priya-02',
    name: 'Priya Sharma',
    email: 'priya.sharma@citymail.com',
    phone: '+1 (555) 345-6789',
    role: 'CITIZEN'
  },
  {
    id: 'cit-vikram-03',
    name: 'Vikram Mehta',
    email: 'vikram.mehta@citymail.com',
    phone: '+1 (555) 234-8901',
    role: 'CITIZEN'
  },
  {
    id: 'cit-ananya-04',
    name: 'Ananya Roy',
    email: 'ananya.roy@citymail.com',
    phone: '+1 (555) 456-7890',
    role: 'CITIZEN'
  }
];

export const CitizenLoginPage: React.FC<CitizenLoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('dhaval.patel@citymail.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getApiBase() || 'http://10.98.205.26:5000');
  const [isServerHealthy, setIsServerHealthy] = useState<boolean | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    autoDiscoverServerUrl().then(() => {
      checkServerHealth().then(setIsServerHealthy);
    });
  }, []);

  const handleTestAndSave = async (urlToTest?: string | React.MouseEvent) => {
    const targetUrl = typeof urlToTest === 'string' ? urlToTest : serverUrlInput;
    setIsTesting(true);
    setTestResult(null);
    const healthy = await checkServerHealth(targetUrl);
    setIsTesting(false);
    if (healthy) {
      setCustomApiBase(targetUrl);
      setServerUrlInput(targetUrl);
      setIsServerHealthy(true);
      setTestResult({ success: true, message: `Connected to ${targetUrl}!` });
      setTimeout(() => {
        setIsServerModalOpen(false);
        setTestResult(null);
      }, 1000);
    } else {
      setIsServerHealthy(false);
      setTestResult({ success: false, message: `Could not reach ${targetUrl}. Ensure PC is on same Wi-Fi.` });
    }
  };

  const handleQuickLogin = (citizen: CitizenUser) => {
    setEmail(citizen.email);
    setPassword('password123');
    setIsLoading(true);
    setTimeout(() => {
      localStorage.setItem('civic_citizen_user', JSON.stringify(citizen));
      onLoginSuccess(citizen);
      navigate('/');
    }, 300);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    // Explicit Rule: Do not allow admin users to log in through the citizen portal
    if (email.toLowerCase().includes('admin') || email.toLowerCase().includes('police') || email.toLowerCase().includes('officer')) {
      setError('Administrative and Officer accounts cannot access the Citizen Portal. Please use the Admin Portal.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const matched = DEMO_CITIZENS.find(c => c.email.toLowerCase() === email.toLowerCase());
      const user: CitizenUser = matched || {
        id: `cit-${Date.now().toString().slice(-4)}`,
        name: email.split('@')[0].replace('.', ' ').replace(/^\w/, c => c.toUpperCase()) || 'Citizen User',
        email,
        phone: '+1 (555) 911-7788',
        role: 'CITIZEN'
      };

      localStorage.setItem('civic_citizen_user', JSON.stringify(user));
      onLoginSuccess(user);
      navigate('/');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Branding Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3 relative">
        <div className="absolute right-4 top-0">
          <button
            type="button"
            onClick={() => setIsServerModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition shadow"
            title="Configure Backend Server IP"
          >
            <span className={`h-2 w-2 rounded-full ${isServerHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-semibold">{isServerHealthy ? 'Server Live' : 'Check IP'}</span>
            <Settings className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr from-rose-600 via-indigo-600 to-sky-500 p-0.5 shadow-2xl shadow-rose-600/30 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-rose-500" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Citizen Portal Login
        </h2>
        <p className="text-xs text-slate-400">
          Sign in to view your filed complaints, register police FIRs, or trigger 1-Tap SOS.
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 space-y-4">
        {/* 1-Click Citizen Credentials Switcher */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl shadow-xl space-y-2.5 backdrop-blur-md">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
            ⚡ Quick 1-Click Citizen Logins (Isolated Complaints):
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_CITIZENS.map(citizen => (
              <button
                key={citizen.id}
                type="button"
                onClick={() => handleQuickLogin(citizen)}
                className="p-2.5 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 text-left transition space-y-0.5 group"
              >
                <div className="text-xs font-bold text-white group-hover:text-sky-400 transition truncate">
                  {citizen.name}
                </div>
                <div className="text-[10px] text-slate-400 truncate font-mono">
                  {citizen.email.split('@')[0]}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 py-6 px-6 sm:px-10 shadow-2xl rounded-3xl space-y-6 backdrop-blur-md">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Citizen Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@citymail.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-sky-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => alert('Password reset link will be sent to your registered email.')}
                  className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-sky-500 focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-sky-500/20 transition flex items-center justify-center gap-2"
            >
              <span>{isLoading ? 'Signing In...' : 'Login with Credentials'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Registration Button */}
          <div className="pt-4 border-t border-slate-800 text-center space-y-3">
            <div className="text-xs text-slate-400">Don't have a citizen account?</div>
            <Link
              to="/register"
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create New Citizen Account</span>
            </Link>
          </div>

          {/* Clean Admin Portal Redirect Link */}
          <div className="pt-2 text-center text-xs text-slate-400">
            <span>Are you a municipal or police administrator? </span>
            <a
              href="http://localhost:3001/login"
              className="font-bold text-indigo-400 hover:text-indigo-300 underline block mt-1"
            >
              Go to Department Admin Portal (Port 3001) →
            </a>
          </div>
        </div>
      </div>

      {/* Backend Server Modal */}
      {isServerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-750 shadow-2xl p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <Server className="w-4 h-4" />
                <span>Backend Server Configuration</span>
              </div>
              <button
                onClick={() => {
                  setIsServerModalOpen(false);
                  setTestResult(null);
                }}
                className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              When testing the Android APK on a physical phone, enter the local Wi-Fi IP of your PC where the backend server is running.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Backend Server URL
              </label>
              <input
                type="text"
                value={serverUrlInput}
                onChange={e => setServerUrlInput(e.target.value)}
                placeholder="e.g. http://10.98.205.26:5000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Quick One-Tap Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTestAndSave('http://10.0.2.2:5000')}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold transition"
                >
                  📱 Android Emulator (10.0.2.2:5000)
                </button>
                <button
                  type="button"
                  onClick={() => handleTestAndSave('http://10.98.205.26:5000')}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[11px] font-mono font-bold transition"
                >
                  📡 Wi-Fi (10.98.205.26:5000)
                </button>
                <button
                  type="button"
                  onClick={() => handleTestAndSave('http://localhost:5000')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono font-bold transition"
                >
                  💻 Localhost (5000)
                </button>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  testResult.success
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                }`}
              >
                {testResult.success ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />}
                <span>{testResult.message}</span>
              </div>
            )}

            <button
              onClick={() => handleTestAndSave()}
              disabled={isTesting}
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2"
            >
              <Wifi className="w-4 h-4" />
              <span>{isTesting ? 'Testing Server Connection...' : 'Test & Save Server URL'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
