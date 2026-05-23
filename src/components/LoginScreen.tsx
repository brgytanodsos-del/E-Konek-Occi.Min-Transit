import { useState } from 'react';
import { useApp } from '../context/AppContext';

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'superadmin' | 'port' | 'terminal' | 'passenger'>('superadmin');
  const [loading, setLoading] = useState(false);
  const { setCurrentRole, setIsAuthenticated } = useApp();

  const roleOptions = [
    { value: 'superadmin', label: '🔐 Super Admin', desc: 'System Administration' },
    { value: 'port', label: '🚢 Port Staff', desc: 'Abra Port Ticketing' },
    { value: 'terminal', label: '🚐 Terminal Staff', desc: 'Mamburao Terminal' },
    { value: 'passenger', label: '👤 Passenger', desc: 'Book Tickets & Track' },
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setCurrentRole(selectedRole);
      setIsAuthenticated(true);
      setLoading(false);
      onLogin();
    }, 900);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003087] via-[#0F172A] to-black flex items-center justify-center p-4">
      <div className="glass w-full max-w-md rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto bg-white rounded-2xl flex items-center justify-center text-5xl mb-4 shadow-inner">
            🚢
          </div>
          <h1 className="text-3xl font-bold text-white">E-Konek Occi.Min</h1>
          <p className="text-blue-200 mt-1">Occidental Mindoro Transit System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Role Selection */}
          <div>
            <label className="block text-sm text-gray-200 mb-3">Select Login Role</label>
            <div className="grid gap-3">
              {roleOptions.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value as any)}
                  className={`p-4 rounded-2xl text-left transition-all border ${
                    selectedRole === role.value 
                      ? 'border-[#00A651] bg-[#00A651]/10' 
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="font-medium">{role.label}</div>
                  <div className="text-sm text-gray-400">{role.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-200 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-gray-600 bg-transparent text-white placeholder-gray-400 focus:border-[#00A651] outline-none"
              placeholder="admin@ekonek.gov.ph"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-200 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border border-gray-600 bg-transparent text-white placeholder-gray-400 focus:border-[#00A651] outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00A651] hover:bg-green-600 py-4 rounded-2xl font-semibold text-lg transition-all disabled:opacity-70 tap-target cursor-pointer"
          >
            {loading ? 'Logging in...' : `Login as ${selectedRole === 'superadmin' ? 'Super Admin' : selectedRole}`}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-8">
          Provincial Government of Occidental Mindoro
        </p>
      </div>
    </div>
  );
};
