const { pool } = require('../config/database');

const Gerant = {
    async create({ nom, prenom, telephone, email, image, mot_de_passe, date_naissance }) {
        const [resultat] = await pool.execute(
            'INSERT INTO gerants (nom, prenom, telephone, email, image, mot_de_passe, date_inscription, date_naissance) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)',
            [nom, prenom, telephone, email || null, image || null, mot_de_passe, date_naissance]
        );
        return resultat.insertId;
    },

    async findByTelephone(telephone) {
        const [gerant] = await pool.execute('SELECT *, "gerant" as type FROM gerants WHERE telephone = ?', [telephone]);
        return gerant[0];
    },

    async findByEmail(email) {
        const [gerant] = await pool.execute('SELECT *, "gerant" as type FROM gerants WHERE email = ?', [email]);
        return gerant[0];
    },

    async findByTelephoneOrEmail(identifiant) {
        if (identifiant.includes('@')) {
            return this.findByEmail(identifiant);
        } else {
            return this.findByTelephone(identifiant);
        }
    },

    async findById(id) {
        const [gerant] = await pool.execute(
            'SELECT id, nom, prenom, telephone, email, image, "gerant" as type, date_naissance FROM gerants WHERE id = ?',
            [id]
        );
        return gerant[0];
    },

    async existsByTelephoneOrEmail(telephone, email) {
        const [existant] = await pool.execute(
            'SELECT id FROM gerants WHERE telephone = ? OR (email IS NOT NULL AND email = ?)',
            [telephone, email || '']
        );
        return existant.length > 0;
    }
};

module.exports = Gerant;
