import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate login delay
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003087] to-[#0F172A] flex items-center justify-center p-4">
      <div className="glass rounded-3xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl mx-auto flex items-center justify-center text-4xl mb-4">
            🚢
          </div>
          <h1 className="text-3xl font-bold text-white">E-Konek Occi.Min</h1>
          <p className="text-blue-200 mt-2">Super Admin Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-[#00A651]"
              placeholder="admin@ekonek.gov.ph"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-[#00A651]"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00A651] hover:bg-[#008C42] text-white font-semibold py-4 rounded-2xl transition-all disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login as Super Admin'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Exclusive Access • Occidental Mindoro LGU
        </p>
      </div>
    </div>
  );
};
