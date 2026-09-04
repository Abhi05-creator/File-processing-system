require('dotenv').config({ path: './test/config.env' });
const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const jobRoutes = require('./routes/jobroutes');

const uploadroutes = require('./routes/uploadroute')
mongoose.connect('mongodb://localhost:27017/file-pipeline')
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));


const app = express();
app.use(express.static('public'));
app.use('/', uploadroutes)
app.use('/', jobRoutes)



app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: err.message
        })
    }
    else if (err instanceof Error) {
        return res.status(400).json({
            success: false,
            message: err.message
        })
    }

    else {
        return res.status(400).json({
            success: false,
            message: "somthing went wrong"
        })
    }

    next();


})

















const server = app.listen(3000, () => {
    console.log("Server started on port 3000");
});
