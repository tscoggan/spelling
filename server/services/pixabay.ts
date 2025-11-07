import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;
const PIXABAY_API_URL = 'https://pixabay.com/api/';

interface PixabayImage {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  previewURL: string;
  webformatURL: string;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
}

interface PixabayResponse {
  total: number;
  totalHits: number;
  hits: PixabayImage[];
}

export class PixabayService {
  private apiKey: string;

  constructor() {
    if (!PIXABAY_API_KEY) {
      throw new Error('PIXABAY_API_KEY environment variable is not set');
    }
    this.apiKey = PIXABAY_API_KEY;
  }

  async searchCartoonImage(word: string, usedImageIds: Set<number> = new Set()): Promise<{ imagePath: string; imageId: number } | null> {
    try {
      const searchQuery = `cartoon ${word}`;
      
      const params = new URLSearchParams({
        key: this.apiKey,
        q: searchQuery,
        image_type: 'illustration',
        safesearch: 'true',
        per_page: '10',
        orientation: 'horizontal',
      });

      const response = await fetch(`${PIXABAY_API_URL}?${params.toString()}`);
      
      if (!response.ok) {
        console.error(`Pixabay API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json() as PixabayResponse;
      
      if (!data.hits || data.hits.length === 0) {
        console.log(`No images found for word: ${word}`);
        return null;
      }

      const wordLower = word.toLowerCase();
      let selectedImage: PixabayImage | null = null;

      for (const hit of data.hits) {
        if (usedImageIds.has(hit.id)) {
          console.log(`⏭️  Skipping duplicate image ID ${hit.id} for "${word}"`);
          continue;
        }

        const tagsLower = hit.tags.toLowerCase();
        if (tagsLower.includes(wordLower)) {
          selectedImage = hit;
          console.log(`✅ Found matching image for "${word}": ${hit.tags} (ID: ${hit.id})`);
          break;
        }
      }

      if (!selectedImage) {
        for (const hit of data.hits) {
          if (!usedImageIds.has(hit.id)) {
            selectedImage = hit;
            console.log(`⚠️ No exact match for "${word}", using first unused result: ${selectedImage.tags} (ID: ${selectedImage.id})`);
            break;
          }
        }
      }

      if (!selectedImage) {
        console.log(`❌ All results already used for "${word}"`);
        return null;
      }

      const imageUrl = selectedImage.largeImageURL || selectedImage.webformatURL;
      console.log(`🔗 Image URL: ${imageUrl}`);
      
      const downloadedPath = await this.downloadImage(imageUrl, word);
      return { imagePath: downloadedPath, imageId: selectedImage.id };
      
    } catch (error) {
      console.error(`Error searching for image of "${word}":`, error);
      return null;
    }
  }

  private async downloadImage(imageUrl: string, word: string): Promise<string> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const buffer = await response.buffer();
      
      const hash = crypto.randomBytes(4).toString('hex');
      const sanitizedWord = word.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `pixabay_${sanitizedWord}_${hash}.jpg`;
      
      const imagesDir = path.join(process.cwd(), 'attached_assets', 'stock_images');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }

      const filepath = path.join(imagesDir, filename);
      fs.writeFileSync(filepath, buffer);
      
      const relativePath = path.join('attached_assets', 'stock_images', filename);
      console.log(`✓ Downloaded image for "${word}" to: ${relativePath}`);
      
      return relativePath;
      
    } catch (error) {
      console.error(`Error downloading image for "${word}":`, error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        key: this.apiKey,
        q: 'test',
        per_page: '1',
      });

      const response = await fetch(`${PIXABAY_API_URL}?${params.toString()}`);
      return response.ok;
    } catch (error) {
      console.error('Pixabay connection test failed:', error);
      return false;
    }
  }
}
