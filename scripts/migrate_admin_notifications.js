const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'mapshop',
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connecté à la base de données.');

        // Table admin_notifications
        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        details JSON NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        lu BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (admin_id) REFERENCES super_admins(id) ON DELETE CASCADE
      )
    `;

        await connection.execute(createTableQuery);
        console.log('Table "admin_notifications" créée ou déjà existante.');

    } catch (error) {
        console.error('Erreur lors de la migration:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
