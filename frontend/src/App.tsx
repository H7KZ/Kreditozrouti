import LoginPage from "@frontend/pages/LoginPage"
import LanguageSwitcher from "./components/LanguageSwitcher"

function App() {
  return (
    <div className="relative min-h-screen w-full">
      <div className="absolute right-4 top-4 z-50">
        <LanguageSwitcher />
      </div>
      <main className="min-h-screen w-full bg-white px-6 pt-8">
        <LoginPage />
      </main>
    </div>
  )
}
export default App
