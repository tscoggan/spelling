import { pool } from '../db';

async function deleteSeededWords() {
  const client = await pool.connect();
  
  try {
    console.log('Starting deletion of all seeded words...');
    
    await client.query('BEGIN');
    
    console.log('Step 1: Count existing words');
    const countResult = await client.query(`
      SELECT COUNT(*) as total FROM words;
    `);
    console.log(`Found ${countResult.rows[0].total} words in database`);
    
    console.log('Step 2: Delete all words from words table');
    const deleteResult = await client.query(`
      DELETE FROM words;
    `);
    console.log(`Deleted ${deleteResult.rowCount} words`);
    
    await client.query('COMMIT');
    
    console.log('Deletion completed successfully!');
    
    const finalCount = await client.query(`
      SELECT COUNT(*) as total FROM words;
    `);
    console.log(`Remaining words: ${finalCount.rows[0].total}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Deletion failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

deleteSeededWords()
  .then(() => {
    console.log('Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

export { deleteSeededWords };
