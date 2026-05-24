# Changelog

## [v1.0.0] - 2026-05-25

### 🚀 Major Features Added
- **Voice Assistant System** - Speech recognition + Text-to-Speech (English & Tagalog)
- **Full Dark Mode** - Maritime-optimized theme with system preference detection
- **Atomic Transaction Logic** - Secure booking and refund operations
- **Duplicate Booking Prevention** using Firestore transactions
- **Offline Queue System** with auto-sync
- **Enhanced PIN Authentication** with rate limiting and lockout
- **Improved UI/UX** across all role-based panels

### 🔒 Security Improvements
- Role-based Firestore security rules
- Atomic operations for financial actions
- Protected refund flow (Super Admin only)
- Failed PIN attempt lockout (15 minutes)

### 🎨 UI/UX Enhancements
- Consistent maritime dark theme
- Smooth theme transitions
- Voice feedback on major actions
- Better mobile responsiveness
- Toast notification system

### 🛠 Technical Improvements
- Clean service layer (`bookingService`, `transactionService`, `ttsService`, etc.)
- Proper Leaflet map icon fixes
- Enhanced `AuthContext` and `VoiceAssistantContext`
- Updated all panels with full dark mode support
- Better error handling and user feedback

### 📱 PWA & Offline
- Strengthened offline resilience
- Voice commands work offline
- Improved bottom navigation

---

### Previous Versions

## [v0.9.0] - 2026-05-23
- Initial role-based panels
- Basic booking modal with map
- Firebase integration

---

**Next Planned (v1.1)**
- Real GPS device integration
- Commission payout module
- Analytics dashboard
- Push notifications
- Full Tagalog UI
