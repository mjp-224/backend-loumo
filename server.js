const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const initialiserBaseDeDonnees = require('./config/initDb');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const boutiqueRoutes = require('./routes/boutiqueRoutes');
const articleRoutes = require('./routes/articleRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const commandeRoutes = require('./routes/commandeRoutes');
const panierRoutes = require('./routes/panierRoutes');
const livreurRoutes = require('./routes/livreurRoutes');
const clientRoutes = require('./routes/clientRoutes');
const gerantRoutes = require('./routes/gerantRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const commentaireRoutes = require('./routes/commentaireRoutes');
const personnelRoutes = require('./routes/personnelRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const demandeServiceRoutes = require('./routes/demandeServiceRoutes');
const reductionRoutes = require('./routes/reductionRoutes');
const utilisateurRoutes = require('./routes/utilisateurRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Static files (Uploads)
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));

// Routes
// Authentication
app.use('/', authRoutes); // login, register, refresh-token

// Feature specific routes
app.use('/', clientRoutes); // Mounted first to capture /commandes/historique before /commandes/:id
app.use('/boutiques', boutiqueRoutes); // /boutiques (and sub-resources like articles if nested, check route file)
// Note: boutiqueRoutes.js mounts paths starting with /boutiques. So we mount it at root or /api?
// existing logic uses root. E.g. app.get('/boutiques')

app.use('/', articleRoutes); // Defines /boutiques/:id/articles and /articles/:id
app.use('/', serviceRoutes); // Defines /boutiques/:id/services and /services/:id
app.use('/commandes', commandeRoutes); // Defines /commandes via relative paths
app.use('/panier', panierRoutes); // Defines /panier via relative paths
app.use('/', livreurRoutes); // Defines /boutiques/:id/livreurs and /livreur/profil (Mixed)
app.use('/', personnelRoutes); // Defines /boutiques/:id/personnel and /personnel/:id (Mixed)
app.use('/super-admin', superAdminRoutes); // Prefix /super-admin
app.use('/', demandeServiceRoutes); // /demandes-services

// Dashboard / Roles

app.use('/gerant', gerantRoutes);
app.use('/livreur', livreurRoutes);
app.use('/personnel', personnelRoutes);
app.use('/client', clientRoutes);

// Other
app.use('/notifications', notificationRoutes);
app.use('/', commentaireRoutes);
app.use('/reductions', reductionRoutes);
app.use('/utilisateur', utilisateurRoutes); // /utilisateur (GET/PUT profile)

// 404 Handler
app.use((req, res, next) => {
    console.log(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ erreur: 'Route non trouvée' });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ erreur: 'Erreur serveur interne' });
});

// Start Server
async function demarrerServeur() {
    try {
        await initialiserBaseDeDonnees();
        const PORT = process.env.PORT;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Serveur démarré sur http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Échec du démarrage du serveur :', error);
        process.exit(1);
    }
}

demarrerServeur();
