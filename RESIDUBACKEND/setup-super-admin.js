const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function creerSuperAdmin() {
    try {
        // Connexion à la base de données
        const connexion = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '', // MODIFIEZ si vous avez un mot de passe MySQL
            database: 'mapshop'
        });

        console.log('✅ Connecté à la base de données mapshop');

        // Vérifier si le super admin existe déjà
        const [existing] = await connexion.execute(
            'SELECT id, email FROM super_admins WHERE email = ?',
            ['admin@mapshop.com']
        );

        if (existing.length > 0) {
            console.log('\n⚠️  Le super admin existe déjà dans la base de données !');
            console.log('   ID:', existing[0].id);
            console.log('   Email:', existing[0].email);
            console.log('\n✅ Vous pouvez vous connecter avec :');
            console.log('   Email: admin@mapshop.com');
            console.log('   Mot de passe: Admin@2024');
            await connexion.end();
            return;
        }

        console.log('\n📝 Création du super admin...');

        // Hasher le mot de passe
        const motDePasseHash = await bcrypt.hash('Admin@2024', 12);
        console.log('✅ Mot de passe hashé');

        // Insérer le super admin
        const [result] = await connexion.execute(
            `INSERT INTO super_admins (nom, prenom, email, mot_de_passe, role, actif, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            ['Admin', 'Super', 'admin@mapshop.com', motDePasseHash, 'super_admin', true]
        );

        console.log('✅ Super Admin créé avec succès !');
        console.log('   ID:', result.insertId);
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 CREDENTIALS DE CONNEXION :');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('   Email     : admin@mapshop.com');
        console.log('   Password  : Admin@2024');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('✅ Vous pouvez maintenant vous connecter');
        console.log('   - Application Web : http://localhost:3000/login');
        console.log('   - Application Mobile : Utilisez Expo Go\n');

        await connexion.end();
    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
        console.error('\nDétails:', error);
        process.exit(1);
    }
}

// Exécuter la fonction
creerSuperAdmin();
