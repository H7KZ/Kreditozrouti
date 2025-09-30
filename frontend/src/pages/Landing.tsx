import React, { useState } from 'react'

const Landing: React.FC = () => {
    const [email, setEmail] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Handle sign-in logic here
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#f5f5f5'
            }}
        >
            <img src='/logo.png' alt='Logo' style={{ width: 120, marginBottom: 32 }} />
            <form
                onSubmit={handleSubmit}
                style={{
                    background: '#fff',
                    padding: 32,
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 320
                }}
            >
                <label htmlFor='email' style={{ marginBottom: 12, fontSize: 18 }}>
                    Přihlaste se pomocí školního e-mailu
                </label>
                <input
                    id='email'
                    type='email'
                    placeholder='Váš školní e-mail'
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{
                        padding: '10px 14px',
                        fontSize: 16,
                        borderRadius: 4,
                        border: '1px solid #ccc',
                        marginBottom: 20,
                        width: '100%'
                    }}
                />
                <button
                    type='submit'
                    style={{
                        background: '#1976d2',
                        color: '#fff',
                        padding: '10px 24px',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 16,
                        cursor: 'pointer'
                    }}
                >
                    Poslat potvrzení
                </button>
            </form>
        </div>
    )
}

export default Landing
