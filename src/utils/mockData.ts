/**
 * mockData.ts
 *
 * Seeding schema for e-transit data models.
 */

import {
  Ship,
  Trip,
  FerryBooking,
  VanBooking,
  Announcement,
  Transaction,
  PayoutHistory,
  AuditLog,
  AdminAccount,
} from '../types/dataTypes';

export const getMockSeed = (name: string): any[] => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  switch (name) {
    case 'ships':
      return [
        {
          id: 's1',
          name: 'MV Maria Olive',
          route: 'Abra Port → Batangas',
          depTime: new Date(now.getTime() + 2 * 3600 * 1000).toISOString(),
          arrTime: new Date(now.getTime() + 4.5 * 3600 * 1000).toISOString(),
          status: 'Boarding',
          capacity: 300,
          available: 120,
          type: 'RORO',
        },
        {
          id: 's2',
          name: 'MV Reina Genoveva',
          route: 'Abra Port → Puerto Galera',
          depTime: new Date(now.getTime() + 5 * 3600 * 1000).toISOString(),
          arrTime: new Date(now.getTime() + 6.5 * 3600 * 1000).toISOString(),
          status: 'Scheduled',
          capacity: 250,
          available: 250,
          type: 'Passenger Ferry',
        },
        {
          id: 's3',
          name: 'MV Montenegro Star',
          route: 'Batangas → Abra Port',
          depTime: new Date(now.getTime() + 8 * 3600 * 1000).toISOString(),
          arrTime: new Date(now.getTime() + 10.5 * 3600 * 1000).toISOString(),
          status: 'Scheduled',
          capacity: 200,
          available: 200,
          type: 'RORO',
        },
      ] as Ship[];

    case 'trips':
      return [
        {
          id: 't1',
          route: 'Mamburao → Abra Port',
          depTime: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
          type: 'Van',
          driver: 'Kuya Jun Dela Rosa',
          capacity: 14,
          available: 6,
          status: 'Boarding',
        },
        {
          id: 't2',
          route: 'Abra Port → Mamburao',
          depTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
          type: 'Van',
          driver: 'Ate Lorna Bautista',
          capacity: 14,
          available: 14,
          status: 'Scheduled',
        },
        {
          id: 't3',
          route: 'Mamburao → San Jose',
          depTime: new Date(now.getTime() + 120 * 60 * 1000).toISOString(),
          type: 'Bus',
          driver: 'Mang Cardo Villanueva',
          capacity: 45,
          available: 30,
          status: 'Scheduled',
        },
        {
          id: 't4',
          route: 'San Jose → Mamburao',
          depTime: new Date(now.getTime() + 180 * 60 * 1000).toISOString(),
          type: 'Bus',
          driver: 'Dodong Reyes',
          capacity: 45,
          available: 45,
          status: 'Scheduled',
        },
        {
          id: 't5',
          route: 'Mamburao → Calintaan',
          depTime: new Date(now.getTime() + 45 * 60 * 1000).toISOString(),
          type: 'Van',
          driver: 'Kuya Romy Santos',
          capacity: 10,
          available: 3,
          status: 'Departed',
        },
        {
          id: 't6',
          route: 'Calintaan → Mamburao',
          depTime: new Date(now.getTime() + 240 * 60 * 1000).toISOString(),
          type: 'Van',
          driver: 'Nanding Cruz',
          capacity: 10,
          available: 10,
          status: 'Scheduled',
        },
      ] as Trip[];

    case 'ferryBookings':
      return [
        { id: 'fb1', shipId: 's1', name: 'Ligaya Reyes', contact: '09171234567', type: 'Regular', status: 'Pending' },
        { id: 'fb2', shipId: 's1', name: 'Crisanto Villanueva', contact: '09189876543', type: 'Senior', status: 'Confirmed' },
        { id: 'fb3', shipId: 's2', name: 'Nena Magtanggol', contact: '09201112233', type: 'Student', status: 'Pending' },
        { id: 'fb4', shipId: 's2', name: 'Bong Espiritu', contact: '09151234321', type: 'PWD', status: 'Confirmed' },
      ] as FerryBooking[];

    case 'vanBookings':
      return [
        {
          id: 'vb1',
          tripId: 't1',
          name: 'Rosario Dalisay',
          contact: '09191112222',
          pickup: 'Mamburao Grand Terminal',
          seats: 2,
          status: 'Confirmed',
        },
        {
          id: 'vb2',
          tripId: 't3',
          name: 'Ferdie Macaraeg',
          contact: '09209998888',
          pickup: 'Mamburao Plaza',
          seats: 1,
          status: 'Pending',
        },
      ] as VanBooking[];

    case 'announcements':
      return [
        {
          id: 'a1',
          text: 'All trips are on schedule today. Passengers are reminded to arrive 30 minutes before departure. Present valid IDs at the counter.',
          date: now.toISOString(),
          author: 'Abra Port Admin',
        },
        {
          id: 'a2',
          text: 'MV Montenegro Star arrival at Abra Port is expected at 10:30 AM. Van shuttles to Mamburao will depart immediately after docking.',
          date: new Date(now.getTime() - 3600 * 1000).toISOString(),
          author: 'Terminal Admin',
        },
      ] as Announcement[];

    case 'transactions':
      return [
        {
          id: 'tx1',
          timestamp: yesterday.toISOString(),
          type: 'Ferry',
          bookingId: 'fb2',
          passengerName: 'Crisanto Villanueva',
          route: 'Abra Port → Batangas',
          ticketType: 'Senior',
          grossAmount: 300,
          commissionAmount: 25,
          confirmedBy: 'Port Admin',
          status: 'Completed',
          paid: true,
        },
        {
          id: 'tx2',
          timestamp: yesterday.toISOString(),
          type: 'Van',
          bookingId: 'vb1',
          passengerName: 'Rosario Dalisay',
          route: 'Mamburao → Abra Port',
          ticketType: '2 seats',
          grossAmount: 400,
          commissionAmount: 40,
          confirmedBy: 'Terminal Admin',
          status: 'Completed',
          paid: true,
        },
        {
          id: 'tx3',
          timestamp: now.toISOString(),
          type: 'Ferry',
          bookingId: 'fb4',
          passengerName: 'Bong Espiritu',
          route: 'Abra Port → Puerto Galera',
          ticketType: 'PWD',
          grossAmount: 300,
          commissionAmount: 25,
          confirmedBy: 'Port Admin',
          status: 'Completed',
          paid: false,
        },
      ] as Transaction[];

    case 'payoutHistory':
      return [
        { id: 'ph1', date: threeDaysAgo.toISOString(), totalAmount: 1250, transactionCount: 8 },
        { id: 'ph2', date: yesterday.toISOString(), totalAmount: 890, transactionCount: 5 },
      ] as PayoutHistory[];

    case 'auditLog':
      return [
        { id: 'al1', timestamp: new Date(now.getTime() - 3600 * 1000).toISOString(), role: 'port', action: 'login' },
        { id: 'al2', timestamp: new Date(now.getTime() - 2700 * 1000).toISOString(), role: 'terminal', action: 'login' },
        { id: 'al3', timestamp: new Date(now.getTime() - 1200 * 1000).toISOString(), role: 'port', action: 'logout' },
      ] as AuditLog[];

    case 'adminAccounts':
      return [
        {
          id: 'adm-port',
          fullName: 'Abra Ticketing Lead',
          role: 'port',
          createdAt: now.toISOString(),
          lastLogin: '',
          status: 'active',
        },
        {
          id: 'adm-terminal',
          fullName: 'Mamburao Dispatcher',
          role: 'terminal',
          createdAt: now.toISOString(),
          lastLogin: '',
          status: 'active',
        },
        {
          id: 'adm-superadmin',
          fullName: 'Operations Supervisor',
          role: 'superadmin',
          createdAt: now.toISOString(),
          lastLogin: '',
          status: 'active',
        },
      ] as any[] as unknown as AdminAccount[];

    default:
      return [];
  }
};
