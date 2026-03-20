import React, { useState } from 'react';
import { Leaf, LogIn, Eye, EyeOff, UserPlus } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        const res = await api.post('/auth/signup', { email, password });
        const { access_token } = res.data;
        localStorage.setItem('auth_token', access_token);
        window.location.reload();
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || (mode === 'login' ? 'Invalid email or password' : 'Failed to create account'));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-700 p-3 rounded-2xl mb-3">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">GreenTrack</h1>
          <p className="text-gray-500 text-sm mt-1">Inventory Assistant</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Enter your email"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent pr-11"
                placeholder={mode === 'signup' ? 'Min 6 characters' : 'Enter your password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={mode === 'signup' ? 6 : undefined}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <LogIn className="w-5 h-5" />
            ) : (
              <UserPlus className="w-5 h-5" />
            )}
            {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button onClick={switchMode} className="text-emerald-700 font-semibold hover:underline">
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}