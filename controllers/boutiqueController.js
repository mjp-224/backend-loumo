const pool = require('../config/db');

exports.createBoutique = async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const { nom, description, categorie, horaires, latitude, longitude, telephone, adresse } = req.body;
    if (!nom || !categorie || !horaires || !latitude || !longitude) {
      return res.status(400).json({ erreur: 'Tous les champs obligatoires doivent être remplis.' });
    }
    const horaireRegex = /^([0-9]{1,2}h-[0-9]{1,2}h)$/;
    if (!horaireRegex.test(horaires)) {
      return res.status(400).json({ erreur: 'Les horaires doivent être au format "7h-19h".' });
    }
    const latitudeNum = parseFloat(latitude);
    const longitudeNum = parseFloat(longitude);
    if (isNaN(latitudeNum) || latitudeNum < -90 || latitudeNum > 90 || isNaN(longitudeNum) || longitudeNum < -180 || longitudeNum > 180) {
      return res.status(400).json({ erreur: 'Coordonnées géographiques invalides.' });
    }
    const telephoneRegex = /^\+?[0-9]{10,20}$/;
    if (telephone && !telephoneRegex.test(telephone)) {
      return res.status(400).json({ erreur: 'Numéro de téléphone invalide.' });
    }
    if (adresse && adresse.length > 255) {
      return res.status(400).json({ erreur: 'L\'adresse ne peut pas dépasser 255 caractères.' });
    }
    const imagePath = req.file ? `/Uploads/boutiques/${req.file.filename}` : null;
    const [resultat] = await pool.execute(
      'INSERT INTO boutiques (nom, description, categorie, horaires, latitude, longitude, telephone, adresse, image, gerant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [nom, description || null, categorie, horaires, latitudeNum, longitudeNum, telephone || null, adresse || null, imagePath, req.utilisateur.id]
    );
    res.json({ id: resultat.insertId });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};

exports.updateBoutique = async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const { nom, description, categorie, horaires, latitude, longitude, telephone, adresse } = req.body;
    if (!nom || !categorie || !horaires || !latitude || !longitude) {
      return res.status(400).json({ erreur: 'Tous les champs obligatoires doivent être remplis.' });
    }
    const horaireRegex = /^([0-9]{1,2}h-[0-9]{1,2}h)$/;
    if (!horaireRegex.test(horaires)) {
      return res.status(400).json({ erreur: 'Les horaires doivent être au format "7h-19h".' });
    }
    const latitudeNum = parseFloat(latitude);
    const longitudeNum = parseFloat(longitude);
    if (isNaN(latitudeNum) || latitudeNum < -90 || latitudeNum > 90 || isNaN(longitudeNum) || longitudeNum < -180 || longitudeNum > 180) {
      return res.status(400).json({ erreur: 'Coordonnées géographiques invalides.' });
    }
    const telephoneRegex = /^\+?[0-9]{10,20}$/;
    if (telephone && !telephoneRegex.test(telephone)) {
      return res.status(400).json({ erreur: 'Numéro de téléphone invalide.' });
    }
    if (adresse && adresse.length > 255) {
      return res.status(400).json({ erreur: 'L\'adresse ne peut pas dépasser 255 caractères.' });
    }

    // Vérification propriété
    const [boutique] = await pool.execute('SELECT gerant_id, image FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }

    let cheminImage = boutique[0].image;
    if (req.file) {
      cheminImage = `/Uploads/boutiques/${req.file.filename}`;
    } else if (req.body.image) {
      cheminImage = req.body.image;
    }

    await pool.execute(
      'UPDATE boutiques SET nom = ?, description = ?, categorie = ?, horaires = ?, latitude = ?, longitude = ?, telephone = ?, adresse = ?, image = ? WHERE id = ?',
      [nom, description || null, categorie, horaires, latitudeNum, longitudeNum, telephone || null, adresse || null, cheminImage, req.params.id]
    );
    res.json({ message: 'Boutique mise à jour' });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};

exports.getAllBoutiques = async (req, res) => {
  try {
    const [boutiques] = await pool.execute('SELECT * FROM boutiques');
    res.json(boutiques);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};

exports.deleteBoutique = async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    await pool.execute('DELETE FROM boutiques WHERE id = ?', [req.params.id]);
    res.json({ message: 'Boutique supprimée' });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};

