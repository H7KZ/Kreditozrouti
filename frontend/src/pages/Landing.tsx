import { CalendarIcon } from 'lucide-react' // Using Lucide for the calendar icon
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

/**
 * Renders the sign-in page based on the provided image.
 */
export default function SignInPage() {
    // State for the input field (optional but good practice)
    const [username, setUsername] = React.useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Handle form submission logic here
        console.log('Submitting username:', username)
    }

    return (
        // Centering the content on the screen
        <div className='flex min-h-screen items-center justify-center bg-gray-900 p-4'>
            {/* The main card/container, with a fixed width to mimic the app screen */}
            <Card className='w-full max-w-sm border-none shadow-none bg-white'>
                <CardHeader className='text-center pb-8 pt-12'>
                    {/* Logo/Icon Area */}
                    <div className='flex flex-col items-center mb-6'>
                        {/* Logo from the image: Green Calendar Icon and "fis" text */}
                        <div className='flex items-center space-x-0.5'>
                            <div className='relative w-14 h-14'>
                                <CalendarIcon className='w-full h-full text-white bg-[#00A753] p-2 rounded-lg' />
                                <span className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-xs font-bold'>4</span>
                            </div>
                            <span className='text-6xl font-extrabold tracking-tight text-black'>fis</span>
                        </div>
                    </div>

                    {/* Main Title/Instruction */}
                    <CardTitle className='text-2xl font-semibold text-black leading-snug'>Připoj se pomocí svého školního e-mailu</CardTitle>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className='grid gap-4'>
                            {/* Input Field Label/Hint */}
                            <div className='text-left text-sm font-medium text-gray-700'>Tvůj školní xname (např. novj08)</div>

                            {/* Xname Input */}
                            <div className='flex items-center'>
                                <Input
                                    id='xname'
                                    type='text'
                                    placeholder='xname'
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    // Styling to match the original input box look
                                    className='rounded-r-none focus-visible:ring-offset-0 focus-visible:ring-0 text-base py-6 pr-0 border-r-0'
                                />
                                {/* Fixed @vse.cz suffix */}
                                <div
                                    className='flex items-center justify-center h-full border border-l-0 rounded-r-md bg-gray-50 px-3 text-gray-500 text-sm py-6'
                                    style={{ borderColor: 'hsl(214.3 31.8% 91.4%)' }} // To match shadcn's border color
                                >
                                    @vse.cz
                                </div>
                            </div>

                            {/* Main Action Button */}
                            <Button type='submit' className='w-full bg-[#00A753] hover:bg-[#009249] text-white text-base font-semibold py-6 mt-4'>
                                Poslat potvrzení
                            </Button>

                            {/* Secondary Link/Action */}
                            <div className='text-center mt-2'>
                                <a
                                    href='#'
                                    onClick={e => {
                                        e.preventDefault()
                                        console.log('Code received clicked')
                                    }}
                                    className='text-sm text-gray-600 underline hover:text-gray-900'
                                >
                                    Kód už jsem dostal
                                </a>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Bottom indicator bar (mimicking mobile UI) */}
            <div className='absolute bottom-4 w-1/3 h-1 bg-black rounded-full' />
        </div>
    )
}
