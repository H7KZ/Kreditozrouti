import { useNavigate } from "@tanstack/react-router"
import { Calendar, HelpCircle, LogOut, Medal, User, UserPlus, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import LanguageSwitcher from "./LanguageSwitcher"
import { Button } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"

export default function Navbar() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex cursor-pointer items-center" onClick={() => navigate({ to: "/calendar" })}>
        <img src="/diar_fisaka.svg" alt="Diar4FIS" className="h-10 w-auto origin-left scale-150 transform" />
      </div>

      <div className="flex items-center gap-4">
        <LanguageSwitcher />

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="flex h-10 w-10 items-center justify-center p-0 text-gray-600 hover:text-gray-900">
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
            <DropdownMenuItem>
              <HelpCircle className="h-4 w-4" />
              <span>{t("user_dropdown.support")}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <LogOut className="h-4 w-4" />
              <span>{t("user_dropdown.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
