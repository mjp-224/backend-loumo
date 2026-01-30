const pool = require('../config/db');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

exports.createService = async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const { nom, description, prix, disponible } = req.body;
    if (!nom || !prix) return res.status(400).json({ erreur: 'Nom et prix requis' });
    const prixNum = parseFloat(prix);
    if (isNaN(prixNum) || prixNum <= 0) {
      return res.status(400).json({ erreur: 'Le prix doit être un nombre positif.' });
    }
    const imagePath = req.file ? `/Uploads/services/${req.file.filename}` : null;
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    const disponibleBool = disponible === 'true' || disponible === true || disponible === '1' || disponible === 1;
    const [resultat] = await pool.execute(
      'INSERT INTO services (boutique_id, nom, description, prix, disponible, image) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, nom, description, prixNum, disponibleBool !== undefined ? disponibleBool : true, imagePath]
    );
    res.json({ id: resultat.insertId });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};

exports.updateService = async (req, res) => {
  console.log('Requête PUT reçue (Service):', {
    utilisateurId: req.utilisateur.id,
    boutiqueId: req.params.id,
    serviceId: req.params.serviceId,
  });

  try {
    if (req.utilisateur.type !== 'gerant') {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }

    const boutiqueId = parseInt(req.params.id);
    const serviceId = parseInt(req.params.serviceId);
    if (isNaN(boutiqueId) || isNaN(serviceId)) {
      return res.status(400).json({ erreur: 'IDs de boutique ou de service invalides' });
    }

    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [boutiqueId]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }

    const [service] = await pool.execute('SELECT id, image FROM services WHERE id = ? AND boutique_id = ?', [serviceId, boutiqueId]);
    if (!service.length) {
      return res.status(404).json({ erreur: 'Service non trouvé' });
    }

    const { nom, description, prix, disponible, conserver_image } = req.body;
    if (!nom || !prix) {
      return res.status(400).json({ erreur: 'Nom et prix sont requis.' });
    }

    const prixNum = parseFloat(prix);
    if (isNaN(prixNum) || prixNum <= 0) {
      return res.status(400).json({ erreur: 'Le prix doit être un nombre positif.' });
    }

    const disponibleBool = disponible === 'true' || disponible === true || disponible === '1' || disponible === 1;

    // Hack pour __dirname qui n'est pas forcément correct si le fichier est dans controllers/
    // On assume que le dossier courant est controllers/ et que Uploads est dans ../Uploads
    // Mais path.join(__dirname, service[0].image) où image = /Uploads/file.jpg va foirer.
    // Dans le code original, __dirname référençait la racine du projet car serveur.js était à la racine.
    // Ici, __dirname est controllers/.
    // On doit remonter d'un cran.
    const rootDir = path.join(__dirname, '..');

    let cheminImage = service[0].image;
    if (req.file) {
      cheminImage = `/Uploads/services/${req.file.filename}`;
      // Suppression ancienne image
      if (service[0].image) {
        const oldPath = path.join(rootDir, service[0].image); // service[0].image commence par /Uploads/
        // Attention, path.join('root', '/Uploads/...') sur windows peut être tricky.
        // Si service[0].image commence par /, path.join peut l'interpréter comme abs.
        // En général, dans la DB c'est '/Uploads/...'
        // On veut 'c:\...\geo-backend\Uploads\...'
        // path.join(rootDir, '/Uploads/file') -> 'c:\...\geo-backend\Uploads\file' (correct si relatif sans slash initial en théorie, mais testons)
        // Mieux vaut utiliser path.join(rootDir, service[0].image.replace(/^\//, '')) ou similaire.
        // Mais conservons la logique "try/catch" si ça foire
        const oldPathFixed = path.join(rootDir, service[0].image.startsWith('/') ? service[0].image.substring(1) : service[0].image);

        if (fs.existsSync(oldPathFixed)) {
          try {
            await fsPromises.unlink(oldPathFixed);
            console.log('Ancienne image supprimée:', service[0].image);
          } catch (err) { console.error('Erreur suppression:', err); }
        }
      }
    } else if (conserver_image === 'true') {
      cheminImage = service[0].image;
    } else {
      cheminImage = null;
      if (service[0].image) {
        const oldPathFixed = path.join(rootDir, service[0].image.startsWith('/') ? service[0].image.substring(1) : service[0].image);
        if (fs.existsSync(oldPathFixed)) {
          try {
            await fsPromises.unlink(oldPathFixed);
          } catch (err) { console.error(err); }
        }
      }
    }

    await pool.execute(
      'UPDATE services SET nom = ?, description = ?, prix = ?, disponible = ?, image = ? WHERE id = ? AND boutique_id = ?',
      [nom, description || null, prixNum, disponibleBool, cheminImage, serviceId, boutiqueId]
    );

    res.json({ message: 'Service mis à jour' });
  } catch (erreur) {
    console.error('Erreur update service:', erreur);
    // Clean up uploaded file if error
    if (req.file) {
      try {
        await fsPromises.unlink(req.file.path);
      } catch (e) { }
    }
    if (erreur.code === 'ER_DUP_ENTRY') return res.status(400).json({ erreur: 'Données en double' });
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};

exports.deleteService = async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    await pool.execute('DELETE FROM services WHERE id = ? AND boutique_id = ?', [req.params.serviceId, req.params.id]);
    res.json({ message: 'Service supprimé' });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    // Support both routes: /services/:id (direct) and /boutiques/:id/services/:serviceId (nested)
    const serviceId = req.params.serviceId || req.params.id;
    const boutiqueId = req.params.serviceId ? req.params.id : null;

    let query, params;
    if (boutiqueId) {
      // Nested route: verify boutique
      query = 'SELECT * FROM services WHERE id = ? AND boutique_id = ?';
      params = [serviceId, boutiqueId];
    } else {
      // Direct route: just get by ID
      query = 'SELECT * FROM services WHERE id = ?';
      params = [serviceId];
    }

    const [service] = await pool.execute(query, params);
    if (!service.length) {
      return res.status(404).json({ erreur: 'Service non trouvé' });
    }
    res.json(service[0]);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};


exports.getServices = async (req, res) => {
  try {
    const [services] = await pool.execute('SELECT * FROM services WHERE boutique_id = ?', [req.params.id]);
    res.json(services);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};