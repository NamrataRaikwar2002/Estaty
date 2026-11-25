# ESTATY - Technical Documentation

## Technologies & Frameworks

| Layer | Technology |
|-------|------------|
| **Framework** | React Native 0.88.1 (bare workflow) |
| **Language** | JavaScript (ES6+) with JSX |
| **Navigation** | React Navigation v6 (Stack + Tab navigators) |
| **State Management** | React Context + Hooks (AuthContext) |
| **Persistence** | @react-native-async-storage/async-storage |
| **Real-time Database** | Firebase Realtime Database (call signaling) |
| **Video/Voice** | Agora RTC SDK v4.x (react-native-agora ^4.6.4) |
| **Token Auth** | Custom Node.js token server (Express + agora-token) |
| **Styling** | StyleSheet API (no external CSS-in-JS) |
| **Config** | react-native-config (.env for secrets) |

---

## Application Architecture

```
src/
├── components/          # Reusable UI (Button, Input, CallControls, etc.)
├── screens/
│   ├── auth/            # Login, Signup
│   ├── main/            # ListingsScreen, ProfileScreen, etc.
│   └── call/            # IncomingCall, OutgoingCall, ActiveCall
├── context/             # AuthContext (global state)
├── hooks/               # useFormValidation, useAuth, etc.
├── services/            # agoraRTCService, callSignaling, tokenClient
├── navigation/          # Stack/Tab navigators, NavigationService
├── constants/           # colors, typography, spacing, borders
└── utils/               # validation, formatting helpers
```

**Data Flow for Calls:**
```
ListingScreen → startCall() → Firebase RTDB (call invitation)
    ↓
joinChannel() → Token Server (POST /token) → Agora RTC Channel
    ↓
OutgoingCallScreen → ActiveCallScreen (on CONNECTED)
```

---

## Token Service Architecture

```
token-server/
├── server.js          # Express server with POST /token endpoint
├── package.json       # Dependencies: express, cors, dotenv, agora-token
├── .env               # AGORA_APP_ID, AGORA_APP_CERTIFICATE (never in client)
└── README.md          # Setup & testing docs
```

**Token Generation Flow:**
```
Client (React Native)                    Token Server (Node.js)              Agora
     │                                        │                              │
     │── POST /token {channelName, uid} ───►│                              │
     │                                        │── RtcTokenBuilder.buildTokenWithUid()
     │                                        │     (App ID + Certificate)   │
     │                                        │                              │
     │◄── {token, expiresIn, expireTs} ─────│                              │
     │                                        │                              │
     │── joinChannel(token, channel, uid) ──►│─────────────────────────────►│
```

**Security Model:**
- **App Certificate** stays on server only (never in React Native bundle)
- **Per-channel, per-user tokens** with 1-hour expiry (dev) / 24-hour max (prod)
- **Numeric UID** derived from stable hash (`userIdToUid`) — same on client & server


**Client Integration (`tokenClient.js`):**
- `fetchRtcTokenForUser(channelName, userId)` — called inside `joinChannel()`
- Automatic fallback to tokenless mode if server unreachable (dev only)
- Health check endpoint (`GET /health`) for connection validation

---

## Key Implementation Decisions

1. **Context over Redux** — Lightweight, sufficient for auth/call state; avoids boilerplate
2. **Firebase RTDB for signaling** — Real-time presence, simpler than Agora RTM for 1-to-1
3. **Numeric UID mapping** — Stable hash (`userIdToUid`) ensures consistent Agora UIDs per user
4. **Token server separation** — App Certificate never exposed to client; tokens generated per-channel per-user

---

## Development Approach

- **Component-first**: Small, single-responsibility components composed into screens
- **Controlled forms**: All inputs via `useState` + `useFormValidation` hook
- **Feature flags**: `USE_FIXED_TEST_CHANNEL` for isolated audio testing
- **Environment-driven config**: All secrets via `.env` + `react-native-config`
- **ESLint + Prettier**: Enforced code style (`npm run lint`)

---

## Major Technical Challenges

| Challenge | Solution |
|-----------|----------|
| **Audio not working on Android** | `ChannelProfileCommunication` + `publishMicrophoneTrack: true` + `autoSubscribeAudio: true` |
| **Token auth with dynamic channels** | Token server + `fetchRtcTokenForUser()` called inside `joinChannel()` before `joinChannel()` |
| **Call screen reappears after hangup** | Unmount cleanup in all 3 call screens calls `callSignaling.endCall()` |
| **UID mismatch between users** | Shared `userIdToUid()` hash function in both client and token server |

---

## AI Tools Usage Summary

| Tool | Purpose |
|------|---------|
| **Claude Code (Opus 5.5)** | Primary development agent — implemented call signaling, token server, UI screens, bug fixes |
| **ChatGPT** | Architecture discussions, debugging assistance, code review suggestions |
| **Claude Code Skills** | `agora` skill for RTC best practices; `workflow-authoring` for multi-agent tasks |
| **Subagents** | Parallel file exploration, code reviews, and documentation |

**Contribution**: ~85% of boilerplate, signaling logic, token integration, and bug diagnosis generated via AI with human review/approval at each step.