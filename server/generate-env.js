const fs = require('node:fs/promises')
const path = require('node:path')
const crypto = require('node:crypto')

async function generateEnv() {
	if (
		await fs
			.access('.env')
			.then(() => true)
			.catch(() => false)
	) {
		return
	}
	await fs.writeFile(
		'.env',
		`
# server
PORT = 5000
# db link
DB_LINK = 'postgres://postgres:root@localhost:5432/anidale'
# tokens
JWT_ACCESS_SECRET = '${crypto.randomBytes(128).toString('base64')}'
JWT_REFRESH_SECRET = '${crypto.randomBytes(128).toString('base64')}'
# api option
API_URL = 'http://localhost:5000'
CLIENT_URL = 'http://localhost:3000'`
	)
}

generateEnv()
