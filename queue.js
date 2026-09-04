const { Queue } = require('bullmq');

const connection = {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
};

const fileQueue = new Queue('file-processing', { connection });

fileQueue.on('error', (err) => {
    console.error('Queue Error:', err.message);
});

module.exports = fileQueue;