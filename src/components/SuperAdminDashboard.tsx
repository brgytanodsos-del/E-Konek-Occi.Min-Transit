import { useState } from 'react';
import { Panel1 } from '../features/montenegro/Panel1';
import { Panel2 } from '../features/land/Panel2';
import { Panel3 } from '../features/passenger/Panel3';
import { useApp } from '../context/AppContext';

export const SuperAdminDashboard = () => {
  const [activePanel, setActivePanel] = useState<'montenegro' | 'land' | 'passenger'>('montenegro');
  const { setCurrentRole, setIsAuthenticated, ferryBookings, vanBookings } = useApp();

  const handleLogout = () => {
    setCurrentRole(null);
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🛡️</div>
            <div>
              <h1 className="text-2xl font-bold text-[#003087]">Super Admin Control</h1>
              <p className="text-sm text-gray-500">E-Konek Occidental Mindoro Transit</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-green-600 font-medium">● ONLINE</div>
            <button onClick={handleLogout} className="text-red-500 text-sm font-medium">Logout</button>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-6 pt-8">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <p className="text-gray-500 text-sm">Active Bookings</p>
            <p className="text-3xl font-bold text-[#003087]">{ferryBookings.length + vanBookings.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <p className="text-gray-500 text-sm">Total App Users</p>
            <p className="text-3xl font-bold text-[#00A651]">128</p>
          </div>
        </div>

        {/* Role Tabs */}
        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm w-fit overflow-x-auto max-w-full">
          <TabButton active={activePanel === 'montenegro'} onClick={() => setActivePanel('montenegro')}>
            🚢 Montenegro Shipping
          </TabButton>
          <TabButton active={activePanel === 'land'} onClick={() => setActivePanel('land')}>
            🚐 Van & Bus Operations
          </TabButton>
          <TabButton active={activePanel === 'passenger'} onClick={() => setActivePanel('passenger')}>
            👤 Passenger Portal
          </TabButton>
        </div>
      </div>

      {/* Panel Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-3xl shadow-xl min-h-[calc(100vh-180px)] overflow-hidden">
          {activePanel === 'montenegro' && <Panel1 isSuperAdmin={true} />}
          {activePanel === 'land' && <Panel2 isSuperAdmin={true} />}
          {activePanel === 'passenger' && <Panel3 isSuperAdmin={true} />}
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-8 py-3 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
      active 
        ? 'bg-[#003087] text-white shadow' 
        : 'hover:bg-gray-100 text-gray-700'
    }`}
  >
    {children}
  </button>
);
