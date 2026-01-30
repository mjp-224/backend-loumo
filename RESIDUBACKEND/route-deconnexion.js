// Route de déconnexion - Mettre le statut à FALSE (hors ligne)
app.post('/deconnexion', verifierToken, async (req, res) => {
    try {
        // Mettre le statut à FALSE (hors ligne)
        await pool.execute(
            'UPDATE utilisateurs SET statut = FALSE WHERE id = ?',
            [req.utilisateur.id]
        );

        res.json({ message: 'Déconnexion réussie' });
    } catch (erreur) {
        console.error('Erreur déconnexion:', erreur);
        res.status(500).json({ erreur: 'Erreur serveur.' });
    }
});
