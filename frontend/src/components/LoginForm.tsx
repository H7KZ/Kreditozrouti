"use client"

import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

export function LoginForm() {
  const { t } = useTranslation()
  const [xname, setXname] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Submitting:", xname)
  }

  return (
    <div className="w-[40%] min-w-[320px] max-w-md mx-auto">

      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
        {t("login_title")}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="xname" className="text-base text-gray-900">
            {t("xname_label")}
          </Label>
          <div className="relative w-full">
            <Input
              id="xname"
              type="text"
              placeholder="xname"
              value={xname}
              onChange={e => setXname(e.target.value)}
              className="bg-white pr-24 h-[40px] text-base placeholder:text-base"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
              @vse.cz
            </span>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-14 text-lg font-medium bg-[rgba(0,255,163,1)] hover:bg-[rgba(9,232,150,1)] text-gray-900"
        >
          {t("send_button")}
        </Button>

        <div className="text-center">
          <a href="#" className="text-gray-900 underline hover:text-gray-700 text-base">
            {t("already_have_code")}
          </a>
        </div>
      </form>
    </div>
  )
}
