import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [xname, setXname] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submitting:', xname)
    navigate({ to: '/calendar' })
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-6">
      <div className="text-center pb-8 pt-6">
        <div className="flex justify-center mb-4">
          <img src="/diar4fis.svg" alt={t('app_logo_alt')} className="h-56 md:h-64 select-none" />
        </div>
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
          {t('login_heading')}
        </h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="xname" className="text-base text-gray-900">
                {t('xname_label')}
              </Label>
              <div className="relative w-full">
                <Input
                  id="xname"
                  type="text"
                  placeholder="xname"
                  value={xname}
                  onChange={e => setXname(e.target.value)}
                  className="bg-white pr-24 h-[40px] text-base placeholder:text-base"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
                  @vse.cz
                </span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg font-medium bg-brand hover:bg-brand-hover text-gray-900"
            >
              {t('send_button')}
            </Button>

            <div className="text-left">
              <a href="#" className="text-gray-900 underline hover:text-gray-700 text-base">
                {t('already_have_code')}
              </a>
            </div>
      </form>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-black rounded-full" />
    </div>
  )
}
