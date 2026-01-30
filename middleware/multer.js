const multer = require('multer');
const path = require('path');
const fs = require('fs');

const stockage = multer.diskStorage({
  destination: (req, fichier, cb) => {
    const dossier = './Uploads';
    if (!fs.existsSync(dossier)) {
      fs.mkdirSync(dossier);
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