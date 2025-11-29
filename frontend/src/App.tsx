import Landing from '$frontend/pages/Landing'
import '$frontend/App.css'

function App() {
    return (
        <>
            <div className="fixed top-0 right-0 p-4 z-[9999]">
                <LanguageSwitcher />
            </div>
            <main className="w-full min-h-screen grid place-items-center">
                <Landing />
            </main>
        </>
    )
}

export default App
