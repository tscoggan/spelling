import { pool } from '../db';

async function migrateWordIllustrations() {
  const client = await pool.connect();
  
  try {
    console.log('Starting word_illustrations migration...');
    
    await client.query('BEGIN');
    
    console.log('Step 1: Add nullable word_list_id column');
    await client.query(`
      ALTER TABLE word_illustrations 
      ADD COLUMN IF NOT EXISTS word_list_id INTEGER;
    `);
    
    console.log('Step 2: Create system word list for existing illustrations');
    const systemListResult = await client.query(`
      INSERT INTO custom_word_lists (user_id, name, difficulty, words, is_public, visibility, assign_images, grade_level)
      SELECT 
        1,
        'System Illustrations',
        'medium',
        ARRAY[]::text[],
        false,
        'private',
        false,
        'System'
      WHERE NOT EXISTS (
        SELECT 1 FROM custom_word_lists WHERE name = 'System Illustrations' AND grade_level = 'System'
      )
      RETURNING id;
    `);
    
    let systemListId: number;
    if (systemListResult.rows.length > 0) {
      systemListId = systemListResult.rows[0].id;
      console.log(`Created system word list with id: ${systemListId}`);
    } else {
      const existingList = await client.query(`
        SELECT id FROM custom_word_lists WHERE name = 'System Illustrations' AND grade_level = 'System' LIMIT 1;
      `);
      systemListId = existingList.rows[0].id;
      console.log(`Using existing system word list with id: ${systemListId}`);
    }
    
    console.log('Step 3: Populate word_list_id for existing illustrations');
    await client.query(`
      UPDATE word_illustrations 
      SET word_list_id = $1 
      WHERE word_list_id IS NULL;
    `, [systemListId]);
    
    console.log('Step 4: Drop unique constraint on word column');
    const uniqueConstraints = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'word_illustrations' 
        AND constraint_type = 'UNIQUE';
    `);
    
    for (const row of uniqueConstraints.rows) {
      console.log(`Dropping constraint: ${row.constraint_name}`);
      await client.query(`
        ALTER TABLE word_illustrations 
        DROP CONSTRAINT IF EXISTS ${row.constraint_name};
      `);
    }
    
    console.log('Step 5: Drop unique index on word column if exists');
    await client.query(`
      DROP INDEX IF EXISTS word_illustrations_word_key;
    `);
    
    console.log('Step 6: Add composite unique index on (word, word_list_id)');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS word_illustrations_word_list_unique 
      ON word_illustrations (word, word_list_id);
    `);
    
    console.log('Step 7: Drop parts_of_speech column');
    await client.query(`
      ALTER TABLE word_illustrations 
      DROP COLUMN IF EXISTS parts_of_speech;
    `);
    
    console.log('Step 8: Make word_list_id NOT NULL');
    await client.query(`
      ALTER TABLE word_illustrations 
      ALTER COLUMN word_list_id SET NOT NULL;
    `);
    
    await client.query('COMMIT');
    
    console.log('Migration completed successfully!');
    
    const stats = await client.query(`
      SELECT COUNT(*) as total FROM word_illustrations;
    `);
    console.log(`Total illustrations: ${stats.rows[0].total}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

migrateWordIllustrations()
  .then(() => {
    console.log('Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });

export { migrateWordIllustrations };
