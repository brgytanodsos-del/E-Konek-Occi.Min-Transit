# E-Konek Occi.Min Transit

**A Progressive Web App (PWA) for Montenegro Shipping Line & Mamburao Grand Terminal, Occidental Mindoro**

Modern, offline-first, role-based transit management system designed for real maritime and land transport operations in the Philippines.

![Status](https://img.shields.io/badge/Status-Production_Ready-brightgreen)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)

---

## ✨ Key Features

- **Role-Based Access** with secure 4-digit PIN authentication
- **Atomic Booking System** with duplicate seat prevention
- **Real-time GPS Tracking** using Leaflet Maps
- **Voice Assistant** with English + Tagalog support
- **Full Dark Mode** with maritime-optimized theme
- **Offline-First** architecture with queue & auto-sync
- **Commission Engine** & secure transaction management
- **Refund Safeguards** with atomic transactions
- **Weather Alerts** integration
- **PWA Ready** (installable on Android/iOS)

---

## 🎯 Target Users

- Port Operations Staff
- Terminal / Land Transport Staff  
- Passengers (Trip Tracking)
- Super Administrators

**Note**: Login credentials are managed securely within the app. Contact the system administrator for access.

---

## 🚀 New in v1.0

### Core Enhancements
- Full atomic Firestore transactions for bookings and refunds
- Advanced Voice Assistant (Speech Recognition + TTS)
- Complete Dark Mode with system preference detection
- Improved security (rate limiting + lockout mechanism)
- Maritime-optimized UI/UX for outdoor terminal environments

### Technical Improvements
- Clean component architecture and service layers
- Robust error handling with toast notifications
- Leaflet map stability fixes
- Offline queue system
- Bilingual voice support (English & Tagalog)

---

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Maps**: React Leaflet
- **Backend**: Firebase (Auth + Firestore)
- **Voice**: Browser SpeechSynthesis + SpeechRecognition
- **Styling**: Maritime Dark Theme
- **PWA**: Full offline capability

---

## 📱 How to Run Locally

```bash
git clone https://github.com/brgytanodsos-del/E-Konek-Occi.Min-Transit.git
cd E-Konek-Occi.Min-Transit
npm install
npm run dev
```

**Deploy to Firebase Hosting**:
```bash
npm run build
firebase deploy --only hosting
```

---

## 📸 Screenshots

*(To be added after deployment)*

- Secure Login Screen
- Voice Assistant Interface
- Booking Modal with Live Map & Voice Confirmation
- Role-based Dashboards (Dark Mode)

---

## 🔒 Security Features

- Atomic transactions to prevent duplicate bookings
- Role-based Firestore security rules
- PIN authentication with rate limiting and lockout
- Protected financial operations (refunds require approval)

---

## 📌 Roadmap (v1.1+)

- Real GPS hardware integration
- Commission payout automation
- Advanced analytics dashboard
- Full Tagalog interface
- Push notifications for delays and alerts

---

**Built for Occidental Mindoro Maritime & Land Transport Operations**
