import { useState } from 'react';
import { useApp } from '../context/AppContext';

const ROLE_PINS: Record<string, string | null> = {
  port: '2001',
  terminal: '2002',
  passenger: null,
  superadmin: '1234',
};

const roleOptions = [
  { value: 'port', label: '🚢 Port Staff', desc: 'Abra Port Ticketing Station' },
  { value: 'terminal', label: '🚐 Terminal Staff', desc: 'Mamburao Grand Terminal' },
  { value: 'passenger', label: '👤 Passenger', desc: 'Book Tickets & Track Rides' },
  { value: 'superadmin', label: '🔐 Super Admin', desc: 'System Administration' },
];

export const LoginScreen = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const { setCurrentRole, setIsAuthenticated } = useApp();

  const handleRoleSelect = (role: string) => {
    if (ROLE_PINS[role] === null) {
      setCurrentRole(role as any);
      setIsAuthenticated(true);
    } else {
      setSelectedRole(role);
      setPin('');
      setError(false);
    }
  };

  const handlePinSubmit = () => {
    if (pin === ROLE_PINS[selectedRole!]) {
      setCurrentRole(selectedRole as any);
      setIsAuthenticated(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  };

  if (selectedRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F0F4F8] p-4 text-[#003580]">
        <h2 className="text-2xl font-bold mb-4">{roleOptions.find(r => r.value === selectedRole)?.label}</h2>
        <div className="flex gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-6 h-6 rounded-full border-2 border-[#003580] ${pin.length > i ? 'bg-[#003580]' : ''}`} />
            ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
            {[1,2,3,4,5,6,7,8,9,0].map(digit => (
                <button key={digit} className="w-16 h-16 rounded-full bg-white shadow-md text-2xl font-bold hover:bg-gray-100" onClick={() => pin.length < 4 && setPin(pin + digit)}>{digit}</button>
            ))}
            <button className="w-16 h-16 rounded-full bg-red-100 text-red-600 font-bold" onClick={() => setPin('')}>Clear</button>
            <button className="w-16 h-16 rounded-full bg-[#00A651] text-white font-bold" onClick={handlePinSubmit}>Enter</button>
        </div>
        {error && <p className="text-red-500 mt-4 animate-pulse">Incorrect PIN. Try again.</p>}
        <button className="mt-8 text-gray-500" onClick={() => setSelectedRole(null)}>Cancel</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#003580] flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-white mb-12">MindoroTransit</h1>
      <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
        {roleOptions.map(role => (
          <button key={role.value} onClick={() => handleRoleSelect(role.value)} className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all text-left">
            <div className="text-3xl mb-2">{role.label.split(' ')[0]}</div>
            <div className="font-bold text-[#003580]">{role.label.split(' ')[1]} {role.label.split(' ')[2]}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
