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

export default function Navbar() {
  const { t } = useTranslation()

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-6">
      {/* Logo */}
      <div className="flex items-center">
        <img
          src="/diar4fis.svg"
          alt="Diar4FIS"
          className="h-16 w-auto"
        />
      </div>

      {/* User Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-12 w-12 text-gray-600 hover:text-gray-900">
            <User className="h-7 w-7" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Group 1 */}
          <DropdownMenuItem>
            <User className="h-4 w-4" />
            <span>{t('userDropdown.profile')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Calendar className="h-4 w-4" />
            <span>{t('userDropdown.myEvents')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Medal className="h-4 w-4" />
            <span>{t('userDropdown.leaderboard')}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Group 2 */}
          <DropdownMenuItem>
            <Users className="h-4 w-4" />
            <span>{t('userDropdown.groups')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <UserPlus className="h-4 w-4" />
            <span>{t('userDropdown.inviteFisaks')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HelpCircle className="h-4 w-4" />
            <span>{t('userDropdown.support')}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Group 3 */}
          <DropdownMenuItem>
            <LogOut className="h-4 w-4" />
            <span>{t('userDropdown.logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}

