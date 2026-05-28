// src/features/passenger/components/PassengerPanelView.tsx
import React from 'react';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { WeatherWidget } from '../../../components/WeatherWidget';
import { LiveTrackingView } from './LiveTrackingView';
import { BookingForms } from './BookingForms';
import { DepartureBoards } from './DepartureBoards';

export default function PassengerPanelView(props: any) {
  const {
    trips,
    refreshTimer,
    pulseActive,
    refreshing,
    manualRefresh,
    announce,
    isOnline,
    pendingQueueCount,

    // Safe offline methods
    safePersistFerryBooking,
    safePersistVanBooking,

    // Form states & setters
    voyageId, setVoyageId,
    ferryName, setFerryName,
    ferryContact, setFerryContact,
    ticketType, setTicketType,
    tripId, setTripId,
    pickupPoint, setPickupPoint,
    shuttleName, setShuttleName,
    shuttleContact, setShuttleContact,
    seatsCount, setSeatsCount,
  } = props;

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Passenger Terminal Operations</h1>
          <p className="text-muted-foreground">Real-time • Occidental Mindoro</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={manualRefresh}
          disabled={refreshing}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
            pulseActive 
              ? 'bg-orange-500 text-white shadow-lg' 
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh ({refreshTimer}s)
        </motion.button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Weather */}
        <div className="xl:col-span-4 space-y-4">
          <WeatherWidget location="Abra de Ilog" data={props.abraWeather} />
          <WeatherWidget location="Mamburao" data={props.mamburaoWeather} />
        </div>

        {/* Live Tracking - Large Area */}
        <div className="xl:col-span-8">
          <LiveTrackingView {...props} />
        </div>

        {/* Departure Boards */}
        <div className="xl:col-span-12">
          <DepartureBoards 
            trips={trips} 
            onAnnounce={announce} 
          />
        </div>

        {/* Booking Section */}
        <div className="xl:col-span-12">
          <BookingForms
            voyageId={voyageId}
            setVoyageId={setVoyageId}
            ferryName={ferryName}
            setFerryName={setFerryName}
            ferryContact={ferryContact}
            setFerryContact={setFerryContact}
            ticketType={ticketType}
            setTicketType={setTicketType}
            
            tripId={tripId}
            setTripId={setTripId}
            pickupPoint={pickupPoint}
            setPickupPoint={setPickupPoint}
            shuttleName={shuttleName}
            setShuttleName={setShuttleName}
            shuttleContact={shuttleContact}
            setShuttleContact={setShuttleContact}
            seatsCount={seatsCount}
            setSeatsCount={setSeatsCount}

            safePersistFerryBooking={safePersistFerryBooking}
            safePersistVanBooking={safePersistVanBooking}
            
            pendingQueueCount={pendingQueueCount}
            isOnline={isOnline}
          />
        </div>
      </div>
    </div>
  );
}
