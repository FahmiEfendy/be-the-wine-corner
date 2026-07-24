const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1600;
const WEBP_QUALITY = 80;

// Resize/compress an in-memory uploaded image and save it as .webp
async function processAndSaveImage(file, fieldname) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `${fieldname}-${uniqueSuffix}.webp`;
    const outputPath = path.join(uploadDir, filename);

    await sharp(file.buffer)
        .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(outputPath);

    return filename;
}

module.exports = { processAndSaveImage };
