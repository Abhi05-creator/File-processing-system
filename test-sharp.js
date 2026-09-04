const sharp = require('sharp');
const fs = require('fs');

const run = async () => {
    const inputBuffer = fs.readFileSync('./PASSPORTPHOTO.jpeg');

    const resized = await sharp(inputBuffer)
        .resize(200, 200)
        .toBuffer();

    fs.writeFileSync('./output-small.jpeg', resized);
    console.log('Resized image saved, size:', resized.length);
};

run();