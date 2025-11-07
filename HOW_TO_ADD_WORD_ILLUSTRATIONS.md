# How to Add Word Illustrations

This document explains how to add cartoon illustrations for words in the Spelling Champions app.

## System Overview

Word illustrations are stored in the PostgreSQL database (`word_illustrations` table) and automatically displayed during gameplay when available. The system supports any word - not just pre-selected ones.

## Database Schema

```sql
CREATE TABLE word_illustrations (
  id SERIAL PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  image_path TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

## Adding New Illustrations

### Manual Process (Current Implementation)

1. **Download cartoon image using stock_image_tool**
   ```
   Use the stock_image_tool to search for and download kid-friendly cartoon illustrations
   Example: "cute cartoon [word] colorful illustration kid-friendly style"
   ```

2. **Note the file path**
   ```
   The downloaded image will be saved to: attached_assets/stock_images/...
   ```

3. **Add to database**
   ```bash
   # Option 1: Using the utility script
   npm run tsx scripts/add-word-illustration.ts <word> <path>
   
   # Option 2: Using SQL directly
   INSERT INTO word_illustrations (word, image_path) 
   VALUES ('word', 'attached_assets/stock_images/image.png');
   ```

### Using the Utility Script

```bash
# List all current illustrations
npm run tsx scripts/add-word-illustration.ts

# Add a new illustration
npm run tsx scripts/add-word-illustration.ts elephant attached_assets/stock_images/elephant.png
```

## Workflow for Custom Word Lists

When users create custom word lists:

1. User creates a word list with 5-500 words
2. System saves the word list to the database
3. **Manual step**: Search for and add illustrations for new words:
   - Identify words that don't have illustrations
   - Use stock_image_tool to download cartoon images
   - Add illustrations to database using the utility script
4. Illustrations automatically appear during gameplay

## API Endpoints

- `GET /api/word-illustrations` - Fetch all word illustrations
- `GET /api/word-illustrations/:word` - Fetch illustration for a specific word

## Frontend Integration

The game page automatically fetches all word illustrations and displays them when available:

```typescript
const { data: wordIllustrations } = useQuery<WordIllustration[]>({
  queryKey: ['/api/word-illustrations'],
  queryFn: async () => {
    const response = await fetch('/api/word-illustrations');
    if (!response.ok) throw new Error('Failed to fetch word illustrations');
    return response.json();
  },
});
```

## Current Illustrations

The following 14 words have illustrations:
- cat, dog, apple, book, sun, house, ball, star
- tree, flower, car, heart, rainbow, balloon

## Future Enhancements

Potential improvements for automated illustration search:
1. Integrate with a cartoon/illustration API
2. Automated image search when word lists are created
3. Background job processing for bulk illustration downloads
4. User-uploaded custom illustrations
