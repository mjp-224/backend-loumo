const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration de Multer pour les uploads d'images
const stockage = multer.diskStorage({
    destination: (req, fichier, cb) => {
        // Déterminer le sous-dossier selon la route
        let subFolder = '';

        // Logique basée sur l'URL de la requête
        if (req.path.includes('/livreurs') || req.baseUrl.includes('/livreurs')) {
            subFolder = 'livreurs';
        } else if (req.path.includes('/personnel') || req.baseUrl.includes('/personnel')) {
            subFolder = 'personnel';
        } else if (req.path.includes('/articles') || req.baseUrl.includes('/articles')) {
            subFolder = 'articles';
        } else if (req.path.includes('/services') || req.baseUrl.includes('/services')) {
            subFolder = 'services';
        } else if (req.path.includes('/boutiques') || req.baseUrl.includes('/boutiques')) {
            subFolder = 'boutiques';
        } else if (req.path.includes('/gerants') || req.baseUrl.includes('/gerants')) {
            subFolder = 'gerants';
        } else if (req.path.includes('/inscription') || req.baseUrl.includes('/inscription')) {
            // Déterminer le sous-dossier selon le type d'utilisateur
            subFolder = req.body.type === 'client' ? 'clients' : 'gerants';
        } else if (req.baseUrl.includes('/utilisateur')) {
            // Profile update for authenticated users
            if (req.utilisateur) {
                subFolder = req.utilisateur.type + 's'; // clients, gerants
            } else {
                // Fallback if logic is weird or testing
                subFolder = 'clients';
            }
        }

        const dossier = subFolder ? `./Uploads/${subFolder}` : './Uploads';

        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync('./Uploads')) {
            fs.mkdirSync('./Uploads');
        }
        if (subFolder && !fs.existsSync(dossier)) {
            fs.mkdirSync(dossier, { recursive: true });
        }

        cb(null, dossier);
    },
    filename: (req, fichier, cb) => {
        cb(null, Date.now() + path.extname(fichier.originalname));
    }
});

const upload = multer({
    storage: stockage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Seules les images JPEG/PNG sont autorisées'));
    }
});

module.exports = upload;