exports.getMesBoutiques = async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès refusé. Seuls les gérants peuvent accéder à cette ressource.' });
  }
  try {
    const [boutiques] = await pool.execute(
      'SELECT * FROM boutiques WHERE gerant_id = ?',
      [req.utilisateur.id]
    );
    res.json(boutiques);
  } catch (erreur) {
    console.error('Erreur lors de la récupération des boutiques du gérant:', erreur);
    res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des boutiques' });
  }
};

exports.getBoutiqueStats = async (req, res) => {
  if (req.utilisateur.type !== 'gerant') {
    return res.status(403).json({ erreur: 'Accès réservé aux gérants' });
  }

  const boutiqueId = parseInt(req.params.id);
  const periode = req.query.periode || 'all';

  const periodesValides = ['day', 'week', 'month', 'year', 'all'];
  if (!periodesValides.includes(periode)) {
    return res.status(400).json({ erreur: 'Période invalide. Utilisez day, week, month, year ou all.' });
  }

  try {
    const [boutique] = await pool.execute(
      'SELECT id, nom FROM boutiques WHERE id = ? AND gerant_id = ?',
      [boutiqueId, req.utilisateur.id]
    );
    if (!boutique.length) {
      return res.status(403).json({ erreur: 'Boutique non trouvée ou accès non autorisé' });
    }

    let dateCondition = '';
    let dateConditionPeriodePrecedente = '';
    let groupByClause = '';

    if (periode === 'day') {
      dateCondition = 'AND DATE(date_creation) = CURDATE()';
      dateConditionPeriodePrecedente = 'AND DATE(date_creation) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)';
      groupByClause = 'HOUR(date_creation)';
    } else if (periode === 'week') {
      dateCondition = 'AND YEARWEEK(date_creation, 1) = YEARWEEK(CURDATE(), 1)';
      dateConditionPeriodePrecedente = 'AND YEARWEEK(date_creation, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 1)';
      groupByClause = 'DAYNAME(date_creation)';
    } else if (periode === 'month') {
      dateCondition = 'AND YEAR(date_creation) = YEAR(CURDATE()) AND MONTH(date_creation) = MONTH(CURDATE())';
      dateConditionPeriodePrecedente = 'AND YEAR(date_creation) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(date_creation) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))';
      groupByClause = 'DAY(date_creation)';
    } else if (periode === 'year') {
      dateCondition = 'AND YEAR(date_creation) = YEAR(CURDATE())';
      dateConditionPeriodePrecedente = 'AND YEAR(date_creation) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 YEAR))';
      groupByClause = 'MONTH(date_creation)';
    }

    // 1. COMMANDES
    const [commandesParStatut] = await pool.execute(
      `SELECT statut, COUNT(*) AS total
       FROM commandes
       WHERE boutique_id = ? ${dateCondition}
       GROUP BY statut`,
      [boutiqueId]
    );

    const commandesTotal = commandesParStatut.reduce((sum, c) => sum + parseInt(c.total), 0);
    const commandesCompletees = commandesParStatut.find(c => c.statut === 'livrée')?.total || 0;
    const tauxCompletion = commandesTotal > 0 ? ((commandesCompletees / commandesTotal) * 100).toFixed(1) : 0;

    const [commandesPeriodePrecedente] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM commandes
       WHERE boutique_id = ? ${dateConditionPeriodePrecedente}`,
      [boutiqueId]
    );

    const commandesPrecedent = parseInt(commandesPeriodePrecedente[0]?.total) || 0;
    const croissanceCommandes = commandesPrecedent > 0
      ? (((commandesTotal - commandesPrecedent) / commandesPrecedent) * 100).toFixed(1)
      : 0;

    // 2. REVENUS
    const [revenus] = await pool.execute(
      `SELECT SUM(prix * quantite) AS total, COUNT(*) AS nombre_commandes,
              AVG(prix * quantite) AS moyenne_commande
       FROM commandes
       WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée', 'terminée') ${dateCondition}`,
      [boutiqueId]
    );

    const revenuTotal = parseFloat(revenus[0]?.total) || 0;
    const moyenneParCommande = parseFloat(revenus[0]?.moyenne_commande) || 0;

    const [revenusPeriodePrecedente] = await pool.execute(
      `SELECT SUM(prix * quantite) AS total
       FROM commandes
       WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée', 'terminée') ${dateConditionPeriodePrecedente}`,
      [boutiqueId]
    );

    const revenuPrecedent = parseFloat(revenusPeriodePrecedente[0]?.total) || 0;
    const croissanceRevenus = revenuPrecedent > 0
      ? (((revenuTotal - revenuPrecedent) / revenuPrecedent) * 100).toFixed(1)
      : 0;

    let revenusParPeriode;
    if (groupByClause) {
      [revenusParPeriode] = await pool.execute(
        `SELECT ${groupByClause} AS periode, SUM(prix * quantite) AS total
         FROM commandes
         WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée', 'terminée') ${dateCondition}
         GROUP BY ${groupByClause}
         ORDER BY date_creation`,
        [boutiqueId]
      );
    } else {
      [revenusParPeriode] = await pool.execute(
        `SELECT DATE_FORMAT(date_creation, '%Y-%m') AS periode, SUM(prix * quantite) AS total
         FROM commandes
         WHERE boutique_id = ? AND statut IN ('en préparation', 'livrée', 'terminée')
         GROUP BY YEAR(date_creation), MONTH(date_creation)
         ORDER BY date_creation
         LIMIT 12`,
        [boutiqueId]
      );
    }

    let tendancePente = 0;
    if (revenusParPeriode.length > 1) {
      const valeurs = revenusParPeriode.map(r => parseFloat(r.total));
      const differences = valeurs.slice(1).map((v, i) => v - valeurs[i]);
      tendancePente = differences.reduce((sum, d) => sum + d, 0) / differences.length;
    }

    const prediction = revenusParPeriode.length > 0
      ? revenusParPeriode.reduce((sum, r) => sum + parseFloat(r.total), 0) / revenusParPeriode.length
      : 0;

    // 3. CLIENTS
    const [clientsTotal] = await pool.execute(
      `SELECT COUNT(DISTINCT utilisateur_id) AS total
       FROM commandes
       WHERE boutique_id = ? ${dateCondition}`,
      [boutiqueId]
    );

    const [clientsRecurrents] = await pool.execute(
      `SELECT COUNT(DISTINCT utilisateur_id) AS total
       FROM commandes
       WHERE boutique_id = ? AND utilisateur_id IN (
         SELECT utilisateur_id FROM commandes WHERE boutique_id = ? GROUP BY utilisateur_id HAVING COUNT(*) > 1
       ) ${dateCondition}`,
      [boutiqueId, boutiqueId]
    );

    const totalClients = parseInt(clientsTotal[0]?.total) || 0;
    const recurrents = parseInt(clientsRecurrents[0]?.total) || 0;
    const nouveaux = totalClients - recurrents;
    const tauxRetention = totalClients > 0 ? ((recurrents / totalClients) * 100).toFixed(1) : 0;

    // 4. TOP PRODUITS/SERVICES
    const [topArticles] = await pool.execute(
      `SELECT a.nom, SUM(c.quantite) AS quantite_totale, SUM(c.prix * c.quantite) AS revenu_total
       FROM commandes c
       JOIN articles a ON c.article_id = a.id
       WHERE c.boutique_id = ? AND c.article_id IS NOT NULL ${dateCondition}
       GROUP BY a.id, a.nom
       ORDER BY revenu_total DESC
       LIMIT 5`,
      [boutiqueId]
    );

    const [topServices] = await pool.execute(
      `SELECT s.nom, COUNT(DISTINCT ds.id) AS nombre_demandes, SUM(ds.prix) AS revenu_total
       FROM demandes_services ds
       JOIN services s ON ds.service_id = s.id
       WHERE ds.boutique_id = ? ${dateCondition.replace('date_creation', 'ds.date_creation')}
       GROUP BY s.id, s.nom
       ORDER BY revenu_total DESC
       LIMIT 5`,
      [boutiqueId]
    );

    res.json({
      boutique: {
        id: boutique[0].id,
        nom: boutique[0].nom
      },
      revenus: {
        total: revenuTotal,
        moyenneParCommande: moyenneParCommande.toFixed(0),
        croissance: parseFloat(croissanceRevenus),
        parPeriode: revenusParPeriode.map(r => ({
          periode: r.periode,
          total: parseFloat(r.total).toFixed(0)
        })),
        tendance: {
          pente: tendancePente.toFixed(0),
          direction: tendancePente > 0 ? 'hausse' : tendancePente < 0 ? 'baisse' : 'stable',
          prediction: prediction.toFixed(0)
        }
      },
      commandes: {
        total: commandesTotal,
        parStatut: commandesParStatut.reduce((obj, c) => {
          obj[c.statut] = parseInt(c.total);
          return obj;
        }, {}),
        tauxCompletion: parseFloat(tauxCompletion),
        croissance: parseFloat(croissanceCommandes)
      },
      clients: {
        total: totalClients,
        nouveaux: nouveaux,
        recurrents: recurrents,
        tauxRetention: parseFloat(tauxRetention)
      },
      topProduits: topArticles.map(a => ({
        nom: a.nom,
        quantite: parseInt(a.quantite_totale),
        revenu: parseFloat(a.revenu_total).toFixed(0)
      })),
      topServices: topServices.map(s => ({
        nom: s.nom,
        demandes: parseInt(s.nombre_demandes),
        revenu: parseFloat(s.revenu_total).toFixed(0)
      }))
    });

  } catch (error) {
    console.error('Erreur statistiques:', error);
    res.status(500).json({ erreur: 'Erreur lors de la récupération des statistiques' });
  }
};

