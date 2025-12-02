import React, { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'

interface CuteErrorProps {
  title?: string
  description?: string
  redirectTo?: string
  delayMs?: number
}

const CuteError: React.FC<CuteErrorProps> = ({
  title = 'Oops! Něco se pokazilo',
  description = 'Za chvilku tě přesměruji…',
  redirectTo = '/thankssss',
  delayMs = 2000,
}) => {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => {
      navigate({ to: redirectTo })
    }, delayMs)
    return () => clearTimeout(t)
  }, [navigate, redirectTo, delayMs])

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-6 w-24 h-24 rounded-full bg-pink-100 flex items-center justify-center">
          <span className="text-3xl">😿</span>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-gray-700">{description}</p>
        <div className="mt-6 inline-flex items-center text-gray-900">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Přesměrovávám…</span>
        </div>
      </div>
    </div>
  )
}

export default CuteError
