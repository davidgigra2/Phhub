const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function processIcon(filename) {
  const filepath = path.join(__dirname, 'public', filename);
  if (!fs.existsSync(filepath)) return;
  
  console.log(`Processing ${filename}...`);
  try {
    const tempFile = filepath + '.tmp.png';
    // Trim transparent edges and resize back to original bounds to maximize size
    await sharp(filepath)
      .trim()
      .toFile(tempFile);
      
    fs.renameSync(tempFile, filepath);
    console.log(`Finished ${filename}`);
  } catch(e) {
    console.error(`Error processing ${filename}:`, e);
  }
}

async function main() {
  await processIcon('icon.png');
  await processIcon('icon-dark.png');
}

main();
