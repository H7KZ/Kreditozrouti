# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
    globalIgnores(['dist']),
    {
        files: ['**/*.{ts,tsx}'],
        extends: [
            // Other configs...

            // Remove tseslint.configs.recommended and replace with this
            tseslint.configs.recommendedTypeChecked,
            // Alternatively, use this for stricter rules
            tseslint.configs.strictTypeChecked,
            // Optionally, add this for stylistic rules
            tseslint.configs.stylisticTypeChecked

            // Other configs...
        ],
        languageOptions: {
            parserOptions: {
                project: ['./tsconfig.node.json', './tsconfig.app.json'],
                tsconfigRootDir: import.meta.dirname
            }
            // other options...
        }
    }
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactDom from 'eslint-plugin-react-dom'
import reactX from 'eslint-plugin-react-x'

export default defineConfig([
    globalIgnores(['dist']),
    {
        files: ['**/*.{ts,tsx}'],
        extends: [
            // Other configs...
            // Enable lint rules for React
            reactX.configs['recommended-typescript'],
            // Enable lint rules for React DOM
            reactDom.configs.recommended
        ],
        languageOptions: {
            parserOptions: {
                project: ['./tsconfig.node.json', './tsconfig.app.json'],
                tsconfigRootDir: import.meta.dirname
            }
            // other options...
        }
    }
])
```

# Frontend

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TanStack Router** - Type-safe routing with loaders/actions
- **Shadcn/ui** - Component library
- **Tailwind CSS** - Styling
- **i18next** - Internationalization (Czech/English)
- **Schedule-X** - Calendar component

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components (LoginPage, CalendarPage)
│   ├── routes/         # TanStack Router route definitions
│   ├── lib/            # Utilities, API client, services
│   ├── i18n/           # Translation files
│   └── main.tsx        # App entry point
├── public/             # Static assets
└── package.json
```

## Component Architecture

### Pattern: Custom Hooks + Pure Presentational Components

We follow a clean separation of concerns:

1. **Business Logic** → Custom hooks (e.g., `useLoginFlow`)
2. **Presentation** → React components (pure JSX)
3. **Side Effects** → TanStack Router loaders/actions

**Example: LoginPage**

```typescript
// ✅ Good: Logic extracted to custom hook
function useLoginFlow() {
  const [step, setStep] = useState<'LOGIN' | 'VERIFY'>('LOGIN')
  // ... all state, derived values, handlers
  return { state, actions }
}

function LoginPage() {
  const { state, actions } = useLoginFlow()
  return <div>{/* Pure JSX using state/actions */}</div>
}
```

**Benefits:**
- ✅ Easy to test hooks in isolation
- ✅ Components are easier to read (just UI)
- ✅ Reusable logic across components
- ✅ Clear separation of concerns

## Routing (TanStack Router)

### Overview

TanStack Router provides type-safe routing with:
- **File-based routing** - Routes defined by file structure
- **Loaders** - Fetch data before rendering
- **Actions** - Handle form submissions
- **Protected routes** - Auth checks via `beforeLoad`
- **Router context** - Share global state (e.g., auth service)

### Quick Start

```bash
cd frontend
pnpm dev  # Start dev server
```

**Note:** Start backend (`cd api && pnpm dev`) if routes need API access.

### Authentication with TanStack Router

#### Step 1: Create API Client with Credentials

```typescript
// src/lib/api.ts
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:40080',
  withCredentials: true, // 🔥 Sends session cookies
  headers: { 'Content-Type': 'application/json' }
})
```

#### Step 2: Create Auth Service

```typescript
// src/lib/auth.ts
import { api } from './api'

export const authService = {
  async getUser() {
    const { data } = await api.get('/auth/me')
    return data
  },
  
  async signIn(email: string) {
    const { data } = await api.post('/auth/signin', { email })
    return data
  },
  
  async signInConfirm(email: string, code: string) {
    const { data } = await api.post('/auth/signin/confirm', { email, code })
    return data
  },
  
  async signOut() {
    await api.post('/auth/signout')
  }
}
```

#### Step 3: Add Auth to Router Context

```typescript
// src/routes/__root.tsx
import { createRootRouteWithContext } from '@tanstack/react-router'
import { authService } from '@/lib/auth'

interface RouterContext {
  auth: typeof authService
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent
})
```

