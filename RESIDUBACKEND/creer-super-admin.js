const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function creerSuperAdmin() {
    const connexion = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '', // Modifier si vous avez un mot de passe
        database: 'mapshop'
    });

    try {
        // Vérifier si le super admin existe déjà
        const [existing] = await connexion.execute(
            'SELECT id FROM super_admins WHERE email = ?',
            ['admin@mapshop.com']
        );

        if (existing.length > 0) {
            console.log('✅ Le super admin existe déjà !');
            console.log('Email: admin@mapshop.com');
            console.log('Mot de passe: Admin@2024');
            return;
        }

        // Hasher le mot de passe
        const motDePasseHash = await bcrypt.hash('Admin@2024', 12);

        // Insérer le super admin
        await connexion.execute(
            `INSERT INTO super_admins (nom, prenom, email, mot_de_passe, role, actif)
       VALUES (?, ?, ?, ?, ?, ?)`,
            ['Admin', 'Super', 'admin@mapshop.com', motDePasseHash, 'super_admin', true]
        );

        console.log('✅ Super Admin créé avec succès !');
        console.log('');
        console.log('Credentials:');
        console.log('  Email: admin@mapshop.com');
        console.log('  Mot de passe: Admin@2024');
        console.log('');
        console.log('Vous pouvez maintenant vous connecter aux applications Admin.');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await connexion.end();
    }
}

creerSuperAdmin();
