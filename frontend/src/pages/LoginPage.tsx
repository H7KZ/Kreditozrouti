import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"

// ============================================================================
// Helpers (outside component to avoid recreation on every render)
// ============================================================================

type Step = "LOGIN" | "VERIFY"

const XNAME_REGEX = /^[a-zA-Z0-9]{6}$/
const XNAME_MAX_LENGTH = 6
const CODE_LENGTH = 6

/**
 * Normalizes xname input to alphanumeric characters only, max 6 chars
 */
function normalizeXname(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, "").slice(0, XNAME_MAX_LENGTH)
}

/**
 * Validates if xname is exactly 6 alphanumeric characters
 */
function isValidXname(xname: string): boolean {
  return XNAME_REGEX.test(xname)
}

/**
 * Formats verification code as XX-XX-XX-XX
 */
function formatCode(code: string): string {
  const digitsOnly = code.replace(/\D/g, "").slice(0, CODE_LENGTH)
  return digitsOnly.replace(/(\d{2})(?=\d)/g, "$1-")
}

/**
 * Strips formatting from code to get raw digits
 */
function getRawCode(formattedCode: string): string {
  return formattedCode.replace(/\D/g, "")
}

// ============================================================================
// Custom Hook: useLoginFlow
// ============================================================================

interface LoginFlowState {
  step: Step
  xname: string
  normalizedXname: string
  confirmCode: string
  formattedConfirmCode: string
  isLoading: boolean
  isVerifying: boolean
  isXnameValid: boolean
  isCodeValid: boolean
  error: string
}

interface LoginFlowActions {
  setXname: (value: string) => void
  setConfirmCode: (value: string) => void
  handleLoginSubmit: (e: React.FormEvent) => void
  handleVerifySubmit: (e: React.FormEvent) => void
  handleResendCode: () => void
}

interface UseLoginFlowReturn {
  state: LoginFlowState
  actions: LoginFlowActions
}

function useLoginFlow(): UseLoginFlowReturn {
  const navigate = useNavigate()
  const { signIn, signInConfirm } = useAuth()

  // State
  const [step, setStep] = useState<Step>("LOGIN")
  const [xname, setXname] = useState("")
  const [confirmCode, setConfirmCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState("")

  // Derived state
  const normalizedXname = normalizeXname(xname)
  const formattedConfirmCode = formatCode(confirmCode)
  const isXnameValid = isValidXname(normalizedXname)
  const rawCode = getRawCode(confirmCode)
  const isCodeValid = rawCode.length === CODE_LENGTH

  // Actions
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isXnameValid) return

    setIsLoading(true)
    setError("")

    try {
      await signIn(`${normalizedXname}@vse.cz`)
      setStep("VERIFY")
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send verification code"
      setError(errorMessage)
      console.error("Sign-in error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isCodeValid) return

    setIsVerifying(true)
    setError("")

    try {
      await signInConfirm(`${normalizedXname}@vse.cz`, rawCode)
      navigate({ to: "/calendar" })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Invalid verification code"
      setError(errorMessage)
      console.error("Verification error:", err)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendCode = async () => {
    setIsLoading(true)
    setError("")

    try {
      await signIn(`${normalizedXname}@vse.cz`)
      setConfirmCode("")
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to resend code"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    state: {
      step,
      xname,
      normalizedXname,
      confirmCode,
      formattedConfirmCode,
      isLoading,
      isVerifying,
      isXnameValid,
      isCodeValid,
      error
    },
    actions: {
      setXname,
      setConfirmCode,
      handleLoginSubmit,
      handleVerifySubmit,
      handleResendCode
    }
  }
}

// ============================================================================
// Component: LoginPage
// ============================================================================

export default function LoginPage() {
  const { t } = useTranslation()
  const { state, actions } = useLoginFlow()

  const isVerifyStep = state.step === "VERIFY"

  return (
    <div className="mx-auto w-full max-w-2xl px-6">
      <div className="absolute right-6 top-6">
        <LanguageSwitcher />
      </div>

      {/* Header */}
      <div className="pb-8 pt-6 text-center">
        <div className="mb-4 flex justify-center">
          <img src="/diar4fis.svg" alt={t("common.app_logo_alt")} className="h-56 select-none md:h-64" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 md:text-2xl">{isVerifyStep ? t("sign_in_confirm.heading") : t("sign_in.heading")}</h1>
        {isVerifyStep && (
          <div className="mt-4 flex justify-center">
            <img src="/mail.svg" alt={t("sign_in_confirm.mail_icon_alt")} className="h-28 select-none md:h-32" />
          </div>
        )}
      </div>

      {/* Login Form */}
      {!isVerifyStep && (
        <form onSubmit={actions.handleLoginSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="xname" className="text-base text-gray-900">
              {t("sign_in.xname_label")}
            </Label>
            <div className="relative w-full">
              <Input
                id="xname"
                type="text"
                placeholder="xname"
                value={state.normalizedXname}
                onChange={e => actions.setXname(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="h-[40px] bg-white pr-24 text-base placeholder:text-base"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base text-gray-400">@vse.cz</span>
            </div>
          </div>

          <Button type="submit" disabled={state.isLoading || !state.isXnameValid} className="h-14 w-full bg-brand text-lg font-medium text-gray-900 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70">
            {state.isLoading && <LoadingSpinner />}
            {state.isLoading ? t("common.sending_button") : t("sign_in.send_button")}
          </Button>

          <div className="text-left">
            <a href="#" className="text-base text-gray-900 underline hover:text-gray-700">
              {t("sign_in.already_have_code")}
            </a>
          </div>
        </form>
      )}

      {/* Verify Form */}
      {isVerifyStep && (
        <form onSubmit={actions.handleVerifySubmit} className="space-y-6" noValidate>
          <div className="space-y-2">
            <Label htmlFor="confirmCode" className="text-base text-gray-900">
              {t("sign_in_confirm.confirm_code_label")}
            </Label>
            <Input
              id="confirmCode"
              type="text"
              inputMode="numeric"
              pattern="\\d{3}-\\d{3}"
              maxLength={7}
              placeholder="000-000"
              value={state.formattedConfirmCode}
              onChange={e => actions.setConfirmCode(e.target.value)}
              className="h-[40px] bg-white font-mono text-base tracking-widest placeholder:text-base"
            />
          </div>

          {state.error && <div className="text-sm text-red-600">{state.error}</div>}

          <Button type="submit" disabled={state.isVerifying || !state.isCodeValid} className="h-14 w-full bg-brand text-lg font-medium text-gray-900 hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70">
            {state.isVerifying && <LoadingSpinner />}
            {state.isVerifying ? t("common.sending_button") : t("sign_in_confirm.verify_code_button")}
          </Button>

          <div className="text-left">
            <button type="button" onClick={actions.handleResendCode} disabled={state.isLoading} className="text-base text-gray-900 underline hover:text-gray-700 disabled:opacity-50">
              {t("sign_in_confirm.resend_code_link")}
            </button>
          </div>
        </form>
      )}

      {/* Bottom Bar */}
      <div className="absolute bottom-4 left-1/2 h-1 w-1/3 -translate-x-1/2 rounded-full bg-black" />
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function LoadingSpinner() {
  return (
    <svg className="-ml-1 mr-3 h-5 w-5 animate-spin text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
