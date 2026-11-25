# ESTATY - Project Instructions & Coding Conventions

## Project Overview
ESTATY is a land/property marketplace mobile application connecting three user types: **Buyers**, **Sellers**, and **Brokers**. Built with React Native (bare workflow), JavaScript/JSX only.

## Technology Stack
- **Framework**: React Native 0.88.1 (bare workflow)
- **Language**: JavaScript (ES6+) with JSX — **No TypeScript**
- **Navigation**: React Navigation v6 (Stack Navigator)
- **State Management**: React Context + Hooks (no Redux/Zustand)
- **Persistence**: @react-native-async-storage/async-storage
- **Styling**: StyleSheet API (no styled-components, no Tailwind)
- **Form Handling**: Custom hooks + controlled components

## Architecture Principles

### 1. Modularity & Reusability
- **Components**: Small, single-responsibility, reusable UI components in `src/components/`
- **Screens**: Full-screen components in `src/screens/`, composed of smaller components
- **Hooks**: Custom hooks in `src/hooks/` for shared logic (auth, forms, validation)
- **Context**: React Context in `src/context/` for global state (auth, theme)
- **Utils**: Pure utility functions in `src/utils/` (validation, formatting, constants)
- **Navigation**: Navigation setup in `src/navigation/`

### 2. Folder Structure
```
src/
├── components/       # Reusable UI components (Button, Input, Card, etc.)
├── screens/          # Full-screen components
│   ├── auth/         # Login, Signup, ForgotPassword
│   └── main/         # Home, Profile, Listings, etc.
├── navigation/       # Navigation configuration
├── context/          # React Context providers
├── hooks/            # Custom React hooks
├── utils/            # Utility functions & constants
├── constants/        # App-wide constants (colors, sizes, roles)
└── assets/           # Images, fonts (if any)
```

### 3. Component Conventions
- **Functional components only** — use React Hooks (`useState`, `useEffect`, `useContext`, `useCallback`, `useMemo`)
- **Named exports** for components, **default export** for screens
- **Props destructuring** with default values
- **StyleSheet.create** for all styles — no inline styles except dynamic values
- **Component naming**: PascalCase, descriptive names (`LoginForm`, `RoleSelector`, `AuthButton`)

### 4. State Management
- **Local state**: `useState` / `useReducer` for component-scoped state
- **Global state**: React Context for auth, user profile, theme
- **Persistence**: AsyncStorage for auth token, user data, preferences
- **No external state libraries** unless project scales significantly

### 5. Form & Validation Patterns
- **Controlled components** — all inputs controlled via state
- **Validation**: Custom `useFormValidation` hook with rules object
- **Error display**: Inline error messages below each field
- **Submit handling**: Disable button during submission, show loading state

### 6. Authentication Flow
```
App Launch → Check AsyncStorage for saved session
  ├─ Valid session → Navigate to Home (role-based)
  └─ No session → Navigate to Login
       ├─ Login success → Save to AsyncStorage → Home
       └─ Signup → Validate → Save → Home
```

### 7. User Roles & Permissions
| Role | Capabilities |
|------|-------------|
| **Buyer** | Browse listings, save favorites, contact sellers/brokers |
| **Seller** | Create/edit listings, manage inquiries, view analytics |
| **Broker** | Manage multiple listings, client management, commissions |

### 8. Styling Conventions
- **Color palette** defined in `src/constants/colors.js`
- **Spacing scale**: 4, 8, 12, 16, 24, 32, 48 (base-4 system)
- **Typography scale**: Defined in `src/constants/typography.js`
- **Border radius**: 4, 8, 12, 16, 24 (small → round)
- **Shadows**: Consistent elevation/shadow system
- **Dark mode support** via `useColorScheme` hook

### 9. Navigation Patterns
- **Stack Navigator** for auth flow (Login → Signup → ForgotPassword)
- **Tab Navigator** for main app (Home, Listings, Messages, Profile)
- **Nested navigators** for complex flows
- **Type-safe route params** via JSDoc comments

### 10. Code Quality
- **ESLint** + **Prettier** configured (run `npm run lint`)
- **No console.log** in production code (use `__DEV__` guard)
- **JSDoc comments** for exported functions, hooks, components
- **Error boundaries** for graceful error handling

## Development Workflow

### Adding New Features
1. Create feature branch from `dev`
2. Implement in `src/` following folder structure
3. Add/update constants, types (JSDoc), utils as needed
4. Test on both iOS and Android
5. Run lint: `npm run lint`
6. PR to `dev` branch

### Dependency Management
- **Minimize dependencies** — prefer native RN APIs
- **Audit before adding** — check bundle size, maintenance, licenses
- **Lock versions** in package.json (no `^` for major deps)

## Current Implementation Status
- [x] Project initialized (React Native 0.88.1)
- [ ] Navigation setup (React Navigation)
- [ ] Auth Context & AsyncStorage
- [ ] Login Screen
- [ ] Signup Screen (with role selection)
- [ ] Form validation hook
- [ ] Reusable UI components (Button, Input, etc.)
- [ ] Role-based home screens (placeholder)

## Evaluation Readiness
For assignment evaluation, be prepared to explain:
1. **Architecture decisions**: Why Context over Redux? Why React Navigation?
2. **State flow**: How auth state propagates through the app
3. **Validation approach**: How `useFormValidation` works
4. **Persistence strategy**: AsyncStorage integration, security considerations
5. **Scalability**: How this structure supports future features
6. **Trade-offs**: What you'd change with more time/resources