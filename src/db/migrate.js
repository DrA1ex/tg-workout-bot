import {sequelize} from './index.js';

/**
 * Migration to add timezone field to users table
 */
export async function migrateTimezone() {
    try {
        // Check if timezone column already exists
        const [results] = await sequelize.query(`
            PRAGMA table_info(users);
        `);
        
        const hasTimezone = results.some(col => col.name === 'timezone');
        
        if (!hasTimezone) {
            console.log('Adding timezone column to users table...');
            
            // Add timezone column with default value UTC
            await sequelize.query(`
                ALTER TABLE users ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
            `);
            
            console.log('Timezone column added successfully');
        } else {
            console.log('Timezone column already exists');
        }
        
        // Update existing users to have UTC timezone if they don't have one
        await sequelize.query(`
            UPDATE users SET timezone = 'UTC' WHERE timezone IS NULL;
        `);
        
        console.log('Migration completed successfully');
        
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateTimezone()
        .then(() => {
            console.log('Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}
