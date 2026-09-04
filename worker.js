const { Worker } = require('bullmq');
const dotenv = require('dotenv');
dotenv.config({ path: './test/config.env' });

const mongoose = require('mongoose');
const jobs = require('./models/jobmodel');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const dns = require('dns');
if (process.env.MONGO_URI && process.env.MONGO_URI.startsWith('mongodb+srv')) {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
}

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Worker connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

const connection = {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
}

async function extractTextFromPdf(buffer) {
    const pdfModule = require('pdf-parse');
    if (typeof pdfModule === 'function') {
        const data = await pdfModule(buffer);
        return data.text;
    } else if (pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: buffer });
        const data = await parser.getText();
        if (typeof parser.destroy === 'function') {
            await parser.destroy();
        }
        return data.text;
    }
    throw new Error('Unsupported pdf-parse version');
}

const worker = new Worker('file-processing', async (job) => {
    const { mongoId } = job.data;
    const jobdoc = await jobs.findById(mongoId)
    if (!jobdoc) {
        throw new Error('Job not found');
    }
    console.log('Full job doc:', jobdoc);
    const { file_url, filetype } = jobdoc;
    console.log(jobdoc)

    const work = await jobs.findByIdAndUpdate(mongoId, { status: 'processing' }, { runValidators: true })
    try {
        const response = await fetch(file_url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        console.log("buffer-len:", buffer.length);
        if (filetype === 'text/plain') {
            const stopWords = new Set([
                'the', 'a', 'an', 'is', 'are', 'was', 'were', 'and', 'or', 'of',
                'to', 'in', 'on', 'for', 'with', 'this', 'that', 'it', 'as', 'be',
                'at', 'by', 'from', 'but', 'not', 'has', 'have', 'had', 'i', 'you'
            ]);
            const text = buffer.toString('utf-8');
            const words = text.split(/\s+/)
            const freq = {};
            for (const word of words) {
                const cleanWord = word.toLowerCase().trim();
                if (cleanWord !== "" && !stopWords.has(cleanWord)) {
                    if (freq[cleanWord]) {
                        freq[cleanWord] += 1;
                    } else {
                        freq[cleanWord] = 1;
                    }
                }
            }

            await jobs.findByIdAndUpdate(mongoId, { word_frequency: freq }, { runValidators: true });

        }
        if (filetype.startsWith('image/')) {
            const sizes = [
                { label: 'small', width: 200 },
                { label: 'medium', width: 600 },
                { label: 'large', width: 1200 }
            ];

            const results = [];

            for (const size of sizes) {
                const resizedBuffer = await sharp(buffer).resize(size.width).toBuffer();

                const outputFilename = `${Date.now()}-${size.label}-${jobdoc.filename}`;

                const uploadData = await supabase.storage
                    .from(process.env.SUPABASE_BUCKET)
                    .upload(outputFilename, resizedBuffer, { contentType: filetype });

                if (uploadData.error) {
                    throw new Error(`Failed to upload ${size.label}: ${uploadData.error.message}`);
                }

                const urlData = supabase.storage
                    .from(process.env.SUPABASE_BUCKET)
                    .getPublicUrl(outputFilename);

                results.push({ label: size.label, url: urlData.data.publicUrl });
            }

            await jobs.findByIdAndUpdate(mongoId, { result: results }, { runValidators: true });
        }
        if (filetype === 'application/pdf') {
            const extractedText = await extractTextFromPdf(buffer);


            const outputFilename = `${Date.now()}-extracted-${jobdoc.filename}.txt`;

            const uploadData = await supabase.storage
                .from(process.env.SUPABASE_BUCKET)
                .upload(outputFilename, Buffer.from(extractedText, 'utf-8'), {
                    contentType: 'text/plain'
                });

            if (uploadData.error) {
                throw new Error(`Failed to upload extracted text: ${uploadData.error.message}`);
            }

            const urlData = supabase.storage
                .from(process.env.SUPABASE_BUCKET)
                .getPublicUrl(outputFilename);

            await jobs.findByIdAndUpdate(
                mongoId,
                { result: [{ label: 'extracted-text', url: urlData.data.publicUrl }] },
                { runValidators: true }
            );
        }

        console.log("job processin started")


        await jobs.findByIdAndUpdate(mongoId, { status: 'success' }, { runValidators: true })
    } catch (err) {
        console.error(`Job ${mongoId} failed:`, err.message);
        throw err;
    }


}, { connection })

worker.on('completed', (job) => {
    console.log(`job completed ${job.data.mongoId}`)
})

worker.on('failed', async (job, err) => {
    const { mongoId } = job.data;
    console.log(`job failed ${mongoId}','${err.message}`)
    if (job.attemptsMade >= (job.opts?.attempts || 1)) {
        await jobs.findByIdAndUpdate(
            mongoId,
            { status: 'failed', error_message: err.message },
            { runValidators: true }
        );
        console.log(`Job ${mongoId} permanently failed after ${job.attemptsMade} attempts`);
    }
})
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.status(200).send('Worker is running');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Worker health-check server listening on port ${PORT}`);
});