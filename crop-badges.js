import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function cropImage(inputPath, outputPath) {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    console.log(`Processing ${inputPath}`);
    console.log(`Original dimensions: ${metadata.width}x${metadata.height}`);
    
    // Get image buffer and analyze it
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Find bounding box of non-transparent pixels
    let minX = info.width;
    let minY = info.height;
    let maxX = 0;
    let maxY = 0;
    
    const channels = info.channels;
    const hasAlpha = channels === 4;
    
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * channels;
        const alpha = hasAlpha ? data[idx + 3] : 255;
        
        // Check if pixel is not fully transparent (alpha > 10 to account for anti-aliasing)
        if (alpha > 10) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    // Calculate crop dimensions with small padding
    const padding = 5;
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropWidth = Math.min(info.width - cropX, maxX - minX + 1 + padding * 2);
    const cropHeight = Math.min(info.height - cropY, maxY - minY + 1 + padding * 2);
    
    console.log(`Crop region: x=${cropX}, y=${cropY}, width=${cropWidth}, height=${cropHeight}`);
    
    // Apply crop
    await sharp(inputPath)
      .extract({ 
        left: cropX, 
        top: cropY, 
        width: cropWidth, 
        height: cropHeight 
      })
      .toFile(outputPath);
    
    console.log(`Saved cropped image to ${outputPath}\n`);
    
  } catch (error) {
    console.error(`Error processing ${inputPath}:`, error);
  }
}

async function main() {
  const assetsDir = join(__dirname, 'attached_assets');
  
  // Crop 2 stars and 3 stars images
  await cropImage(
    join(assetsDir, '2 stars_1763913172281.png'),
    join(assetsDir, '2 stars_1763913172281_cropped.png')
  );
  
  await cropImage(
    join(assetsDir, '3 stars_1763913172282.png'),
    join(assetsDir, '3 stars_1763913172282_cropped.png')
  );
  
  console.log('Cropping complete!');
}

main();
