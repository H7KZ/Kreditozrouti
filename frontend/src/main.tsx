import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "temporal-polyfill/global"
import "@frontend/index.css"
import "@frontend/i18n/config"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { AuthProvider } from "@frontend/contexts/AuthContext"
import { Route as RootRoute } from "@frontend/routes/__root"
import { Route as CalendarRoute } from "@frontend/routes/calendar"
import { Route as LoginRoute } from "@frontend/routes/login"
import { Route as LoginAliasRoute } from "@frontend/routes/login.alias"
import { Route as ProfileRoute } from "@frontend/routes/profile"
import { Route as SignInConfirmPage } from "@frontend/routes/signin-confirm"

const routeTree = RootRoute.addChildren([LoginRoute, SignInConfirmPage, LoginAliasRoute, CalendarRoute, ProfileRoute])

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
)
