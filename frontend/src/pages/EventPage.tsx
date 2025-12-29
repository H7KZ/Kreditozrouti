"use client"

import { useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import { DarkModeProvider } from "@/components/DarkModeSwitcher"

export default function EventDetailPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const event = {
    id: 1,
    title: t("event_detail_text.heading"),
    start: new Date().toISOString(),
    end: new Date(Date.now() + 3600000).toISOString(),
    description: t("event_detail_text.description"),
    place: t("event_detail_text.location"),
    author: t("event_detail_text.author"),
    language: "cs"
  }

  return (
    <DarkModeProvider>
      <div className="mx-auto min-h-screen max-w-4xl p-6 dark:bg-gray-950">
        <div className="absolute right-6 top-6">
          <LanguageSwitcher />
        </div>

        <div className="rounded-lg bg-white p-6 shadow-lg dark:border dark:border-gray-700 dark:bg-gray-800 dark:shadow-xl">
          <h1 className="mb-4 text-3xl font-bold dark:text-gray-100">{event.title}</h1>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("event_detail.start_time")}</p>
              <p className="text-lg dark:text-gray-100">{new Date(event.start).toLocaleString("cs-CZ")}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("event_detail.end_time")}</p>
              <p className="text-lg dark:text-gray-100">{new Date(event.end).toLocaleString("cs-CZ")}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("event_detail.location")}</p>
              <p className="text-lg dark:text-gray-100">{event.place}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("event_detail.author")}</p>
              <p className="text-lg dark:text-gray-100">{event.author}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("event_detail.description")}</p>
            <p className="text-base leading-relaxed dark:text-gray-200">{event.description}</p>
          </div>
        </div>

        <div className="mt-4 flex gap-4">
          <button onClick={() => navigate({ to: "/calendar" })} className="flex-1 rounded-lg bg-green-600 px-6 py-3 text-lg font-semibold text-white shadow-md transition-colors hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800">
            ← {t("event_detail.back_to_calendar")}
          </button>

          <button className="flex-1 rounded-lg bg-green-600 px-6 py-3 text-lg font-semibold text-white shadow-md transition-colors hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800">{t("event_detail.register_button")}</button>
          <button className="flex-1 rounded-lg bg-green-600 px-6 py-3 text-lg font-semibold text-white shadow-md transition-colors hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800">{t("event_detail.participants_button")}</button>
        </div>
      </div>
    </DarkModeProvider>
  )
}
