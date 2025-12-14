import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [xname, setXname] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmCode, setShowConfirmCode] = useState(false)
  const [confirmCode, setConfirmCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const normalizedXname = xname.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6)
  const isValidXname = /^[a-zA-Z0-9]{6}$/.test(normalizedXname)
  const formatCode = (code: string) =>
    code
      .replace(/\D/g, "")
      .slice(0, 8)
      .replace(/(\d{2})(?=\d)/g, "$1-")
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
    <div className="mx-auto w-full max-w-2xl px-6 pt-16">
      <div className="absolute right-6 top-6">
        <LanguageSwitcher />
      </div>
      <div className="pb-8 pt-6 text-center">
        <div className="mb-4 flex justify-center">
          <img src="/diar4fis.svg" alt={t("common.app_logo_alt")} className="h-56 select-none md:h-64" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 md:text-2xl">{showConfirmCode ? t("sign_in_confirm.heading") : t("sign_in.heading")}</h1>
        {showConfirmCode && (
          <div className="mt-4 flex justify-center">
            <img src="/mail.svg" alt={t("sign_in_confirm.mail_icon_alt")} className="h-28 select-none md:h-32" />
          </div>
        )}
      </div>

      {!showConfirmCode ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="xname" className="text-base text-gray-900">
              {t("sign_in.xname_label")}
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
                className="h-[40px] bg-white pr-24 text-base placeholder:text-base"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base text-gray-400">@vse.cz</span>
            </div>
          </div>

          <Button type="submit" disabled={isLoading || !isValidXname} className="h-14 w-full bg-brand text-lg font-medium text-gray-900 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70">
            {isLoading && (
              <svg className="-ml-1 mr-3 h-5 w-5 animate-spin text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {isLoading ? t("common.sending_button") : t("sign_in.send_button")}
          </Button>

          <div className="text-left">
            <a href="#" className="text-base text-gray-900 underline hover:text-gray-700">
              {t("sign_in.already_have_code")}
            </a>
          </div>
        </form>
      ) : (
        <form
          className="space-y-6"
          noValidate
          onSubmit={e => {
            e.preventDefault()
            const raw = confirmCode.replace(/\D/g, "")
            console.log("Confirm code being sent:", raw)
            console.log("Confirm code raw state:", confirmCode)
            console.log("Confirm code length:", raw.length)
            if (raw.length !== 8) return
            setIsVerifying(true)
            setTimeout(() => {
              setIsVerifying(false)
              navigate({ to: "/calendar" })
            }, 2000)
          }}>
          <div className="space-y-2">
            <Label htmlFor="confirmCode" className="text-base text-gray-900">
              {t("sign_in_confirm.confirm_code_label")}
            </Label>
            <Input
              id="confirmCode"
              type="text"
              inputMode="numeric"
              pattern="(\\d{2}-){3}\\d{2}"
              maxLength={11}
              placeholder="00-00-00-00"
              value={formattedConfirmCode}
              onChange={e => setConfirmCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              className="h-[40px] bg-white font-mono text-base tracking-widest placeholder:text-base"
            />
          </div>

          <Button type="submit" disabled={isVerifying || confirmCode.replace(/\D/g, "").length !== 8} className="h-14 w-full bg-brand text-lg font-medium text-gray-900 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70">
            {isVerifying && (
              <svg className="-ml-1 mr-3 h-5 w-5 animate-spin text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {isVerifying ? t("common.sending_button") : t("sign_in_confirm.verify_code_button")}
          </Button>

          <div className="text-left">
            <button type="button" className="text-base text-gray-900 underline hover:text-gray-700">
              {t("sign_in_confirm.resend_code_link")}
            </button>
          </div>
        </form>
      )}

      <div className="absolute bottom-4 left-1/2 h-1 w-1/3 -translate-x-1/2 rounded-full bg-black" />
    </div>
  )
}
