import { useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAuth } from "@frontend/contexts/AuthContext"

export default function SignInConfirmPage() {
  const { signInConfirm } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const effectRan = useRef(false) // Prevents double-firing in Strict Mode

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    if (effectRan.current) return
    effectRan.current = true

    const confirmLogin = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get("code")

      if (!code) {
        setStatus("error")
        setErrorMessage(t("auth.error_missing_code") || "Missing confirmation code.")
        return
      }

      try {
        await signInConfirm(code)
        setStatus("success")
        setTimeout(() => {
          navigate({ to: "/calendar" })
        }, 1500)
      } catch (error) {
        console.error("Auto-confirm failed:", error)
        setStatus("error")
        setErrorMessage(t("auth.error_invalid_code") || "Invalid or expired code. Please try again.")
      }
    }

    confirmLogin()
  }, [navigate, signInConfirm, t])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
        <div className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-600 dark:border-gray-700 dark:border-t-green-500"></div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t("auth.verifying_code") || "Verifying your login..."}</h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">{t("auth.please_wait") || "Please wait while we log you in."}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t("auth.success") || "Successfully logged in!"}</h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">{t("auth.redirecting") || "Redirecting you to the app..."}</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t("auth.failed") || "Login Failed"}</h2>
              <p className="mt-2 text-red-600 dark:text-red-400">{errorMessage}</p>
              <button onClick={() => navigate({ to: "/login" })} className="mt-6 w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200">
                {t("auth.back_to_login") || "Back to Login"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
