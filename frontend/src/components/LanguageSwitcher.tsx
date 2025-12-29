import React from "react"
import { useTranslation } from "react-i18next"

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation()

  const changeLanguage = (lng: string) => {
    void i18n.changeLanguage(lng)
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => changeLanguage("en")}
        className={`rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 ${i18n.resolvedLanguage === "en" ? "font-bold" : ""}`}>
        EN
      </button>
      <button
        onClick={() => changeLanguage("cs")}
        className={`rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 ${i18n.resolvedLanguage === "cs" ? "font-bold" : ""}`}>
        CS
      </button>
    </div>
  )
}

export default LanguageSwitcher
