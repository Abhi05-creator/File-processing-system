const express = require('express');
const route = express.Router();
const jobs = require('../models/jobmodel');

route.get('/jobs/:id', async (req, res) => {
    try {
        const job = await jobs.findById(req.params.id);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        res.status(200).json({
            success: true,
            status: job.status,
            filename: job.filename,
            filetype: job.filetype,
            result: job.result,
            word_frequency: job.word_frequency,
            error_message: job.error_message
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});

module.exports = route;