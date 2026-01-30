// ==================== ROUTES PERSONNEL ====================

// POST /boutiques/:id/personnel - Créer un membre du personnel
app.post('/boutiques/:id/personnel', verifierToken, upload.single('photo'), async (req, res) => {
    if (req.utilisateur.type !== 'gerant') {
        return res.status(403).json({ erreur: 'Accès refusé. Seuls les gérants peuvent ajouter du personnel.' });
    }

    try {
        const boutiqueId = parseInt(req.params.id);
        const { nom, prenom, telephone, email, type_personnel, salaire, date_embauche, actif } = req.body;

        // Vérifier que la boutique appartient au gérant
        const [boutique] = await pool.execute(
            'SELECT id FROM boutiques WHERE id = ? AND gerant_id = ?',
            [boutiqueId, req.utilisateur.id]
        );

        if (!boutique.length) {
            return res.status(403).json({ erreur: 'Boutique non trouvée ou accès non autorisé.' });
        }

        // Validation des champs obligatoires
        if (!nom || !prenom || !telephone || !type_personnel || !date_embauche) {
            return res.status(400).json({ erreur: 'Les champs nom, prénom, téléphone, type_personnel et date_embauche sont requis.' });
        }

        // Gérer la photo
        const photoPath = req.file ? `/Uploads/personnel/${req.file.filename}` : null;

        // Gérer actif (par défaut true)
        const actifValue = actif === 'true' || actif === true || actif === '1' || actif === 1 ? 1 : 0;

        // Insérer le personnel
        const [result] = await pool.execute(
            `INSERT INTO personnel (boutique_id, nom, prenom, telephone, email, type_personnel, salaire, date_embauche, actif, photo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [boutiqueId, nom, prenom, telephone, email || null, type_personnel, salaire || null, date_embauche, actifValue, photoPath]
        );

        res.status(201).json({
            message: 'Personnel créé avec succès',
            id: result.insertId
        });
    } catch (error) {
        console.error('Erreur création personnel:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ erreur: 'Ce numéro de téléphone est déjà utilisé.' });
        } else {
            res.status(500).json({ erreur: 'Erreur serveur.' });
        }
    }
});

// GET /boutiques/:id/personnel - Lister tout le personnel d'une boutique
app.get('/boutiques/:id/personnel', verifierToken, async (req, res) => {
    if (req.utilisateur.type !== 'gerant') {
        return res.status(403).json({ erreur: 'Accès refusé.' });
    }

    try {
        const boutiqueId = parseInt(req.params.id);
        const { type, actif } = req.query;

        // Vérifier que la boutique appartient au gérant
        const [boutique] = await pool.execute(
            'SELECT id FROM boutiques WHERE id = ? AND gerant_id = ?',
            [boutiqueId, req.utilisateur.id]
        );

        if (!boutique.length) {
            return res.status(403).json({ erreur: 'Boutique non trouvée ou accès non autorisé.' });
        }

        // Construire la requête avec filtres optionnels
        let query = 'SELECT * FROM personnel WHERE boutique_id = ?';
        const params = [boutiqueId];

        if (type) {
            query += ' AND type_personnel = ?';
            params.push(type);
        }

        if (actif !== undefined) {
            query += ' AND actif = ?';
            params.push(actif === 'true' || actif === '1' ? 1 : 0);
        }

        query += ' ORDER BY created_at DESC';

        const [personnel] = await pool.execute(query, params);

        res.json(personnel);
    } catch (error) {
        console.error('Erreur liste personnel:', error);
        res.status(500).json({ erreur: 'Erreur serveur.' });
    }
});

// GET /personnel/:id - Obtenir un membre du personnel
app.get('/personnel/:id', verifierToken, async (req, res) => {
    if (req.utilisateur.type !== 'gerant') {
        return res.status(403).json({ erreur: 'Accès refusé.' });
    }

    try {
        const personnelId = parseInt(req.params.id);

        const [personnel] = await pool.execute(
            `SELECT p.* FROM personnel p
       JOIN boutiques b ON p.boutique_id = b.id
       WHERE p.id = ? AND b.gerant_id = ?`,
            [personnelId, req.utilisateur.id]
        );

        if (!personnel.length) {
            return res.status(404).json({ erreur: 'Personnel non trouvé.' });
        }

        res.json(personnel[0]);
    } catch (error) {
        console.error('Erreur lecture personnel:', error);
        res.status(500).json({ erreur: 'Erreur serveur.' });
    }
});

// PUT /personnel/:id - Mettre à jour un membre du personnel
app.put('/personnel/:id', verifierToken, upload.single('photo'), async (req, res) => {
    if (req.utilisateur.type !== 'gerant') {
        return res.status(403).json({ erreur: 'Accès refusé.' });
    }

    try {
        const personnelId = parseInt(req.params.id);
        const { nom, prenom, telephone, email, type_personnel, salaire, date_embauche, actif, conserver_image } = req.body;

        // Vérifier que le personnel existe et appartient à une boutique du gérant
        const [personnel] = await pool.execute(
            `SELECT p.*, p.photo FROM personnel p
       JOIN boutiques b ON p.boutique_id = b.id
       WHERE p.id = ? AND b.gerant_id = ?`,
            [personnelId, req.utilisateur.id]
        );

        if (!personnel.length) {
            return res.status(404).json({ erreur: 'Personnel non trouvé ou accès non autorisé.' });
        }

        // Validation des champs obligatoires
        if (!nom || !prenom || !telephone || !type_personnel || !date_embauche) {
            return res.status(400).json({ erreur: 'Les champs nom, prénom, téléphone, type_personnel et date_embauche sont requis.' });
        }

        // Gérer la photo
        let photoPath = personnel[0].photo;
        if (req.file) {
            photoPath = `/Uploads/personnel/${req.file.filename}`;
            // Supprimer l'ancienne photo
            if (personnel[0].photo && fs.existsSync(path.join(__dirname, personnel[0].photo))) {
                try {
                    await fsPromises.unlink(path.join(__dirname, personnel[0].photo));
                } catch (err) {
                    console.error('Erreur suppression ancienne photo:', err);
                }
            }
        } else if (conserver_image === 'true') {
            photoPath = personnel[0].photo;
        } else if (req.body.photo === '' || req.body.photo === null) {
            photoPath = null;
            if (personnel[0].photo && fs.existsSync(path.join(__dirname, personnel[0].photo))) {
                try {
                    await fsPromises.unlink(path.join(__dirname, personnel[0].photo));
                } catch (err) {
                    console.error('Erreur suppression photo:', err);
                }
            }
        }

        const actifValue = actif === 'true' || actif === true || actif === '1' || actif === 1 ? 1 : 0;

        // Si on désactive le seul personnel actif, bloquer
        if (actifValue === 0) {
            const [actifs] = await pool.execute(
                'SELECT COUNT(*) as count FROM personnel WHERE boutique_id = ? AND actif = true AND id != ?',
                [personnel[0].boutique_id, personnelId]
            );
            if (actifs[0].count === 0) {
                return res.status(400).json({ erreur: 'Impossible de désactiver. La boutique doit avoir au moins un personnel actif.' });
            }
        }

        // Mettre à jour
        await pool.execute(
            `UPDATE personnel
       SET nom = ?, prenom = ?, telephone = ?, email = ?, type_personnel = ?, salaire = ?, date_embauche = ?, actif = ?, photo = ?
       WHERE id = ?`,
            [nom, prenom, telephone, email || null, type_personnel, salaire || null, date_embauche, actifValue, photoPath, personnelId]
        );

        res.json({ message: 'Personnel modifié avec succès' });
    } catch (error) {
        console.error('Erreur modification personnel:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ erreur: 'Ce numéro de téléphone est déjà utilisé.' });
        } else {
            res.status(500).json({ erreur: 'Erreur serveur.' });
        }
    }
});

// DELETE /personnel/:id - Supprimer un membre du personnel
app.delete('/personnel/:id', verifierToken, async (req, res) => {
    if (req.utilisateur.type !== 'gerant') {
        return res.status(403).json({ erreur: 'Accès refusé.' });
    }

    try {
        const personnelId = parseInt(req.params.id);

        // Vérifier que le personnel existe et appartient à une boutique du gérant
        const [personnel] = await pool.execute(
            `SELECT p.*, p.photo FROM personnel p
       JOIN boutiques b ON p.boutique_id = b.id
       WHERE p.id = ? AND b.gerant_id = ?`,
            [personnelId, req.utilisateur.id]
        );

        if (!personnel.length) {
            return res.status(404).json({ erreur: 'Personnel non trouvé ou accès non autorisé.' });
        }

        // Vérifier qu'il reste au moins 1 personnel actif
        const [actifs] = await pool.execute(
            'SELECT COUNT(*) as count FROM personnel WHERE boutique_id = ? AND actif = true AND id != ?',
            [personnel[0].boutique_id, personnelId]
        );

        if (actifs[0].count === 0 && personnel[0].actif) {
            return res.status(400).json({ erreur: 'Impossible de supprimer. La boutique doit avoir au moins un personnel actif.' });
        }

        // Supprimer la photo si elle existe
        if (personnel[0].photo && fs.existsSync(path.join(__dirname, personnel[0].photo))) {
            try {
                await fsPromises.unlink(path.join(__dirname, personnel[0].photo));
            } catch (err) {
                console.error('Erreur suppression photo:', err);
            }
        }

        // Supprimer le personnel
        await pool.execute('DELETE FROM personnel WHERE id = ?', [personnelId]);

        res.json({ message: 'Personnel supprimé avec succès' });
    } catch (error) {
        console.error('Erreur suppression personnel:', error);
        res.status(500).json({ erreur: 'Erreur serveur.' });
    }
});
