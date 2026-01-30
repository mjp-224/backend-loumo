const { pool } = require('../config/database');

const Client = {
    async create({ nom, prenom, telephone, email, image, mot_de_passe, date_naissance }) {
        const [resultat] = await pool.execute(
            'INSERT INTO clients (nom, prenom, telephone, email, image, mot_de_passe, date_inscription, date_naissance) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)',
            [nom, prenom, telephone, email || null, image || null, mot_de_passe, date_naissance]
        );
        return resultat.insertId;
    },

    async findByTelephone(telephone) {
        const [client] = await pool.execute('SELECT *, "client" as type FROM clients WHERE telephone = ?', [telephone]);
        return client[0];
    },

    async findByEmail(email) {
        const [client] = await pool.execute('SELECT *, "client" as type FROM clients WHERE email = ?', [email]);
        return client[0];
    },

    async findByTelephoneOrEmail(identifiant) {
        if (identifiant.includes('@')) {
            return this.findByEmail(identifiant);
        } else {
            return this.findByTelephone(identifiant);
        }
    },

    async findById(id) {
        const [client] = await pool.execute(
            'SELECT id, nom, prenom, telephone, email, image, "client" as type, date_naissance FROM clients WHERE id = ?',
            [id]
        );
        return client[0];
    },

    async existsByTelephoneOrEmail(telephone, email) {
        const [existant] = await pool.execute(
            'SELECT id FROM clients WHERE telephone = ? OR (email IS NOT NULL AND email = ?)',
            [telephone, email || '']
        );
        return existant.length > 0;
    }
};

module.exports = Client;
