import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Mail, User } from "lucide-react"
import React, { useState } from "react"

const PersonalProfilePage: React.FC = () => {
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<"personal" | "registration">("personal")

  return (
    <div className="min-h-screen bg-white">
      {/* --- HLAVIČKA --- */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-4">
        <div className="relative mx-auto flex max-w-md items-center justify-between">
          {/* Tlačítko Zpět */}
          <button onClick={() => navigate({ to: "/calendar" })} className="absolute left-0 rounded-full p-2 transition-colors hover:bg-gray-100">
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </button>

          <h1 className="w-full text-center text-xl font-semibold text-gray-900">Osobní profil</h1>
        </div>
      </div>

      <div className="mx-auto max-w-md px-6 py-8">
        <div className="mb-8 flex rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab("personal")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${activeTab === "personal" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            Osobní údaje
          </button>
          <button
            onClick={() => setActiveTab("registration")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${activeTab === "registration" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            Registrace akcí
          </button>
        </div>

        {activeTab === "personal" && (
          <div className="rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <User className="h-5 w-5 text-gray-700" />
              <h2 className="text-lg font-medium text-gray-900">Osobní údaje</h2>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">Křestní jméno</label>
                <input type="text" defaultValue="Jan" className="w-full rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-blue-100" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">Příjmení</label>
                <input type="text" defaultValue="Novák" className="w-full rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-blue-100" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">Datum narození</label>
                <input type="date" placeholder="DD.MM.RRRR" defaultValue="1.1.2000" className="w-full rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
          </div>
        )}

        {activeTab === "registration" && (
          <div className="rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-700" />
              <h2 className="text-lg font-medium text-gray-900">Registrační údaje</h2>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">Email</label>
                <input type="email" defaultValue="SleeplsOptional@vse.cz" className="w-full rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500 outline-none" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">Název týmu</label>
                <input type="text" placeholder='"Název týmu"' className="w-full rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-blue-100" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">Počet členů</label>
                <input type="number" defaultValue="8" className="w-full rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:ring-2 focus:ring-blue-100" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm text-gray-600">Souhlas se zpracováním údajů*</label>
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
