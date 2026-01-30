const pool = require('./config/db');

async function updateSchema() {
    try {
        console.log('Vérification et mise à jour du schéma de la base de données...');

        // Ajout colonne actif pour clients
        try {
            await pool.execute("ALTER TABLE clients ADD COLUMN actif BOOLEAN DEFAULT TRUE");
            console.log('Colonne actif ajoutée à la table clients.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('Colonne actif existe déjà dans clients.');
            } else {
                console.error('Erreur table clients:', e.message);
            }
        }

        // Ajout colonne actif pour gerants
        try {
            await pool.execute("ALTER TABLE gerants ADD COLUMN actif BOOLEAN DEFAULT TRUE");
            console.log('Colonne actif ajoutée à la table gerants.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('Colonne actif existe déjà dans gerants.');
            } else {
                console.error('Erreur table gerants:', e.message);
            }
        }

        console.log('Mise à jour terminée.');
        process.exit(0);
    } catch (error) {
        console.error('Erreur générale:', error);
        process.exit(1);
    }
}

updateSchema();