```typescript
// src/main.tsx
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { authService } from './lib/auth'

const router = createRouter({
  routeTree,
  context: { auth: authService }
})

// ...
<RouterProvider router={router} />
```

#### Step 4: Create Protected Route Layout

```typescript
// src/routes/_authenticated.tsx
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    try {
      const user = await context.auth.getUser()
      return { user }
    } catch {
      throw redirect({
        to: '/login',
        search: { redirect: location.href } // Redirect back after login
      })
    }
  },
  component: () => <Outlet />
})
```

#### Step 5: Nest Protected Routes

```typescript
// src/routes/_authenticated/calendar.tsx
import { createFileRoute } from '@tanstack/react-router'
import CalendarPage from '@/pages/CalendarPage'

export const Route = createFileRoute('/_authenticated/calendar')({
  component: CalendarPage
})

function CalendarPage() {
  const { user } = Route.useRouteContext() // Access user from layout
  return <div>Welcome {user.email}!</div>
}
```

### File Structure for Routes

```
src/routes/
├── __root.tsx           # Root layout (shared context)
├── _authenticated.tsx   # Protected route layout
├── _authenticated/
│   ├── calendar.tsx     # /calendar (protected)
│   └── settings.tsx     # /settings (protected)
└── login.tsx            # /login (public)
```

### Loaders vs Custom Hooks

**When to use Loaders:**
- ✅ Fetching data from API before render
- ✅ Auth checks / redirects
- ✅ Data needed by multiple child routes

**When to use Custom Hooks:**
- ✅ Component-specific UI state
- ✅ Form handling logic
- ✅ Derived calculations
- ✅ Event handlers

**Example:**
```typescript
// Route loader for data fetching
export const Route = createFileRoute('/events')({
  loader: async ({ context }) => {
    const events = await context.api.get('/events')
    return { events }
  }
})

// Custom hook for UI logic
function useEventFilters() {
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('all')
  // ... filter logic
  return { filters, setters }
}
```

## Authentication Flow

### Session-Based Auth (Passport.js + Redis)

The backend uses **session cookies** (not JWT):
- Login: `POST /auth/signin` → email sent with 6-digit code
- Verify: `POST /auth/signin/confirm` → creates session, returns user
- Session stored in Redis, cookie sent automatically by browser
- Protected routes: Check session with `GET /auth/me`

### Frontend Implementation

1. **Login Flow:**
   - User enters xname → `POST /auth/signin`
   - User enters code → `POST /auth/signin/confirm`
   - Session cookie set automatically
   - Navigate to protected route

2. **Authenticated Requests:**
   - All API calls include `withCredentials: true`
   - Browser sends session cookie automatically
   - No need to manually manage tokens

3. **Logout:**
   - Call `POST /auth/signout`
   - Session destroyed on backend
   - Browser discards cookie

**See:** `../../di-fis-ka.wiki/development/frontend-authentication-integration.md` for complete guide.

## Development

### Run Dev Server
```bash
cd frontend
pnpm dev
```

### Build for Production
```bash
pnpm run build
```

### Lint & Format
```bash
pnpm run lint
pnpm run format
```

## Environment Variables

Create `.env` in `frontend/`:

```bash
VITE_API_URL=http://localhost:40080
```

For production:
```bash
VITE_API_URL=https://api.diar4fis.cz
```

## Common Tasks

### Add New Protected Route
1. Create file: `src/routes/_authenticated/my-page.tsx`
2. Define route with `createFileRoute`
3. Access user via `Route.useRouteContext()`

### Add New API Endpoint
1. Add method to `src/lib/auth.ts` or create new service
2. Use in loader or custom hook
3. Handle errors with try/catch

### Add Translation
1. Add key to `src/i18n/cs.json` and `en.json`
2. Use in component: `const { t } = useTranslation()`
3. Access: `t('my.translation.key')`

## Further Reading

- [TanStack Router Docs](https://tanstack.com/router/latest)
- [Frontend Auth Integration Guide](../../di-fis-ka.wiki/development/frontend-authentication-integration.md)
- [API Documentation](../../di-fis-ka.wiki/development/api-docs.md)
