const fileQueue = require('../queue');
const Job = require('../models/jobmodel');
const supabase = require('../storage');











const uploadFile = async (req, res) => {

    if (!req.file) {
        return res.status(404).json({
            success: false,
            message: 'No file uploaded'
        });
    }

    let filename, uploadData, fileurl;
    try {
        filename = Date.now() + req.file.originalname;
        uploadData = await supabase.storage.from(process.env.SUPABASE_BUCKET).upload(filename, req.file.buffer, {
            contentType: req.file.mimetype,
        });

        if (uploadData.error) {
            return res.status(500).json({
                success: false,
                message: uploadData.error
            })
        }
        uploadurl = await supabase.storage.from(process.env.SUPABASE_BUCKET).getPublicUrl(filename);
        fileurl = uploadurl.data.publicUrl

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        })
    }

    try {
        // 1. Save file record to MongoDB with status 'queued'
        console.log('fileurl value right before saving:', fileurl);
        const newJob = await Job.create({
            filename: req.file.originalname,
            filetype: req.file.mimetype,
            file_url: fileurl,
            status: 'queued'
        });

        // 2. Add job to BullMQ queue with the MongoDB doc _id as reference
        // Also passing the buffer here so the queue worker can process it
        const bullJob = await fileQueue.add('process-file', {
            mongoId: newJob._id.toString(),

        });

        // The schema doesn't have a jobId field, so we just return it in the response
        return res.status(200).json({
            success: true,
            filename: newJob.filename,
            filetype: newJob.filetype,
            mongoId: newJob._id,
            jobId: bullJob.id,
            status: newJob.status
        });

    } catch (err) {
        console.error('Upload pipeline error:', err.message);
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

module.exports = { uploadFile };