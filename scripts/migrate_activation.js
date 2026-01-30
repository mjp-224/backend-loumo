const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' }); // Adjust path if needed

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mapshop',
};

async function migrate() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        const tables = ['clients', 'gerants', 'livreurs'];

        for (const table of tables) {
            console.log(`Checking table ${table}...`);
            try {
                // Check if column exists
                await connection.execute(`SELECT date_fin_activation FROM ${table} LIMIT 1`);
                console.log(`Column date_fin_activation already exists in ${table}.`);
            } catch (e) {
                // Column likely missing
                console.log(`Adding date_fin_activation to ${table}...`);
                try {
                    await connection.execute(`ALTER TABLE ${table} ADD COLUMN date_fin_activation DATETIME NULL DEFAULT NULL`);
                    console.log(`Added date_fin_activation to ${table}.`);
                } catch (alterError) {
                    console.error(`Failed to alter ${table}:`, alterError.message);
                }
            }

            try {
                // Check if column actif exists (just in case)
                await connection.execute(`SELECT actif FROM ${table} LIMIT 1`);
                console.log(`Column actif already exists in ${table}.`);
            } catch (e) {
                console.log(`Adding actif to ${table}...`);
                try {
                    await connection.execute(`ALTER TABLE ${table} ADD COLUMN actif TINYINT(1) DEFAULT 1`);
                    console.log(`Added actif to ${table}.`);
                } catch (alterError) {
                    console.error(`Failed to alter ${table} for actif:`, alterError.message);
                }
            }
        }

        console.log('Migration completed.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
