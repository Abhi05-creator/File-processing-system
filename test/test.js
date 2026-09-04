require('dotenv').config({ path: './test/config.env' })

const { Queue } = require('bullmq')

const connection = {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME,
    tls: { rejectUnauthorized: false }
}

console.log('Connecting to:', connection.host, connection.port)

const myqueue = new Queue('file-processing', { connection })

myqueue.on('error', (err) => {
    console.error('Queue Error:', err.message)
})

const addjob = async () => {
    try {
        console.log('Adding job...')
        const add = await myqueue.add('filenew', { hello: "world" })
        console.log(`Added job with id: ${add.id}`)
        await myqueue.close()
        process.exit(0)
    } catch (err) {
        console.error('Failed to add job:', err.message)
        await myqueue.close()
        process.exit(1)
    }
}

addjob()
