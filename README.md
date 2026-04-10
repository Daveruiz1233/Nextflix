# Nextflix Shield

A high-performance streaming catalog and playback engine with built-in Stealth Shield technology.

## 🚀 The Mobile Leap
This version of Nextflix has been converted to a native mobile app (iOS/Android) using Capacitor 6.0. It features **Native Engine-Level AdBlocking** that bypasses iframe restrictions by intercepting network traffic at the hardware level.

### Key Features
- **Stealth Shield**: Intercepts and mocks tracker requests to bypass anti-adblock detection.
- **Touch Thief**: A custom interaction layer that neutralizes "first-click" hijack redirects common in streaming sources.
- **Native Blocklists**: Hardcoded Safari Content Blockers (iOS) and Java Interceptors (Android) for smooth, ad-free playback.
- **Premium UI**: Dark-mode, glassmorphic design optimized for legacy hardware (iPhone 6s Plus).

## ⚠️ Disclaimer
**For Personal and Educational Use Only.**
Nextflix is a research project designed to explore mobile native interceptors and ad-blocking technologies. It does not host any content. All streaming sources are provided by third-party services. The authors of this project are not responsible for any misuse.

## 📦 How to Build
This project uses GitHub Actions for automated builds.
- **Android**: APK is generated via the `Build Nextflix Mobile` workflow.
- **iOS**: Unsigned IPA is generated via the same workflow for sideloading.

---
*Developed with ❤️ as a proof of concept for Advanced Agentic Coding.*
