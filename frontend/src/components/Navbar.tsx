import { useTranslation } from 'react-i18next'
import {
  User,
  Calendar,
  Medal,
  Users,
  UserPlus,
  HelpCircle,
  LogOut,
} from 'lucide-react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import LanguageSwitcher from './LanguageSwitcher'

export default function Navbar() {
  const { t } = useTranslation()

  return (
    <nav className="h-14 flex items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Logo */}
      <div className="flex items-center">
        <img
          src="/diar4fis.svg"
          alt="Diar4FIS"
          className="h-10 w-auto transform scale-150 origin-left"
        />
      </div>

      <div className="flex items-center gap-4">
        <LanguageSwitcher />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 p-0 text-gray-600 hover:text-gray-900 flex items-center justify-center">
              <User className="h-8 w-8 transform scale-150" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* Group 1 */}
            <DropdownMenuItem>
              <User className="h-4 w-4" />
              <span>{t('user_dropdown.profile')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Calendar className="h-4 w-4" />
              <span>{t('user_dropdown.my_events')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Medal className="h-4 w-4" />
              <span>{t('user_dropdown.leaderboard')}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Group 2 */}
            <DropdownMenuItem>
              <Users className="h-4 w-4" />
              <span>{t('user_dropdown.groups')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <UserPlus className="h-4 w-4" />
              <span>{t('user_dropdown.invite_fisaks')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HelpCircle className="h-4 w-4" />
              <span>{t('user_dropdown.support')}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Group 3 */}
            <DropdownMenuItem>
              <LogOut className="h-4 w-4" />
              <span>{t('user_dropdown.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
