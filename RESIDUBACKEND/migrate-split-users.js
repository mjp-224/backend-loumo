const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mapshop',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function migrate() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('🔌 Connecté à la base de données.');

        // 1. Créer la table clients
        console.log('🏗️ Création table clients...');
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(50) NOT NULL,
        prenom VARCHAR(50) NOT NULL,
        telephone VARCHAR(20) NOT NULL UNIQUE,
        email VARCHAR(100) UNIQUE,
        image VARCHAR(255),
        mot_de_passe VARCHAR(255) NOT NULL,
        date_inscription DATETIME NOT NULL,
        date_naissance DATE NOT NULL
      )
    `);

        // 2. Créer la table gerants
        console.log('🏗️ Création table gerants...');
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS gerants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(50) NOT NULL,
        prenom VARCHAR(50) NOT NULL,
        telephone VARCHAR(20) NOT NULL UNIQUE,
        email VARCHAR(100) UNIQUE,
        image VARCHAR(255),
        mot_de_passe VARCHAR(255) NOT NULL,
        date_inscription DATETIME NOT NULL,
        date_naissance DATE NOT NULL
      )
    `);

        // 3. Migrer les données (en préservant les IDs pour faciliter la bascule des FK)
        console.log('📦 Migration des données...');

        // Clients
        await connection.execute(`
      INSERT IGNORE INTO clients (id, nom, prenom, telephone, email, image, mot_de_passe, date_inscription, date_naissance)
      SELECT id, nom, prenom, telephone, email, image, mot_de_passe, date_inscription, date_naissance
      FROM utilisateurs WHERE type = 'client'
    `);

        // Gérants
        await connection.execute(`
      INSERT IGNORE INTO gerants (id, nom, prenom, telephone, email, image, mot_de_passe, date_inscription, date_naissance)
      SELECT id, nom, prenom, telephone, email, image, mot_de_passe, date_inscription, date_naissance
      FROM utilisateurs WHERE type = 'gerant'
    `);

        // 4. Identifier et Dropper les anciennes Foreign Keys (plus délicat, on le fait table par table)
        // Fonction helper pour dropper une FK si elle existe
        const dropFK = async (table, column) => {
            try {
                const [rows] = await connection.execute(`
          SELECT CONSTRAINT_NAME 
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_NAME = ? AND COLUMN_NAME = ? AND TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME = 'utilisateurs'
        `, [table, column, process.env.DB_NAME || 'mapshop']);

                for (const row of rows) {
                    console.log(`🔥 Suppression FK ${row.CONSTRAINT_NAME} sur ${table}.${column}...`);
                    await connection.execute(`ALTER TABLE ${table} DROP FOREIGN KEY ${row.CONSTRAINT_NAME}`);
                }
            } catch (e) {
                console.log(`⚠️ Note: Pas de FK à supprimer pour ${table}.${column} ou erreur: ${e.message}`);
            }
        };

        // --- Table BOUTIQUES ---
        await dropFK('boutiques', 'gerant_id');
        console.log('🔗 Relinking Boutiques -> Gerants...');
        await connection.execute(`ALTER TABLE boutiques ADD CONSTRAINT fk_boutique_gerant FOREIGN KEY (gerant_id) REFERENCES gerants(id) ON DELETE CASCADE`);

        // --- Table COMMANDES ---
        // On renomme utilisateur_id en client_id pour la clarté, mais attention au code backend existant.
        // Pour l'instant, on GARDE le nom utilisateur_id pour minimiser la casse du backend, mais on change la FK.
        // (Idéalement on renommerait, mais cela oblige à changer TOUTES les requêtes SQL du code).
        // UPDATE: Le prompt demande "séparer leur gestion". Je vais pointer la FK vers clients.
        await dropFK('commandes', 'utilisateur_id');
        console.log('🔗 Relinking Commandes -> Clients...');
        await connection.execute(`ALTER TABLE commandes ADD CONSTRAINT fk_commande_client FOREIGN KEY (utilisateur_id) REFERENCES clients(id) ON DELETE CASCADE`);

        // --- Table DEMANDES_SERVICES ---
        await dropFK('demandes_services', 'utilisateur_id');
        console.log('🔗 Relinking Demandes Services -> Clients...');
        await connection.execute(`ALTER TABLE demandes_services ADD CONSTRAINT fk_demande_client FOREIGN KEY (utilisateur_id) REFERENCES clients(id) ON DELETE CASCADE`);

        // --- Table PANIERS ---
        await dropFK('paniers', 'utilisateur_id');
        console.log('🔗 Relinking Paniers -> Clients...');
        await connection.execute(`ALTER TABLE paniers ADD CONSTRAINT fk_panier_client FOREIGN KEY (utilisateur_id) REFERENCES clients(id) ON DELETE CASCADE`);

        // --- Table VISITES ---
        await dropFK('visites', 'utilisateur_id');
        console.log('🔗 Relinking Visites -> Clients...');
        await connection.execute(`ALTER TABLE visites ADD CONSTRAINT fk_visite_client FOREIGN KEY (utilisateur_id) REFERENCES clients(id) ON DELETE CASCADE`);

        // --- Table HISTORIQUE_VISITES ---
        await dropFK('historique_visites', 'utilisateur_id');
        console.log('🔗 Relinking Historique Visites -> Clients...');
        await connection.execute(`ALTER TABLE historique_visites ADD CONSTRAINT fk_hist_visite_client FOREIGN KEY (utilisateur_id) REFERENCES clients(id) ON DELETE CASCADE`);

        // --- Table COMMENTAIRES ---
        await dropFK('commentaires', 'utilisateur_id');
        console.log('🔗 Relinking Commentaires -> Clients...');
        await connection.execute(`ALTER TABLE commentaires ADD CONSTRAINT fk_commentaire_client FOREIGN KEY (utilisateur_id) REFERENCES clients(id) ON DELETE CASCADE`);

        // --- Table REDUCTIONS ---
        await dropFK('reductions', 'utilisateur_id');
        console.log('🔗 Relinking Reductions -> Clients...');
        // Note: Les réductions sont demandées par les clients (dans le contexte actuel)
        await connection.execute(`ALTER TABLE reductions ADD CONSTRAINT fk_reduction_client FOREIGN KEY (utilisateur_id) REFERENCES clients(id) ON DELETE CASCADE`);

        // --- Table PAIEMENTS ---
        await dropFK('paiements', 'utilisateur_id');
        console.log('🔗 Relinking Paiements -> Clients...');
        await connection.execute(`ALTER TABLE paiements ADD CONSTRAINT fk_paiement_client FOREIGN KEY (utilisateur_id) REFERENCES clients(id)`);


        // --- Table NOTIFICATIONS ---
        // C'est le cas complexe : Notifications peuvent être pour Client OU Gérant.
        // Structure actuelle: utilisateur_id. 
        // Solution : Ajouter client_id et gerant_id, migrer les données, supprimer utilisateur_id.
        console.log('🔄 Restructuration Notifications...');

        // 1. Ajouter les colonnes
        try {
            await connection.execute(`ALTER TABLE notifications ADD COLUMN client_id INT, ADD COLUMN gerant_id INT`);
        } catch (e) { /* ignore if exists */ }

        // 2. Migrer les IDs existants
        // On doit savoir si l'ID correspondait à un client ou un gérant. 
        // On utilise la table utilisateurs (qu'on n'a pas encore supprimée) pour faire la jointure
        await connection.execute(`
        UPDATE notifications n
        JOIN utilisateurs u ON n.utilisateur_id = u.id
        SET n.client_id = IF(u.type = 'client', u.id, NULL),
            n.gerant_id = IF(u.type = 'gerant', u.id, NULL)
    `);

        // 3. Dropper l'ancienne FK et colonne
        await dropFK('notifications', 'utilisateur_id');
        await connection.execute(`ALTER TABLE notifications DROP COLUMN utilisateur_id`);

        // 4. Ajouter les nouvelles FKs
        await connection.execute(`ALTER TABLE notifications ADD CONSTRAINT fk_notif_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE`);
        await connection.execute(`ALTER TABLE notifications ADD CONSTRAINT fk_notif_gerant FOREIGN KEY (gerant_id) REFERENCES gerants(id) ON DELETE CASCADE`);


        console.log('✅ Migration terminée avec succès !');

        // Optionnel : Renommer l'ancienne table pour backup au lieu de supprimer tout de suite
        console.log('🗑️ Archivage table utilisateurs -> utilisateurs_old');
        try {
            await connection.execute(`RENAME TABLE utilisateurs TO utilisateurs_old`);
        } catch (e) {
            console.log('Note: utilisateurs déjà renommé ou inexistant.');
        }

    } catch (error) {
        console.error('❌ Erreur de migration:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

migrate();
