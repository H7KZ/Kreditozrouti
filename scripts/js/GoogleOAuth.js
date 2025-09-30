// Usage example (run in terminal):
// node CreateGoogleAccessToken.js --CLIENT_ID=your_client_id --CLIENT_SECRET=your_client_secret --SCOPES=https://www.googleapis.com/auth/gmail.send

import { google } from 'googleapis'
import http from 'http'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({
    path: [path.resolve(process.cwd(), '../.env'), path.resolve(process.cwd(), '../../.env'), path.resolve(process.cwd(), '.env')]
})

let CLIENT_ID, CLIENT_SECRET, SCOPES

process.argv.forEach(arg => {
    if (arg.startsWith('--CLIENT_ID=')) {
        CLIENT_ID = arg.split('=')[1]
    } else if (arg.startsWith('--CLIENT_SECRET=')) {
        CLIENT_SECRET = arg.split('=')[1]
    } else if (arg.startsWith('--SCOPES=')) {
        SCOPES = arg.split('=')[1].split(',')
    }
})

if (!CLIENT_ID) CLIENT_ID = process.env.GOOGLE_CLIENT_ID
if (!CLIENT_SECRET) CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
if (!SCOPES) SCOPES = (process.env.GOOGLE_SCOPES || '').split(',')

const Oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'http://localhost:48080'
)

const url = Oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES
})

console.log('Authorize this app by visiting this url:', url)
console.log('Waiting for authorization code on http://localhost:48080 ...')

http.createServer(function (req, res) {
    const urlParams = new URL(req.url || '', 'http://localhost:48080').searchParams
    const CODE = urlParams.get('code') || ''

    Oauth2Client.getToken(CODE)
        .then(({ tokens }) => Oauth2Client.setCredentials(tokens))
        .then(() =>
            console.log(`
                Access Token: ${Oauth2Client.credentials.access_token}
                Refresh Token: ${Oauth2Client.credentials.refresh_token}
                Expiry Date: ${new Date(Oauth2Client.credentials.expiry_date || 0).toISOString()}
            `))
        .catch((err) => console.error('Error retrieving access token', err))
        .finally(() => process.exit(0))
}).listen(48080, 'localhost')
