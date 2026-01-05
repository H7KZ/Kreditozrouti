"use client"

import { useNavigate, useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { DarkModeProvider } from "@frontend/components/DarkModeSwitcher"
import LanguageSwitcher from "@frontend/components/LanguageSwitcher"
import { Route as EventRoute } from "@frontend/routes/event"
import { eventService } from "@frontend/services/EventService"
import type { Event } from "@frontend/types/event"

const formatDateTime = (value?: string | Date | null): string => {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("cs-CZ")
}

export default function EventDetailPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { eventId } = useParams({ from: EventRoute.fullPath })

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await eventService.getEventById(eventId)
        setEvent(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load event")
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [eventId])

  const parsedDatetime = useMemo(() => {
    if (!event?.datetime) return null
    const start = new Date(event.datetime)
    const end = new Date(start.getTime() + 60 * 60 * 1000) // +1 hour default duration
    return { start, end }
  }, [event?.datetime])

  const renderBody = () => {
    if (loading) {
      return <div className="flex h-96 items-center justify-center text-lg text-gray-600 dark:text-gray-300">{t("common.loading") || "Načítání..."}</div>
    }

    if (error) {
      return (
        <div className="rounded-lg bg-red-100 p-4 text-red-700 dark:bg-red-900 dark:text-red-200">
          <p className="font-semibold">{t("common.error") || "Chyba"}</p>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700">
            {t("common.retry") || "Zkusit znovu"}
          </button>
        </div>
      )
    }

    if (!event) {
      return <div className="rounded-lg bg-yellow-100 p-4 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{t("event_detail.not_found") || "Událost nenalezena."}</div>
    }

    return (
      <div className="rounded-lg bg-white p-6 shadow-lg dark:border dark:border-gray-700 dark:bg-gray-800 dark:shadow-xl">
        <h1 className="mb-4 text-3xl font-bold dark:text-gray-100">{event.title || t("event_detail_text.heading")}</h1>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("event_detail.start_time")}</p>
            <p className="text-lg dark:text-gray-100">{parsedDatetime?.start ? formatDateTime(parsedDatetime.start) : formatDateTime(event.datetime) || (t("common.unknown") as string)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("event_detail.end_time")}</p>
            <p className="text-lg dark:text-gray-100">{parsedDatetime?.end ? formatDateTime(parsedDatetime.end) : (t("common.unknown") as string)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("event_detail.location")}</p>
            <p className="text-lg dark:text-gray-100">{event.place ?? t("common.unknown")}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("event_detail.author")}</p>
            <p className="text-lg dark:text-gray-100">{event.author ?? t("common.unknown")}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("event_detail.description")}</p>
          <p className="text-base leading-relaxed dark:text-gray-200">{event.description ?? t("event_detail_text.description")}</p>
        </div>
      </div>
    )
  }

  return (
    <DarkModeProvider>
      <div className="mx-auto min-h-screen max-w-4xl p-6 dark:bg-gray-950">
        <div className="absolute right-6 top-6">
          <LanguageSwitcher />
        </div>

        {renderBody()}

        <div className="mt-4 flex gap-4">
          <button onClick={() => navigate({ to: "/calendar" })} className="flex-1 rounded-lg bg-green-600 px-6 py-3 text-lg font-semibold text-white shadow-md transition-colors hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800">
            ← {t("event_detail.back_to_calendar")}
          </button>

          <button className="flex-1 rounded-lg bg-green-600 px-6 py-3 text-lg font-semibold text-white shadow-md transition-colors hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800">{t("event_detail.register_button")}</button>
          <button className="flex-1 rounded-lg bg-green-600 px-6 py-3 text-lg font-semibold text-white shadow-md transition-colors hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800">
            {t("event_detail.participants_button")}
          </button>
        </div>
      </div>
    </DarkModeProvider>
  )
}
