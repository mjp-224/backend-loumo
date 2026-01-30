const mysql = require('mysql2/promise');

async function verifierColonneStatut() {
    try {
        const connexion = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'mapshop'
        });

        console.log('✅ Connecté à la base de données mapshop\n');

        // Vérifier si la colonne statut existe
        const [columns] = await connexion.execute(
            `SHOW COLUMNS FROM utilisateurs LIKE 'statut'`
        );

        if (columns.length === 0) {
            console.log('❌ La colonne statut n\'existe PAS dans la table utilisateurs');
            console.log('🔧 Ajout de la colonne statut...\n');

            await connexion.execute(
                `ALTER TABLE utilisateurs ADD COLUMN statut BOOLEAN DEFAULT FALSE`
            );

            console.log('✅ Colonne statut ajoutée avec succès\n');
        } else {
            console.log('✅ La colonne statut existe déjà\n');
            console.log('Détails:', columns[0]);
            console.log('');
        }

        // Afficher quelques utilisateurs pour vérifier
        const [users] = await connexion.execute(
            `SELECT id, nom, prenom, type, actif, statut FROM utilisateurs LIMIT 5`
        );

        console.log('📋 EXEMPLE D\'UTILISATEURS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        users.forEach(u => {
            console.log(`ID: ${u.id} | ${u.prenom} ${u.nom} | Type: ${u.type} | Actif: ${u.actif} | Statut: ${u.statut}`);
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        await connexion.end();
    } catch (error) {
        console.error('❌ ERREUR:', error.message);
        console.error(error);
    }
}

verifierColonneStatut();
