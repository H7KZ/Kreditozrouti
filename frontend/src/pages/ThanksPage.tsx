import React from 'react'

const ThanksPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow p-8 text-center max-w-md">
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <span className="text-3xl">💚</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Děkujeme!</h1>
        <p className="mt-2 text-gray-700">Všechno je hotovo. Můžeš pokračovat.</p>
      </div>
    </div>
  )
}

export default ThanksPage
