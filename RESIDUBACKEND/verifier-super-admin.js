const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function verifierSuperAdmin() {
    try {
        const connexion = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'mapshop'
        });

        console.log('✅ Connecté à la base de données mapshop\n');

        // Récupérer le super admin
        const [admins] = await connexion.execute(
            'SELECT id, nom, prenom, email, mot_de_passe, role, actif FROM super_admins WHERE email = ?',
            ['admin@mapshop.com']
        );

        if (admins.length === 0) {
            console.log('❌ Aucun super admin trouvé avec cet email');
            await connexion.end();
            return;
        }

        const admin = admins[0];
        console.log('📑 INFORMATIONS DU SUPER ADMIN :');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('   ID        :', admin.id);
        console.log('   Nom       :', admin.nom);
        console.log('   Prénom    :', admin.prenom);
        console.log('   Email     :', admin.email);
        console.log('   Role      :', admin.role);
        console.log('   Actif     :', admin.actif ? 'OUI' : 'NON');
        console.log('   Hash (20) :', admin.mot_de_passe.substring(0, 20) + '...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Tester le mot de passe
        console.log('🔐 TEST DU MOT DE PASSE...\n');

        const testPasswords = ['Admin@2024', 'admin@2024', 'Admin2024'];

        for (const pwd of testPasswords) {
            const isValid = await bcrypt.compare(pwd, admin.mot_de_passe);
            console.log(`   "${pwd}" => ${isValid ? '✅ VALIDE' : '❌ INVALIDE'}`);
        }

        // Si aucun ne marche, recréer avec le bon mot de passe
        const correctPassword = 'Admin@2024';
        const isCorrect = await bcrypt.compare(correctPassword, admin.mot_de_passe);

        if (!isCorrect) {
            console.log('\n⚠️  Le mot de passe actuel ne correspond pas à "Admin@2024"');
            console.log('🔄 Mise à jour du mot de passe...\n');

            const newHash = await bcrypt.hash(correctPassword, 12);
            await connexion.execute(
                'UPDATE super_admins SET mot_de_passe = ? WHERE id = ?',
                [newHash, admin.id]
            );

            console.log('✅ Mot de passe mis à jour avec succès !');
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ CREDENTIALS FINAUX :');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('   Email    : admin@mapshop.com');
        console.log('   Password : Admin@2024');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        await connexion.end();
    } catch (error) {
        console.error('\n❌ ERREUR:', error.message);
    }
}

verifierSuperAdmin();
