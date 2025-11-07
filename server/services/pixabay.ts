import fetch from 'node-fetch';
import { ObjectStorageService } from '../objectStorage';

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
      
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.uploadImageBuffer(
        Buffer.from(buffer),
        'image/jpeg'
      );
      
      console.log(`✓ Uploaded image for "${word}" to Object Storage: ${objectPath}`);
      
      return objectPath;
      
    } catch (error) {
      console.error(`Error downloading image for "${word}":`, error);
      throw error;
    }
  }

  async getImagePreviews(word: string, limit: number = 10): Promise<PixabayImage[]> {
    try {
      const searchQuery = `cartoon ${word}`;
      
      const params = new URLSearchParams({
        key: this.apiKey,
        q: searchQuery,
        image_type: 'illustration',
        safesearch: 'true',
        per_page: limit.toString(),
        orientation: 'horizontal',
      });

      const response = await fetch(`${PIXABAY_API_URL}?${params.toString()}`);
      
      if (!response.ok) {
        console.error(`Pixabay API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json() as PixabayResponse;
      return data.hits || [];
      
    } catch (error) {
      console.error(`Error fetching previews for "${word}":`, error);
      return [];
    }
  }

  async downloadImageById(imageUrl: string, word: string): Promise<string> {
    return this.downloadImage(imageUrl, word);
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
