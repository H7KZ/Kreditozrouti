import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "temporal-polyfill/global"
import "$frontend/index.css"
import "$frontend/i18n/config"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { AuthProvider } from "@/contexts/AuthContext"
import { Route as RootRoute } from "@/routes/__root"
import { Route as CalendarRoute } from "@/routes/calendar"
import { Route as LoginRoute } from "@/routes/login"
import { Route as LoginAliasRoute } from "@/routes/login.alias"
import { Route as ProfileRoute } from "@/routes/profile"

const routeTree = RootRoute.addChildren([LoginRoute, LoginAliasRoute, CalendarRoute, ProfileRoute])

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
