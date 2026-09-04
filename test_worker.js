const mongoose = require('mongoose');
const { Queue } = require('bullmq');
const dotenv = require('dotenv');
const jobs = require('./models/jobmodel');

// Load env vars for Redis connection
dotenv.config({ path: './test/config.env' });

const connection = {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
};

const fileQueue = new Queue('file-processing', { connection });

async function runTest() {
    try {
        // Connect to Mongo
        await mongoose.connect('mongodb://localhost:27017/file-pipeline');
        console.log('Connected to MongoDB');

        // Create a dummy job in MongoDB
        const jobDoc = await jobs.create({
            filetype: 'image/jpeg',
            filename: 'test_image.jpg',
            status: 'queued'
        });
        console.log(`Created MongoDB job document with ID: ${jobDoc._id}`);

        // Add the job to BullMQ
        await fileQueue.add('process-file', { id: jobDoc._id });
        console.log('Added job to BullMQ queue');
        
        // Wait a bit to let the worker (if running) process it
        setTimeout(() => {
            process.exit(0);
        }, 1000);
        
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

runTest();
