import { useState } from 'react'
import reactLogo from './assets/react.svg'
import Landing from './pages/Landing'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Landing/>
    </>
  )
}

export default App
