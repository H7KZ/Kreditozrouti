import { useNavigate } from "@tanstack/react-router"
import { Calendar, HelpCircle, LogOut, Medal, Moon, Sun, User, UserPlus, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import AuthService from "@frontend/services/AuthService.ts"
import { useDarkMode } from "./DarkModeSwitcher"
import LanguageSwitcher from "./LanguageSwitcher"
import { Button } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"

export default function Navbar() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { isDark, toggleDarkMode } = useDarkMode()

  const signOut = async () => AuthService.signOut()

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-950">
      {/* Logo */}
      <div className="flex items-center">
        <img src={isDark ? "/diar_fisaka_dark.svg" : "/diar_fisaka.svg"} alt={t("common.app_logo_alt")} className="h-10 w-auto origin-left scale-150 transform dark:bg-gray-950" />
      </div>

      <div className="flex items-center gap-4">
        <LanguageSwitcher />

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="flex h-10 w-10 items-center justify-center p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
              <User className="h-8 w-8 scale-150 transform" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
              <User className="h-4 w-4" />
              <span>{t("user_dropdown.profile")}</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate({ to: "/calendar" })}>
              <Calendar className="h-4 w-4" />
              <span>{t("user_dropdown.my_events")}</span>
            </DropdownMenuItem>

            <DropdownMenuItem>
              <Medal className="h-4 w-4" />
              <span>{t("user_dropdown.leaderboard")}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <Users className="h-4 w-4" />
              <span>{t("user_dropdown.groups")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <UserPlus className="h-4 w-4" />
              <span>{t("user_dropdown.invite_fisaks")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleDarkMode}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{isDark ? t("user_dropdown.light_mode") : t("user_dropdown.dark_mode")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HelpCircle className="h-4 w-4" />
              <span>{t("user_dropdown.support")}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span>{t("user_dropdown.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
