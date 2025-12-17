import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="text-center">
        {/* 404 Text */}
        <h1 className="mb-4 text-9xl font-bold text-gray-900">404</h1>

        {/* Description */}
        <p className="mb-2 text-2xl font-semibold text-gray-700">Page Not Found</p>
        <p className="mb-8 max-w-md text-gray-500">Sorry, the page you're looking for doesn't exist. It might have been moved or deleted.</p>

        {/* Navigation Buttons */}
        <div className="flex justify-center gap-4">
          <Button onClick={() => navigate({ to: "/" })} className="bg-brand px-6 py-2 text-gray-900 hover:bg-brand-hover">
            Go to Login
          </Button>
          <Button onClick={() => navigate({ to: "/calendar" })} variant="outline" className="border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-100">
            Go to Calendar
          </Button>
        </div>
      </div>
    </div>
  )
}