exports.getBoutiqueById = async (req, res) => {
  try {
    const [boutique] = await pool.execute('SELECT * FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length) return res.status(404).json({ erreur: 'Boutique non trouvée' });

    // Récupération des sous-ressources pour la vue détaillée
    const [articles] = await pool.execute('SELECT * FROM articles WHERE boutique_id = ?', [req.params.id]);
    const [services] = await pool.execute('SELECT * FROM services WHERE boutique_id = ?', [req.params.id]);
    const [commentaires] = await pool.execute(
      'SELECT c.*, u.nom, u.prenom FROM commentaires c JOIN clients u ON c.utilisateur_id = u.id WHERE c.boutique_id = ?',
      [req.params.id]
    );
    // Note: livreurs info included in original query, dangerous to expose publically? 
    // Original code: includes livreurs. Keeping it for compatibility.
    const [livreurs] = await pool.execute(
      'SELECT id, boutique_id, nom, prenom, telephone, email, photo, adresse, actif, date_creation FROM livreurs WHERE boutique_id = ?',
      [req.params.id]
    );

    res.json({ ...boutique[0], articles, services, commentaires, livreurs });
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};

exports.getVisiteurs = async (req, res) => {
  if (req.utilisateur.type !== 'gerant') return res.status(403).json({ erreur: 'Accès refusé' });
  try {
    const [boutique] = await pool.execute('SELECT gerant_id FROM boutiques WHERE id = ?', [req.params.id]);
    if (!boutique.length || boutique[0].gerant_id !== req.utilisateur.id) {
      return res.status(403).json({ erreur: 'Accès refusé' });
    }
    const periode = req.query.periode || 'jour';
    let requete;
    let params = [req.params.id];
    if (periode === 'jour') {
      requete = `
        SELECT DATE(date_visite) AS date, COUNT(DISTINCT utilisateur_id) AS visiteurs
        FROM historique_visites
        WHERE boutique_id = ? AND DATE(date_visite) = CURDATE()
        GROUP BY DATE(date_visite)
      `;
    } else if (periode === 'semaine') {
      requete = `
        SELECT WEEK(date_visite, 1) AS semaine, COUNT(DISTINCT utilisateur_id) AS visiteurs
        FROM historique_visites
        WHERE boutique_id = ? AND YEAR(date_visite) = YEAR(CURDATE())
        GROUP BY WEEK(date_visite, 1)
      `;
    } else if (periode === 'mois') {
      requete = `
        SELECT MONTH(date_visite) AS mois, COUNT(DISTINCT utilisateur_id) AS visiteurs
        FROM historique_visites
        WHERE boutique_id = ? AND YEAR(date_visite) = YEAR(CURDATE())
        GROUP BY MONTH(date_visite)
      `;
    } else {
      return res.status(400).json({ erreur: 'Période invalide' });
    }
    const [visiteurs] = await pool.execute(requete, params);
    res.json(visiteurs);
  } catch (erreur) {
    console.error(erreur);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
};