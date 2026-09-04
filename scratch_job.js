const mongoose = require('mongoose');
const jobs = require('./models/jobmodel');

mongoose.connect('mongodb://localhost:27017/file-pipeline')
    .then(async () => {
        const latestJob = await jobs.findOne().sort({ created_at: -1 });
        console.log(JSON.stringify(latestJob, null, 2));
        mongoose.disconnect();
    })
    .catch((err) => {
        console.error('Error:', err);
        process.exit(1);
    });
