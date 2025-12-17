import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {/* 404 Text */}
        <h1 className="text-9xl font-bold text-gray-900 mb-4">404</h1>

        {/* Description */}
        <p className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</p>
        <p className="text-gray-500 mb-8 max-w-md">
          Sorry, the page you're looking for doesn't exist. It might have been moved or deleted.
        </p>

        {/* Navigation Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => navigate({ to: '/' })}
            className="bg-brand hover:bg-brand-hover text-gray-900 px-6 py-2"
          >
            Go to Login
          </Button>
          <Button
            onClick={() => navigate({ to: '/calendar' })}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-100 px-6 py-2"
          >
            Go to Calendar
          </Button>
        </div>
      </div>
    </div>
  )
}

