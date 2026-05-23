# 🚢 E-Konek Occi.Mindo Transit PWA

**Montenegro Shipping Line & Mamburao Grand Terminal — Occidental Mindoro, Philippines**

A full Progressive Web App (PWA) with role-based access control, 4 user roles, and separate panel views for the Montenegro Shipping Line and Mamburao Grand Terminal in Occidental Mindoro, Philippines. Built with React and styled with Tailwind CSS, running completely from a custom, modern full-stack developer architecture.

---

## 🗂️ Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Role-Based Access Control](#role-based-access-control)
- [Panels](#panels)
- [Commission System](#commission-system)
- [Online / Offline Mode](#online--offline-mode)
- [GPS Tracking](#gps-tracking)
- [Weather Integration](#weather-integration)
- [Super Admin Panel](#super-admin-panel)
- [PWA Setup](#pwa-setup)
- [Tech Stack](#tech-stack)
- [PIN Reference](#pin-reference)
- [Routes Reference](#routes-reference)
- [Seed Data](#seed-data)

---

## Overview

E-Konek Occi.Mindo Transit is an operations and passenger-facing transport management system for:

- **Montenegro Shipping Line** — RORO and passenger ferry services out of Abra Port
- **Mamburao Grand Terminal** — Van and bus routes across Occidental Mindoro

Re-engineered to unify port dispatches, terminal dispatches, offline queues, real-time GPS synchronization, and secure administrative accounting control in Mindoro.

---

## Features

| Feature | Description |
|---|---|
| Role-Based Access | 4 distinct roles, each guarded with physical PIN code authentication and instant login. |
| Ferry Ticketing | Active voyage board with customizable voyages, real-time statuses, and reservation management. |
| Boarding Passes | Interactive ticket issuer with physical QR code payloads and window-printing layout templates. |
| Shuttle Booking | Interactive terminal booking dispatches with individual passenger seating allocation. |
| Live GPS Map | Interactive satellite route simulation mapped via Leaflet.js and OpenStreetMap layers. |
| Weather Station | Dual weather tracking powered by Open-Meteo with reactive high-wind warnings. |
| Commission Engine | Auto-calculated sales commissions allocated across Ferry, Van, and Bus statuses. |
| Offline Buffering | Advanced background network check with full queue serialization and online re-sync triggers. |
| Administrative Hub | Sales telemetry summaries, responsive graphs, payout settlements, CSV generator sheets, and security audit logs. |

---

## Role-Based Access Control

On load, the application renders a secure authentication gate dashboard blocking view access until matching identities are established.

### Roles & PINs

| Role | Access Scope | Verification PIN | Login Flow |
|---|---|---|---|
| 🚢 Port Staff | Panel 1 Only (Abra Port Ferry Station) | `2001` | Requires 4-digit PIN |
| 🚐 Terminal Staff | Panel 2 Only (Mamburao Grand Terminal) | `2002` | Requires 4-digit PIN |
| 👤 Passenger | Panel 3 Only (Book & Track) | `0000` | Auto-login on press |
| 🔐 Super Admin | All Panels (Tabs Navigation Router Toggle) | `1234` | Requires 4-digit PIN |

---

## User Panels & Interfaces

### Panel 1 — Port Staff View (Abra Port Ferry Ticketing)
Guards Abra Port dispatching counters.
* **Voyages Monitor List**: Interactive board displaying vessel profiles, voyage time ranges, vessel types, and inline ship statuses (Scheduled / Boarding / Departed / Delayed / Cancelled).
* **Voyage Form**: Installs custom voyages with capacity counters.
* **Reservation Board**: Confirms or cancels pending crossings. Correct confirms automatically fire commission registrations.
* **QR Boarding Pass Creator**: Renders a boarding pass template complete with simulated printable formatting styles and real QR references (`api.qrserver.com/v1/create-qr-code`).

### Panel 2 — Terminal Staff View (Mamburao Grand Terminal Dispatch)
Triggers van and bus dispatches.
* **Dispatches Table**: Tracks vehicle types, driver assignments, passenger available allocations, and trip statuses.
* **Trip Manager Form**: Dispatches new land trips based on Occidental Mindoro travel networks.
* **Ferry Mirror Sync Monitor**: Syncs real-time ferry departures from Panel 1 onto a single read-only stream adorned with status indicators.
* **Fleet Tracking GPS Map**: Full-scale Leaflet map plotting active dispatch markers (Boarding or Departed) moving along highways with automated updates every 3 seconds.

### Panel 3 — Passenger Hub (Public Booking Terminal)
A passenger portal designed for shared public terminal environments.
* **Weather & Warning Banners**: Spotlights wind hazard panels if Open-Meteo detects wind speeds exceeding 30 km/h at Abra Port.
* **Departure Schedule Board**: Shows real-time available ferry crossings and terminal dispatches, featuring a 30-second ticking ring-pulse countdown.
* **Ferry & Land Checkout forms**: Books passenger seats under distinct fare statuses.
* **Track My Ride Tracker**: Triggers simulated vehicle ETAs ticking down on maps every 3 seconds alongside driver cards.

### Panel 4 — Super Admin Portal (Operational telemetry & Audit Logs)
Restricted exclusively to Super Admin sessions.
* **Financial Summary Cards**: Displays today's commissions, transaction logs, gross values, and outstanding operators payouts.
* **Visual SVG Breakdown Charts**: Illustrates allocation margins between Ferry, Van, and Bus routes.
* **Transaction Table ledger**: Tracks and filters logs, with one-click reverse-refund options reverting cash sums and system fees.
* **Settlement Mark-All-Paid Control**: Marks records as paid and writes transactions to Payout histories.
* **CSV Bulk Exporter**: Generates `.csv` exports using Blob streams.
* **Operational Security Log**: Collapse-box tracking login and logout audit trails.

---

## Commission System

Commissions register in real-time on the transaction ledger the moment any staff confirms bookings:

### Commission Rates & Ticket Values

| Transit Mode | Ticket Variant | Gross Price (PHP) | Agency Commission (PHP) |
|---|---|---|---|
| **Ferry Crossing** | Regular Ticket | ₱500 | ₱50 |
| | Student Ticket | ₱350 | ₱30 |
| | Senior Citizen | ₱300 | ₱25 |
| | PWD Allocation | ₱300 | ₱25 |
| **Van Shuttle** | Seat Passenger | ₱200 | ₱20 *(per seat)* |
| **Bus Shuttle** | Seat Passenger | ₱150 | ₱15 *(per seat)* |

---

## Online / Offline Mode

The application uses reactive system hooks to handle state transitions smoothly:

* **Top Bar Tracker**: Displays static banners (`🟢 Online — Live Data` or `🔴 Offline — Cached Mode`) dynamically.
* **Offline Buffering**: Intercepts booking submit triggers, routing operations to an `offlineQueue` array labeled as `Queued` while displaying a floating count indicator.
* **Auto-Sync Listener**: Upon reconnection, flushes queued operations to primary state stores (`ferryBookings` or `vanBookings`) as `Pending`, displays a 3-second toast alert (`✅ X bookings synced successfully`), and updates weather caches.

---

## GPS Coordinates (Highways)

GPS Route loops simulate movement every 3 seconds across highways in Occidental Mindoro.

* **Mamburao ↔ Abra Port** (6 positions)
* **Mamburao ↔ San Jose** (6 positions)
* **Mamburao ↔ Calintaan** (4 positions)
* **Mamburao ↔ Paluan** (5 positions)
* **Mamburao ↔ Sablayan** (5 positions)

---

## PWA Setup

Packaged inline in the `<head>` tag utilizing Blob object URLs for fast asset loads:
* **Manifest Manifest Metadata**: Registered with standalone orientations, `#003580` primary navy branding color, and `#F0F4F8` application canvas backgrounds.
* **Service Worker Sandbox**: Uses cache-first approaches (`e-konek-occi-mindo-transit-v1`) to cache resource loads, keeping offline operations active on remote devices.

---

## Standard PIN Credentials

* 🚢 **Port Staff Registration**: `2001`
* 🚐 **Terminal Staff Registration**: `2002`
* 👤 **Passenger Access Portal**: `0000` *(Auto-unlock)*
* 🔐 **Super Admin Console**: `1234`

---

## Tech Stack & CDN CDNs

* **Frontend Framework**: React 18, ReactDOM 18 (Cdn)
* **Design Compiler**: Tailwind CSS Engine Playgrounds
* **Mapping Framework**: Leaflet.js 1.9.4 & OpenStreetMap Layers
* **Script Compiler**: Babel Standalone ES6 Parser
* **Indicators & Webography**: Font Awesome Icons 6.4.0
* **API Providers**: Open-Meteo Meteorology Forecasts, QRServer Codes
