import LanguageSwitcher from './components/LanguageSwitcher'
import Login from '$frontend/pages/Landing'

function App() {
    return (
        <div className="relative w-full min-h-screen">
            <div className="absolute top-4 right-4 z-50">
                <LanguageSwitcher />
            </div>
            <main className="w-full min-h-screen bg-white pt-8 px-6">
                <Login />
            </main>
        </div>
    )
}

export default App
