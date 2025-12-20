'use client'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function EventDetailPage() {
    const navigate = useNavigate()
    const { t } = useTranslation()

  const event = {
    id: 1,
    title: t('event_detail_text.heading'),
    start: new Date().toISOString(),
    end: new Date(Date.now() + 3600000).toISOString(),
    description: t('event_detail_text.description'),
    place: t('event_detail_text.location'),
    author: t('event_detail_text.author'),
    language: 'cs',
  }

  return (
    <div className='max-w-4xl mx-auto p-6'>
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>

        <div className='bg-white rounded-lg shadow-lg p-6'>
        <h1 className='text-3xl font-bold mb-4'>{event.title}</h1>

        <div className='grid grid-cols-2 gap-4 mb-6'>
            <div>
            <p className='text-sm text-gray-600'>{t('event_detail.start_time')}</p>
            <p className='text-lg'>{new Date(event.start).toLocaleString('cs-CZ')}</p>
            </div>
            <div>
            <p className='text-sm text-gray-600'>{t('event_detail.end_time')}</p>
            <p className='text-lg'>{new Date(event.end).toLocaleString('cs-CZ')}</p>
            </div>
            <div>
            <p className='text-sm text-gray-600'>{t('event_detail.location')}</p>
            <p className='text-lg'>{event.place}</p>
            </div>
            <div>
            <p className='text-sm text-gray-600'>{t('event_detail.author')}</p>
            <p className='text-lg'>{event.author}</p>
            </div>
        </div>

        <div>
            <p className='text-sm text-gray-600'>{t('event_detail.description')}</p>
            <p className='text-base leading-relaxed'>{event.description}</p>
        </div>
        </div>

        

        <div className='mt-4 flex gap-4'>
          <button
              onClick={() => navigate({ to: '/calendar' })}
              className='flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold text-lg rounded-lg shadow-md transition-colors'
              >
              ← {t('event_detail.back_to_calendar')}
          </button>

          <button
              className='flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold text-lg rounded-lg shadow-md transition-colors'
              >
              {t('event_detail.register_button')}
          </button>
          <button
              className='flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold text-lg rounded-lg shadow-md transition-colors'
              >
              {t('event_detail.participants_button')}
          </button>
        </div>
    </div>
  )
}