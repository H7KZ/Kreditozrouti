'use client'
import { useNavigate } from '@tanstack/react-router'

export default function EventDetailPage() {
    const navigate = useNavigate()

  const event = {
    id: 1,
    title: 'Test Event',
    start: new Date().toISOString(),
    end: new Date(Date.now() + 3600000).toISOString(),
    description: 'Toto je detailní popis události. Zde můžeš vidět všechny informace o akci.',
    place: 'Místnost 123',
    author: 'Jan Novák',
    language: 'cs',
  }

  return (
    <div className='max-w-4xl mx-auto p-6'>

        <div className='bg-white rounded-lg shadow-lg p-6'>
        <h1 className='text-3xl font-bold mb-4'>{event.title}</h1>

        <div className='grid grid-cols-2 gap-4 mb-6'>
            <div>
            <p className='text-sm text-gray-600'>Začátek</p>
            <p className='text-lg'>{new Date(event.start).toLocaleString('cs-CZ')}</p>
            </div>
            <div>
            <p className='text-sm text-gray-600'>Konec</p>
            <p className='text-lg'>{new Date(event.end).toLocaleString('cs-CZ')}</p>
            </div>
            <div>
            <p className='text-sm text-gray-600'>Místo</p>
            <p className='text-lg'>{event.place}</p>
            </div>
            <div>
            <p className='text-sm text-gray-600'>Autor</p>
            <p className='text-lg'>{event.author}</p>
            </div>
        </div>

        <div>
            <p className='text-sm text-gray-600'>Popis</p>
            <p className='text-base leading-relaxed'>{event.description}</p>
        </div>
        </div>

        <button
            onClick={() => navigate({ to: '/calendar' })}
            className='mt-6 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-lg rounded-lg shadow-md transition-colors'
            >
            ← Zpět na kalendář
        </button>
    </div>
  )
}