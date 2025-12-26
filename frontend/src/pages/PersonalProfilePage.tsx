import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Mail, User } from "lucide-react"
import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import LanguageSwitcher from "@/components/LanguageSwitcher"

const PersonalProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [activeTab, setActiveTab] = useState<"personal" | "registration">("personal")

  return (
    <div className="min-h-screen bg-white">
      {/* --- HLAVIČKA --- */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-4">
        <div className="relative flex items-center justify-between">
          {/* Tlačítko Zpět */}
          <button onClick={() => navigate({ to: "/calendar" })} className="rounded-full p-2 transition-colors hover:bg-gray-100">
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </button>

          {/* Nadpis - absolutně vycentrovaný */}
          <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold text-gray-900">{t("profile.title")}</h1>

          {/* Přepínač jazyků */}
          <div className="z-20 flex items-center">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-6 py-8">
        {/* --- PŘEPÍNAČ ZÁLOŽEK --- */}
        <div className="mb-8 flex rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab("personal")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${activeTab === "personal" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t("profile.tabs.personal_info")}
          </button>
          <button
            onClick={() => setActiveTab("registration")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${activeTab === "registration" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t("profile.tabs.event_registration")}
          </button>
        </div>

        {/* --- OSOBNÍ ÚDAJE --- */}
        {activeTab === "personal" && (
          <div className="rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <User className="h-5 w-5 text-gray-700" />
              <h2 className="text-lg font-medium text-gray-900">{t("profile.personal_section.title")}</h2>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">{t("profile.fields.first_name")}</label>
                <input type="text" placeholder="Jan" className="w-full rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-blue-100" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">{t("profile.fields.last_name")}</label>
                <input type="text" placeholder="Novák" className="w-full rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-blue-100" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">{t("profile.fields.birth_date")}</label>
                <input type="text" placeholder="DD.MM.RRRR" defaultValue="1.1.2000" className="w-full rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
          </div>
        )}

        {/* --- REGISTRAČNÍ ÚDAJE --- */}
        {activeTab === "registration" && (
          <div className="rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-700" />
              <h2 className="text-lg font-medium text-gray-900">{t("profile.registration_section.title")}</h2>
            </div>

            <div className="space-y-5">
              {/* Email - ReadOnly */}
              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">{t("profile.fields.email")}</label>
                <input type="email" placeholder="SleeplsOptional@vse.cz" className="w-full rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500 outline-none" />
              </div>

              {/* Název týmu */}
              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">{t("profile.fields.team_name")}</label>
                <input type="text" placeholder={t("profile.placeholders.team_name")} className="w-full rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-blue-100" />
              </div>

              {/* Počet členů */}
              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">{t("profile.fields.member_count")}</label>
                <input type="number" defaultValue="8" className="w-full rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-blue-100" />
              </div>

              {/* Souhlas - ReadOnly */}
              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">{t("profile.fields.data_consent")}</label>
                <div className="relative">
                  <input type="text" defaultValue="Ano" className="w-full cursor-pointer rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PersonalProfilePage
