import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [xname, setXname] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmCode, setShowConfirmCode] = useState(false)
  const [confirmCode, setConfirmCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const normalizedXname = xname.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)
  const isValidXname = /^[a-zA-Z0-9]{6}$/.test(normalizedXname)
  const formatCode = (code: string) => code.replace(/\D/g, '').slice(0, 8).replace(/(\d{2})(?=\d)/g, '$1-')
  const formattedConfirmCode = formatCode(confirmCode)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidXname) return
    setIsLoading(true)
    
    setTimeout(() => {
      setIsLoading(false)
      setShowConfirmCode(true)
    }, 2000)
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-6">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>
      <div className="text-center pb-8 pt-6">
        <div className="flex justify-center mb-4">
          <img
            src="/diar4fis.svg"
            alt={t('app_logo_alt')}
            className="h-56 md:h-64 select-none"
          />
        </div>
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
          {showConfirmCode ? t('post_email_heading') : t('login_heading')}
        </h1>
        {showConfirmCode && (
          <div className="flex justify-center mt-4">
            <img
              src="/mail.svg"
              alt={t('mail_icon_alt')}
              className="h-28 md:h-32 select-none"
            />
          </div>
        )}
      </div>
      
      {!showConfirmCode ? (
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
                value={normalizedXname}
                onChange={e => setXname(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="bg-white pr-24 h-[40px] text-base placeholder:text-base"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
                @vse.cz
              </span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !isValidXname}
            className="w-full h-14 text-lg font-medium bg-brand hover:bg-brand-hover text-gray-900 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading && (
              <svg 
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isLoading ? t('sending_button') : t('send_button')}
          </Button>

          <div className="text-left">
            <a href="#" className="text-gray-900 underline hover:text-gray-700 text-base">
              {t('already_have_code')}
            </a>
          </div>
        </form>
      ) : (
        <form
          className="space-y-6"
          noValidate // have to validate it myself
          onSubmit={(e) => {
            e.preventDefault()
            const raw = confirmCode.replace(/\D/g, '')
            console.log('Confirm code being sent:', raw)
            console.log('Confirm code raw state:', confirmCode)
            console.log('Confirm code length:', raw.length)
            if (raw.length !== 8) return
            setIsVerifying(true)
            setTimeout(() => {
              setIsVerifying(false)
              navigate({ to: '/calendar' })
            }, 2000)
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="confirmCode" className="text-base text-gray-900">
              {t('confirm_code_label')}
            </Label>
            <Input
              id="confirmCode"
              type="text"
              inputMode="numeric"
              pattern="(\\d{2}-){3}\\d{2}"
              maxLength={11}
              placeholder="00-00-00-00"
              value={formattedConfirmCode}
              onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="bg-white h-[40px] text-base placeholder:text-base tracking-widest font-mono"
            />
          </div>

          <Button
            type="submit"
            disabled={isVerifying || confirmCode.replace(/\D/g, '').length !== 8}
            className="w-full h-14 text-lg font-medium bg-brand hover:bg-brand-hover text-gray-900 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isVerifying && (
              <svg 
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isVerifying ? t('sending_button') : t('verify_code_button')}
          </Button>

          <div className="text-left">
            <button type="button" className="text-gray-900 underline hover:text-gray-700 text-base">
              {t('resend_code_link')}
            </button>
          </div>
        </form>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-black rounded-full" />
    </div>
  )
}
