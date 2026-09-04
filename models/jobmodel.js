const mongoose = require('mongoose')


const jobSchema = mongoose.Schema({
    filetype: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    file_url: {
        type: String,
        required: false
    },

    status: {
        type: String,
        enum: ['queued', 'processing', 'success', 'failed'],
        default: 'queued'
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    result: [
        {
            label: String,
            url: String
        }
    ],
    word_frequency: {
        type: Object,
        default: {}
    },
    error_message: {
        type: String
    }

})
const jobs = mongoose.model('jobs', jobSchema)
module.exports = jobs