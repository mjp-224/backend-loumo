-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : jeu. 29 jan. 2026 à 12:36
-- Version du serveur : 10.4.27-MariaDB
-- Version de PHP : 8.2.0

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `mapshop`
--

-- --------------------------------------------------------

--
-- Structure de la table `articles`
--

CREATE TABLE `articles` (
  `id` int(11) NOT NULL,
  `boutique_id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `prix` decimal(10,2) NOT NULL,
  `stock` int(11) DEFAULT 0,
  `image` varchar(255) DEFAULT NULL,
  `date_exp` date DEFAULT NULL,
  `date_prod` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `articles`
--

INSERT INTO `articles` (`id`, `boutique_id`, `nom`, `description`, `prix`, `stock`, `image`, `date_exp`, `date_prod`) VALUES
(1, 1, 'Mangue', 'Fruit en vitamine c', '2500.00', 42, '/uploads/1767278727518.jpeg', NULL, NULL),
(2, 2, 'HP', 'core i9 5Go RAM 512Go SSD...', '3000000.00', 97, '/uploads/1767434826037.jpeg', NULL, NULL),
(3, 2, 'Dell', 'Core i9 32Go RAM 1To SSD...', '5500000.00', 43, '/uploads/1767434995316.jpeg', NULL, NULL),
(4, 1, 'Gâteau d\'anniversaire', 'Gâteau fabriqué à la base de farine et du blé', '5000.00', 136, '/Uploads/1768209123055.jpeg', NULL, NULL),
(5, 1, 'Gâteau au chocolat', 'Fait à base de farine, œuf, miel chocolat et beurre', '250000.00', 155, '/Uploads/articles/1769637075832.jpeg', NULL, NULL),
(7, 1, 'Riz jaune', 'Riz chinois', '150000.00', 150, '/Uploads/articles/1769635435062.jpeg', '2027-01-28', '2025-11-22'),
(9, 4, 'Plat à la soupe', 'Soupe à la viande, pomme de terre, etc', '50000.00', 29, '/Uploads/articles/1769642868980.jpeg', NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `boutiques`
--

CREATE TABLE `boutiques` (
  `id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `categorie` varchar(50) NOT NULL,
  `horaires` varchar(255) NOT NULL,
  `latitude` decimal(9,6) NOT NULL,
  `longitude` decimal(9,6) NOT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `gerant_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `boutiques`
--

INSERT INTO `boutiques` (`id`, `nom`, `description`, `categorie`, `horaires`, `latitude`, `longitude`, `telephone`, `adresse`, `image`, `gerant_id`) VALUES
(1, 'TC shop', 'Vente des produit agricoles', 'Fruits et légumes', '8h-22h', '9.652927', '-13.569542', '+224664341709', 'Fria (Sabendhè)', '/Uploads/boutiques/1769637147919.jpeg', 1),
(2, 'KJS GROUP', 'Nous vendons des equipements informatiques et electroniques', 'Techonologie Informatique', '7h-23h', '9.652917', '-13.568448', '+224620408850', 'Nongo', '/uploads/1767434651040.jpeg', 1),
(3, 'Sk', 'Sk boutique', 'Service', '7h-9h', '9.651553', '-13.569904', '+224620728773', 'Nongo', '/uploads/1768830318254.jpeg', 7),
(4, 'Le Renouveau Shop', 'Vente d\'outils Informatiques', 'Matériels Informatiques', '7h-22h', '9.653233', '-13.568288', '+224620408850', 'SOS', '/Uploads/boutiques/1769643189676.jpeg', 1),
(5, 'Tima Shop', 'Vêtements, chaussures et autres', 'Shopping', '7h-23h', '9.652588', '-13.569542', '+224610108855', 'Kipé centre émetteur', '/Uploads/boutiques/1769637501418.jpeg', 1);

-- --------------------------------------------------------

--
-- Structure de la table `clients`
--

CREATE TABLE `clients` (
  `id` int(11) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `prenom` varchar(50) NOT NULL,
  `telephone` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `date_inscription` datetime NOT NULL,
  `date_naissance` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `clients`
--

INSERT INTO `clients` (`id`, `nom`, `prenom`, `telephone`, `email`, `image`, `mot_de_passe`, `date_inscription`, `date_naissance`) VALUES
(2, 'Johnson', 'Moise', '+224620408850', 'johnsonmoise2100@gmail.com', '/Uploads/clients/1769671863697.jpg', '$2b$10$a24BPIgr1EMRiBKVvkPgE../kNfIDhxSUTxlAynZf4qRn2H3glyvi', '2026-01-01 15:50:00', '2003-02-12'),
(3, 'Kamano', 'Ismael', '+224620728773', 'ismaelkamano@gmail.com', '/uploads/1767446263327.jpeg', '$2b$10$3LF2aWBgqx8mdDm7zL.miu51WZfCCSlBSUt7ZiDViknrSMwckiiNO', '2026-01-03 14:17:43', '2026-01-03'),
(5, 'Pepcyno', 'Ismael', '+224666381243', NULL, '/uploads/1768570178736.jpeg', '$2b$10$eT1wpmg71RJSH5gLrvemze6SDJ4hT7jCtPX3Nr3yuCIfDiy2I5k0C', '2026-01-16 14:29:38', '2026-01-16'),
(6, 'Sacko', 'Mamady', '+224612374585', 'sacko2120@gmail.com', '/uploads/1769259201674.jpg', '$2b$10$498ptU4tbaQ9PSIS7nz0BuE9/.kJ4XJ1A1znPOm.lK75Xfsx.vJ56', '2026-01-24 12:58:40', '2002-01-23'),
(7, 'Johnson', 'Blaise', '+224621036603', NULL, '/uploads/1769461097418.jpeg', '$2b$10$LXd1NhBHqaTGhPPmAHLlFuIjOF/x.wxFFDLaS4KL9bu9pgACLJdcy', '2026-01-26 21:58:17', '2002-11-27'),
(8, 'Camara', 'Sekou', '+224629000363', NULL, '/uploads/1769462099443.jpg', '$2b$10$uEbFkTA8pShmiNzfBs23HuTJbqNbUZoufQLKQAU6byYlxOj/r0zoK', '2026-01-26 22:13:14', '1997-01-06');

-- --------------------------------------------------------

--
-- Structure de la table `commandes`
--

CREATE TABLE `commandes` (
  `id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `boutique_id` int(11) NOT NULL,
  `article_id` int(11) DEFAULT NULL,
  `service_id` int(11) DEFAULT NULL,
  `prix` decimal(10,2) NOT NULL,
  `statut` enum('en attente','acceptée','en préparation','livrée','en cours de livraison') NOT NULL DEFAULT 'en attente',
  `image` varchar(255) DEFAULT NULL,
  `moyen_paiement` enum('Orange Money','Mobile Money','John-Pay','Cash','Paypal') DEFAULT NULL,
  `date_creation` datetime DEFAULT current_timestamp(),
  `quantite` int(11) DEFAULT 1,
  `livreur_id` int(11) DEFAULT NULL,
  `client_latitude` decimal(10,6) DEFAULT NULL,
  `client_longitude` decimal(10,6) DEFAULT NULL,
  `client_nom` varchar(100) DEFAULT NULL,
  `client_telephone` varchar(20) DEFAULT NULL,
  `adresse_livraison` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `commandes`
--

INSERT INTO `commandes` (`id`, `utilisateur_id`, `boutique_id`, `article_id`, `service_id`, `prix`, `statut`, `image`, `moyen_paiement`, `date_creation`, `quantite`, `livreur_id`, `client_latitude`, `client_longitude`, `client_nom`, `client_telephone`, `adresse_livraison`) VALUES
(1, 2, 1, 1, NULL, '200.00', 'livrée', '/uploads/1767278727518.jpeg', '', '2026-01-02 17:09:00', 5, 1, '9.615805', '-13.633888', 'Moise Johnson', '620408850', ''),
(2, 2, 1, 1, NULL, '2500.00', 'livrée', '/uploads/1767278727518.jpeg', 'John-Pay', '2026-01-03 11:26:25', 1, 1, '9.652917', '-13.568451', 'Moise Johnson', '620408850', ''),
(3, 3, 1, 1, NULL, '2500.00', 'en attente', '/uploads/1767278727518.jpeg', 'Cash', '2026-01-03 14:46:31', 1, NULL, '9.652589', '-13.569535', 'Ismael Kamano', '+224620728773', ''),
(4, 3, 2, 3, NULL, '5500000.00', 'en attente', '/uploads/1767434995316.jpeg', 'Cash', '2026-01-03 14:48:58', 1, NULL, '9.652781', '-13.568332', 'Ismael Kamano', '+224620728773', ''),
(10, 2, 2, 3, NULL, '16500000.00', 'en préparation', '/uploads/1767434995316.jpeg', '', '2026-01-11 09:54:39', 3, NULL, '9.652968', '-13.568297', 'Moise Johnson', '620408850', ''),
(19, 2, 1, 1, NULL, '15000.00', 'en cours de livraison', '/uploads/1767278727518.jpeg', '', '2026-01-16 13:46:54', 6, 2, '9.615837', '-13.633679', 'Moise Johnson', '620408850', ''),
(20, 2, 1, 1, NULL, '17500.00', 'livrée', '/uploads/1767278727518.jpeg', '', '2026-01-16 13:47:37', 7, 1, '9.615837', '-13.633678', 'Moise Johnson', '620408850', ''),
(21, 3, 1, 4, NULL, '15000.00', 'en attente', '/Uploads/1768209123055.jpeg', 'Cash', '2026-01-16 13:54:02', 3, NULL, '9.615840', '-13.633671', 'Ismael Kamano', '+224620728773', ''),
(22, 3, 1, 4, NULL, '25000.00', 'en attente', '/Uploads/1768209123055.jpeg', 'Cash', '2026-01-16 13:54:15', 5, NULL, '9.615840', '-13.633671', 'Ismael Kamano', '+224620728773', ''),
(23, 5, 2, 2, NULL, '6000000.00', 'en préparation', '/uploads/1767434826037.jpeg', '', '2026-01-16 14:34:10', 2, NULL, '9.615692', '-13.633662', 'Ismael Pepcyno', '+224666381243', ''),
(26, 5, 2, 2, NULL, '3000000.00', 'en préparation', '/uploads/1767434826037.jpeg', '', '2026-01-16 16:04:55', 1, NULL, '9.615322', '-13.634643', 'Ismael Pepcyno', '+224666381243', ''),
(31, 2, 2, 3, NULL, '3500000.00', 'en attente', '/uploads/1767434995316.jpeg', '', '2026-01-19 18:54:25', 7, NULL, '9.652749', '-13.568273', 'Moise Johnson', '+224620408850', ''),
(33, 2, 1, 4, NULL, '10000.00', 'livrée', '/Uploads/1768209123055.jpeg', '', '2026-01-19 19:12:08', 2, 1, '9.652944', '-13.568226', 'Moise Johnson', '+224620408850', ''),
(34, 2, 1, 5, NULL, '700000.00', 'en attente', '/uploads/1768209276106.jpeg', '', '2026-01-19 20:54:11', 3, NULL, '9.652756', '-13.568612', 'Moise Johnson', '+224620408850', ''),
(36, 6, 1, 1, NULL, '2500.00', 'en cours de livraison', '/uploads/1767278727518.jpeg', '', '2026-01-24 13:47:25', 1, 2, '9.615780', '-13.633905', 'Mamady Sacko', '+224612374585', ''),
(37, 6, 1, 5, NULL, '250000.00', 'livrée', '/uploads/1768209276106.jpeg', '', '2026-01-24 13:47:47', 1, 1, '9.615775', '-13.633897', 'Mamady Sacko', '+224612374585', ''),
(38, 2, 1, 4, NULL, '5000.00', 'en attente', '/Uploads/1768209123055.jpeg', '', '2026-01-26 19:10:47', 1, NULL, '9.652927', '-13.569542', 'Moise Johnson', '+224620408850', ''),
(39, 2, 1, 5, NULL, '250000.00', 'en attente', '/uploads/1768209276106.jpeg', '', '2026-01-26 19:18:43', 1, NULL, '9.650308', '-13.567011', 'Moise Johnson', '+224620408850', ''),
(40, 2, 1, 5, NULL, '250000.00', 'en attente', '/uploads/1768209276106.jpeg', '', '2026-01-26 19:21:01', 1, NULL, '9.652927', '-13.569542', 'Moise Johnson', '+224620408850', ''),
(41, 2, 1, 5, NULL, '250000.00', 'en préparation', '/uploads/1768209276106.jpeg', '', '2026-01-26 19:24:10', 1, NULL, '9.652587', '-13.569542', 'Moise Johnson', '+224620408850', ''),
(42, 2, 1, 1, NULL, '2500.00', 'en préparation', '/uploads/1767278727518.jpeg', '', '2026-01-26 19:25:55', 1, NULL, '9.653124', '-13.568368', 'Moise Johnson', '+224620408850', ''),
(43, 2, 1, 4, NULL, '5000.00', 'en préparation', '/Uploads/1768209123055.jpeg', '', '2026-01-26 20:24:41', 1, NULL, '9.652891', '-13.568449', 'Moise Johnson', '+224620408850', ''),
(44, 2, 2, 3, NULL, '5500000.00', 'en attente', '/uploads/1767434995316.jpeg', '', '2026-01-26 20:29:35', 1, NULL, '9.650931', '-13.568457', 'Moise Johnson', '+224620408850', ''),
(45, 2, 1, 4, NULL, '4500.00', 'en préparation', '/Uploads/1768209123055.jpeg', '', '2026-01-26 20:43:15', 1, NULL, '9.652587', '-13.569542', 'Moise Johnson', '+224620408850', ''),
(48, 2, 1, 1, NULL, '2500.00', 'en préparation', '/uploads/1767278727518.jpeg', '', '2026-01-28 15:22:24', 1, NULL, '9.615444', '-13.633985', 'Moise Johnson', '+224620408850', NULL),
(49, 2, 1, 4, NULL, '5000.00', 'en préparation', '/Uploads/1768209123055.jpeg', '', '2026-01-28 15:22:32', 1, NULL, '9.615490', '-13.633931', 'Moise Johnson', '+224620408850', NULL),
(51, 2, 4, 9, NULL, '150000.00', 'livrée', '/Uploads/articles/1769642868980.jpeg', '', '2026-01-29 00:38:24', 3, 8, '9.650931', '-13.568457', 'Moïse Johnson', '+224620408850', NULL),
(52, 2, 4, 9, NULL, '140000.00', 'en attente', '/Uploads/articles/1769642868980.jpeg', '', '2026-01-29 10:36:26', 3, NULL, '9.653083', '-13.568401', 'Moise Johnson', '+224620408850', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `commentaires`
--

CREATE TABLE `commentaires` (
  `id` int(11) NOT NULL,
  `boutique_id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `texte` text NOT NULL,
  `article_id` int(11) DEFAULT NULL,
  `service_id` int(11) DEFAULT NULL,
  `date_creation` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `commentaires`
--

INSERT INTO `commentaires` (`id`, `boutique_id`, `utilisateur_id`, `texte`, `article_id`, `service_id`, `date_creation`) VALUES
(1, 2, 3, 'Service remarquable...', NULL, 2, '2026-01-03 14:42:39'),
(2, 2, 2, 'Ce services remarquable...', NULL, 2, '2026-01-09 22:15:56'),
(3, 1, 2, 'J\'aime très bien ce articles et c\'est de qualité en plus.', 1, NULL, '2026-01-09 23:01:20'),
(4, 1, 2, 'Ce service est impeccable. !!!', NULL, 1, '2026-01-11 09:06:18'),
(5, 2, 3, 'Super', 2, NULL, '2026-01-16 14:11:53'),
(6, 2, 3, 'J\'aime bien', 2, NULL, '2026-01-16 14:13:59'),
(7, 1, 2, 'J\'aime', 1, NULL, '2026-01-19 15:53:50'),
(11, 1, 2, 'Ce service est vraiment intéressant ! Essayez et vous verrez !', NULL, 1, '2026-01-19 19:31:53'),
(12, 1, 6, 'J\'aime bien ce gateau', 5, NULL, '2026-01-24 13:20:50'),
(13, 1, 6, 'bon service', NULL, 3, '2026-01-24 13:44:25'),
(15, 1, 2, 'Je me disais la même chose aussi.', NULL, 3, '2026-01-27 22:55:13'),
(16, 4, 2, 'Humm !', 9, NULL, '2026-01-29 00:39:15');

-- --------------------------------------------------------

--
-- Structure de la table `demandes_services`
--

CREATE TABLE `demandes_services` (
  `id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `boutique_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `statut` enum('en_attente','acceptée','refusée','en_cours','terminée','annulée') DEFAULT 'en_attente',
  `prix` decimal(10,2) NOT NULL,
  `moyen_paiement` varchar(50) DEFAULT 'Cash',
  `client_nom` varchar(100) NOT NULL,
  `client_telephone` varchar(20) NOT NULL,
  `client_latitude` decimal(10,7) DEFAULT NULL,
  `client_longitude` decimal(10,7) DEFAULT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `demandes_services`
--

INSERT INTO `demandes_services` (`id`, `utilisateur_id`, `boutique_id`, `service_id`, `statut`, `prix`, `moyen_paiement`, `client_nom`, `client_telephone`, `client_latitude`, `client_longitude`, `adresse`, `date_creation`, `date_modification`, `notes`) VALUES
(1, 2, 1, 1, 'en_attente', '10.00', 'Cash', 'Moise Johnson', '620408850', '9.6528640', '-13.5683290', '', '2026-01-11 09:02:23', '2026-01-11 09:02:23', ''),
(2, 2, 1, 1, 'en_attente', '10.00', 'Cash', 'Moise Johnson', '620408850', '9.6525870', '-13.5695420', '', '2026-01-11 09:05:29', '2026-01-11 09:05:29', ''),
(3, 2, 1, 1, 'en_attente', '10.00', 'Cash', 'Moise Johnson', '620408850', '9.6515530', '-13.5699040', '', '2026-01-11 09:12:55', '2026-01-11 09:12:55', ''),
(4, 2, 1, 1, 'en_attente', '10.00', 'Cash', 'Moise Johnson', '620408850', '9.6515530', '-13.5699040', '', '2026-01-11 09:35:34', '2026-01-11 09:35:34', ''),
(5, 2, 1, 1, 'en_attente', '10.00', 'Cash', 'Moise Johnson', '620408850', '9.6530330', '-13.5681080', '', '2026-01-11 09:38:12', '2026-01-11 09:38:12', ''),
(6, 2, 1, 1, 'en_attente', '10.00', 'Cash', 'Moise Johnson', '620408850', '9.6527880', '-13.5682900', '', '2026-01-11 09:38:46', '2026-01-11 09:38:46', ''),
(7, 2, 2, 2, 'en_attente', '1.00', 'Cash', 'Moise Johnson', '620408850', '9.6528580', '-13.5684660', '', '2026-01-11 09:43:03', '2026-01-11 09:43:03', ''),
(8, 2, 2, 2, 'en_attente', '1.00', 'Cash', 'Moise Johnson', '620408850', '9.6528530', '-13.5684720', '', '2026-01-11 09:48:05', '2026-01-11 09:48:05', ''),
(9, 2, 2, 2, 'en_attente', '1.00', 'Cash', 'Moise Johnson', '620408850', '9.6529510', '-13.5681670', '', '2026-01-11 11:48:14', '2026-01-11 11:48:14', ''),
(10, 2, 2, 2, 'en_attente', '1.00', 'Cash', 'Moise Johnson', '620408850', '9.6529460', '-13.5682100', '', '2026-01-11 11:55:32', '2026-01-11 11:55:32', ''),
(11, 2, 1, 1, 'en_attente', '10.00', 'Cash', 'Moise Johnson', '620408850', '9.6529490', '-13.5682150', '', '2026-01-11 11:59:02', '2026-01-11 11:59:02', ''),
(12, 3, 2, 2, 'en_attente', '1.00', 'Cash', 'Ismael Kamano', '+224620728773', '9.6158050', '-13.6336180', '', '2026-01-16 13:12:15', '2026-01-16 13:12:15', ''),
(13, 3, 2, 2, 'en_attente', '1.00', 'Cash', 'Ismael Kamano', '+224620728773', '9.6158050', '-13.6336180', '', '2026-01-16 13:14:30', '2026-01-16 13:14:30', ''),
(14, 3, 1, 3, 'en_attente', '2500000.00', 'Cash', 'Ismael Kamano', '+224620728773', '9.6153220', '-13.6346430', '', '2026-01-16 13:18:08', '2026-01-16 13:18:08', ''),
(15, 5, 2, 2, 'en_attente', '1.00', 'Cash', 'Ismael Pepcyno', '+224666381243', '9.6164960', '-13.6336740', '', '2026-01-16 14:02:03', '2026-01-16 14:02:03', ''),
(16, 2, 1, 3, 'en_attente', '2500000.00', 'Cash', 'Moise Johnson', '+224620408850', '9.6529530', '-13.5682020', '', '2026-01-19 18:17:37', '2026-01-19 18:17:37', ''),
(17, 6, 1, 3, 'en_attente', '2500000.00', 'Cash', 'Mamady Sacko', '+224612374585', '9.6157680', '-13.6338960', '', '2026-01-24 12:44:32', '2026-01-24 12:44:32', ''),
(18, 2, 1, 3, 'en_attente', '2500000.00', 'Cash', 'Moise Johnson', '+224620408850', '9.6509310', '-13.5684570', '', '2026-01-26 19:23:55', '2026-01-26 19:23:55', '');

-- --------------------------------------------------------

--
-- Structure de la table `gerants`
--

CREATE TABLE `gerants` (
  `id` int(11) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `prenom` varchar(50) NOT NULL,
  `telephone` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `date_inscription` datetime NOT NULL,
  `date_naissance` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `gerants`
--

INSERT INTO `gerants` (`id`, `nom`, `prenom`, `telephone`, `email`, `image`, `mot_de_passe`, `date_inscription`, `date_naissance`) VALUES
(1, 'Camara', 'Teninké', '+224664341709', 'teninkcamara@gmail.com', '/Uploads/gerants/1769634889328.jpeg', '$2b$10$B5KqCFyJxiANWs6iviPW2OtVLu4Xg0xLmgNF/jyzesMPFF.k.vHl6', '2026-01-01 15:35:24', '1977-01-01'),
(6, 'Sylla', 'Hawa', '+224628723093', NULL, '/uploads/1768578004648.jpeg', '$2b$10$4t.0MebVBDqc6qp7CLbTbe4LbC6pGnCRHW63n5nFf663h/exCuLZG', '2026-01-16 16:39:19', '1985-01-01'),
(7, 'Kamano ', 'Ismael ', '+224620728773', NULL, NULL, '$2b$10$ftN.5EkcTmiClU3pJlztIuCbXU4on5eFRP/3MlWENutr5rfxzr4UC', '2026-01-19 14:35:42', '2026-01-19');

-- --------------------------------------------------------

--
-- Structure de la table `historique_visites`
--

CREATE TABLE `historique_visites` (
  `utilisateur_id` int(11) NOT NULL,
  `boutique_id` int(11) NOT NULL,
  `date_visite` datetime NOT NULL,
  `frequence` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `livreurs`
--

CREATE TABLE `livreurs` (
  `id` int(11) NOT NULL,
  `boutique_id` int(11) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `prenom` varchar(50) NOT NULL,
  `telephone` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `actif` tinyint(1) DEFAULT 1,
  `date_creation` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `livreurs`
--

INSERT INTO `livreurs` (`id`, `boutique_id`, `nom`, `prenom`, `telephone`, `email`, `password`, `photo`, `adresse`, `actif`, `date_creation`) VALUES
(1, 1, 'Johnson', 'Moise', '620408850', 'johnsonmoise2100@gmail.com', '$2b$10$EnOjUAh2XsBAqv8doG5xYuAAOkx4Ec2DSp7y7B/9TwsgEypRSmohe', '/uploads/1768207832107.jpg', 'SOS', 1, '2026-01-01 15:47:08'),
(2, 1, 'Kamano', 'Ismael', '620728773', NULL, '$2b$12$CpVYWDVN.aP3taItr09WJ.Xfc.VnctkZqOyNwPOXadBE/I3L7QIkC', '/Uploads/livreurs/1768210444023.jpg', 'Kissosso ', 1, '2026-01-10 18:01:58'),
(3, 1, 'Sandoz', 'Français', '+3377856690', 'sandozfr@gmail.com', '$2b$12$clDORSMXdo39KTS1EcCSl.BkPjENmV/JE.8rYlhSCLHAP7ESAjAXS', '/Uploads/livreurs/1768210480563.jpg', 'France(Toulouse)', 1, '2026-01-12 09:40:28'),
(5, 1, 'Fatoumata', 'Diallo', '613131312', NULL, '$2b$12$jCYv/NT6FiQbd93124/ALOy/6/PwwUItQC7vp5Iuad7A1ouCsHpLy', '/Uploads/livreurs/1768210584813.jpg', NULL, 1, '2026-01-12 10:36:25'),
(8, 4, 'Mr ', 'Le Blanc', '620151567', NULL, '$2b$12$V.lp5Z9TzmujZDor1U4yJOXsA57rzop8dyIx4P4uTl5J3fHZrhSL6', '/Uploads/livreurs/1769679853603.jpg', 'Faranci', 1, '2026-01-29 10:44:14');

-- --------------------------------------------------------

--
-- Structure de la table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `boutique_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(20) DEFAULT 'client',
  `date` datetime NOT NULL,
  `lu` tinyint(1) NOT NULL DEFAULT 0,
  `client_id` int(11) DEFAULT NULL,
  `gerant_id` int(11) DEFAULT NULL,
  `utilisateur_id` int(11) NOT NULL DEFAULT 0,
  `type_utilisateur` enum('client','gerant','livreur') DEFAULT 'client'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `notifications`
--

INSERT INTO `notifications` (`id`, `boutique_id`, `message`, `type`, `date`, `lu`, `client_id`, `gerant_id`, `utilisateur_id`, `type_utilisateur`) VALUES
(1, 1, 'Nouvelle commande #1 passée pour votre boutique.', 'client', '2026-01-02 17:09:00', 0, NULL, 1, 0, 'client'),
(2, 1, 'Nouvelle demande de réduction pour la commande #1 : 200 GNF proposé (prix initial : 12500.00 GNF).', 'client', '2026-01-02 16:17:46', 0, NULL, 1, 0, 'client'),
(3, 1, 'Votre demande de réduction pour la commande #1 a été acceptée. Nouveau prix : 200.00 GNF.', 'client', '2026-01-02 16:19:24', 0, 2, NULL, 0, 'client'),
(4, 1, 'Nouveau paiement reçu pour la commande #1 via .', 'client', '2026-01-02 16:29:42', 0, NULL, 1, 0, 'client'),
(5, 1, 'Nouvelle commande #2 passée pour votre boutique.', 'client', '2026-01-03 11:26:25', 0, NULL, 1, 0, 'client'),
(6, 1, 'Nouvelle commande #3 passée pour votre boutique.', 'client', '2026-01-03 14:46:31', 0, NULL, 1, 0, 'client'),
(7, 2, 'Nouvelle commande #4 passée pour votre boutique.', 'client', '2026-01-03 14:48:58', 0, NULL, 1, 0, 'client'),
(8, 1, 'Nouvelle commande #1 assignée à vous. Coordonnées client : (9.615805, -13.633888)', 'client', '2026-01-09 21:48:38', 0, NULL, 1, 0, 'client'),
(9, 1, 'La commande #1 a été livrée avec succès.', 'client', '2026-01-09 21:53:56', 0, NULL, 1, 0, 'client'),
(10, 1, 'Nouvelle demande de réduction pour la commande #2 : 2000 GNF proposé (prix initial : 2500.00 GNF).', 'client', '2026-01-09 21:56:48', 0, NULL, 1, 0, 'client'),
(11, 1, 'Nouveau paiement reçu pour la commande #2 via John-Pay.', 'client', '2026-01-09 22:02:17', 0, NULL, 1, 0, 'client'),
(12, 1, 'Nouvelle commande #2 assignée à vous. Coordonnées client : (9.652917, -13.568451)', 'client', '2026-01-09 22:03:16', 0, NULL, 1, 0, 'client'),
(13, 1, 'Nouvelle commande #5 passée pour votre boutique.', 'client', '2026-01-10 18:40:36', 0, NULL, 1, 0, 'client'),
(14, 1, 'La commande #2 a été livrée avec succès.', 'client', '2026-01-10 18:34:44', 0, NULL, 1, 0, 'client'),
(15, 1, 'Nouvelle commande #6 passée pour votre boutique.', 'client', '2026-01-11 09:11:04', 0, NULL, 1, 0, 'client'),
(16, 1, 'Nouvelle commande #7 passée pour votre boutique.', 'client', '2026-01-11 09:12:16', 0, NULL, 1, 0, 'client'),
(17, 1, 'Nouvelle commande #8 passée pour votre boutique.', 'client', '2026-01-11 09:14:23', 0, NULL, 1, 0, 'client'),
(18, 1, 'Nouvelle commande #9 passée pour votre boutique.', 'client', '2026-01-11 09:52:13', 0, NULL, 1, 0, 'client'),
(19, 2, 'Nouvelle commande #10 passée pour votre boutique.', 'client', '2026-01-11 09:54:39', 0, NULL, 1, 0, 'client'),
(20, 2, 'Nouveau paiement reçu pour la commande #10 via .', 'client', '2026-01-11 09:04:45', 0, NULL, 1, 0, 'client'),
(21, 1, 'Nouvelle commande #11 passée pour votre boutique.', 'client', '2026-01-11 10:13:45', 0, NULL, 1, 0, 'client'),
(22, 1, 'Votre commande d\'article #11 a été envoyée avec succès. Montant : 5000 GNF', 'client', '2026-01-11 10:13:45', 0, 2, NULL, 0, 'client'),
(23, 1, 'Nouvelle commande #12 passée pour votre boutique.', 'client', '2026-01-11 10:14:49', 0, NULL, 1, 0, 'client'),
(24, 1, 'Votre commande d\'article #12 a été envoyée avec succès. Montant : 50000 GNF', 'client', '2026-01-11 10:14:49', 0, 2, NULL, 0, 'client'),
(25, 2, 'Nouvelle commande #13 passée pour votre boutique.', 'client', '2026-01-11 10:28:24', 0, NULL, 1, 0, 'client'),
(26, 2, 'Votre commande d\'article #13 a été envoyée avec succès. Montant : 9000000 GNF', 'client', '2026-01-11 10:28:24', 0, 2, NULL, 0, 'client'),
(27, 2, 'Nouvelle demande de service \"undefined\" de Moise Johnson - 620408850', 'client', '2026-01-11 12:48:14', 0, NULL, 1, 0, 'client'),
(28, 2, 'Votre demande de service \"undefined\" a été envoyée avec succès. Montant : 1 GNF', 'client', '2026-01-11 12:48:14', 0, 2, NULL, 0, 'client'),
(29, 2, '🔔 Nouvelle demande de service\n📦 Service : \"Formation Office\"\n💰 Montant : 1 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : 620408850\n', 'client', '2026-01-11 12:55:32', 0, NULL, 1, 0, 'client'),
(30, 2, '✅ Demande de service envoyée avec succès\n📦 Service : \"Formation Office\"\n💰 Montant : 1 GNF\n🏪 Boutique : KJS GROUP\n📞 Vous serez contacté au 620408850', 'client', '2026-01-11 12:55:32', 0, 2, NULL, 0, 'client'),
(31, 1, '🔔 Nouvelle demande de service\n📦 Service : \"Formation Microsoft\"\n💰 Montant : 10 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : 620408850\n', 'client', '2026-01-11 12:59:02', 0, NULL, 1, 0, 'client'),
(32, 1, '✅ Demande de service envoyée avec succès\n📦 Service : \"Formation Microsoft\"\n💰 Montant : 10 GNF\n🏪 Boutique : TC shop\n📞 Vous serez contacté au 620408850', 'client', '2026-01-11 12:59:02', 0, 2, NULL, 0, 'client'),
(33, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Mangue\"\n🔢 Quantité : 2\n💰 Montant total : 5000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : 620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-13 11:22:51', 0, NULL, 1, 0, 'client'),
(34, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Mangue\"\n🔢 Quantité : 2\n💰 Montant total : 5000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-13 11:22:51', 0, 2, NULL, 0, 'client'),
(35, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Mangue\"\n🔢 Quantité : 3\n💰 Montant total : 7500 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : 620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-13 11:24:00', 0, NULL, 1, 0, 'client'),
(36, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Mangue\"\n🔢 Quantité : 3\n💰 Montant total : 7500 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-13 11:24:00', 0, 2, NULL, 0, 'client'),
(37, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Mangue\"\n🔢 Quantité : 6\n💰 Montant total : 15000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : 620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-13 12:48:50', 0, NULL, 1, 0, 'client'),
(38, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Mangue\"\n🔢 Quantité : 6\n💰 Montant total : 15000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-13 12:48:50', 0, 2, NULL, 0, 'client'),
(39, 2, '🔔 Nouvelle commande d\'article\n📦 Article : \"HP\"\n🔢 Quantité : 1\n💰 Montant total : 3000000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : 620408850\n📍 Adresse livraison : E', 'client', '2026-01-14 22:08:34', 0, NULL, 1, 0, 'client'),
(40, 2, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"HP\"\n🔢 Quantité : 1\n💰 Montant total : 3000000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-14 22:08:34', 0, 2, NULL, 0, 'client'),
(41, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Mangue\"\n🔢 Quantité : 5\n💰 Montant total : 12500 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : 620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-16 13:46:15', 0, NULL, 1, 0, 'client'),
(42, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Mangue\"\n🔢 Quantité : 5\n💰 Montant total : 12500 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-16 13:46:15', 0, 2, NULL, 0, 'client'),
(43, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Mangue\"\n🔢 Quantité : 6\n💰 Montant total : 15000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : 620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-16 13:46:54', 0, NULL, 1, 0, 'client'),
(44, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Mangue\"\n🔢 Quantité : 6\n💰 Montant total : 15000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-16 13:46:54', 0, 2, NULL, 0, 'client'),
(45, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Mangue\"\n🔢 Quantité : 7\n💰 Montant total : 17500 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : 620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-16 13:47:37', 0, NULL, 1, 0, 'client'),
(46, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Mangue\"\n🔢 Quantité : 7\n💰 Montant total : 17500 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-16 13:47:37', 0, 2, NULL, 0, 'client'),
(47, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Pain\"\n🔢 Quantité : 3\n💰 Montant total : 15000 GNF\n👤 Client : Ismael Kamano\n📞 Téléphone : +224620728773\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-16 13:54:02', 0, NULL, 1, 0, 'client'),
(48, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Pain\"\n🔢 Quantité : 3\n💰 Montant total : 15000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-16 13:54:02', 0, 3, NULL, 0, 'client'),
(49, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Pain\"\n🔢 Quantité : 5\n💰 Montant total : 25000 GNF\n👤 Client : Ismael Kamano\n📞 Téléphone : +224620728773\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-16 13:54:15', 0, NULL, 1, 0, 'client'),
(50, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Pain\"\n🔢 Quantité : 5\n💰 Montant total : 25000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-16 13:54:15', 0, 3, NULL, 0, 'client'),
(51, 2, '🔔 Nouvelle demande de service\n📦 Service : \"Formation Office\"\n💰 Montant : 1 GNF\n👤 Client : Ismael Kamano\n📞 Téléphone : +224620728773\n', 'client', '2026-01-16 14:12:15', 0, NULL, 1, 0, 'client'),
(52, 2, '✅ Demande de service envoyée avec succès\n📦 Service : \"Formation Office\"\n💰 Montant : 1 GNF\n🏪 Boutique : KJS GROUP\n📞 Vous serez contacté au +224620728773', 'client', '2026-01-16 14:12:15', 0, 3, NULL, 0, 'client'),
(53, 2, '🔔 Nouvelle demande de service\n📦 Service : \"Formation Office\"\n💰 Montant : 1 GNF\n👤 Client : Ismael Kamano\n📞 Téléphone : +224620728773\n', 'client', '2026-01-16 14:14:30', 0, NULL, 1, 0, 'client'),
(54, 2, '✅ Demande de service envoyée avec succès\n📦 Service : \"Formation Office\"\n💰 Montant : 1 GNF\n🏪 Boutique : KJS GROUP\n📞 Vous serez contacté au +224620728773', 'client', '2026-01-16 14:14:30', 0, 3, NULL, 0, 'client'),
(55, 1, '🔔 Nouvelle demande de service\n📦 Service : \"Formation sur le Routeur Cisco\"\n💰 Montant : 2500000 GNF\n👤 Client : Ismael Kamano\n📞 Téléphone : +224620728773\n', 'client', '2026-01-16 14:18:08', 0, NULL, 1, 0, 'client'),
(56, 1, '✅ Demande de service envoyée avec succès\n📦 Service : \"Formation sur le Routeur Cisco\"\n💰 Montant : 2500000 GNF\n🏪 Boutique : TC shop\n📞 Vous serez contacté au +224620728773', 'client', '2026-01-16 14:18:08', 0, 3, NULL, 0, 'client'),
(57, 2, '🔔 Nouvelle commande d\'article\n📦 Article : \"HP\"\n🔢 Quantité : 2\n💰 Montant total : 6000000 GNF\n👤 Client : Ismael Pepcyno\n📞 Téléphone : +224666381243\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-16 14:34:10', 0, NULL, 1, 0, 'client'),
(58, 2, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"HP\"\n🔢 Quantité : 2\n💰 Montant total : 6000000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-16 14:34:10', 0, 5, NULL, 0, 'client'),
(59, 2, 'Nouveau paiement reçu pour la commande #23 via .', 'client', '2026-01-16 13:42:43', 0, NULL, 1, 0, 'client'),
(60, 2, '🔔 Nouvelle demande de service\n📦 Service : \"Formation Office\"\n💰 Montant : 1 GNF\n👤 Client : Ismael Pepcyno\n📞 Téléphone : +224666381243\n', 'client', '2026-01-16 15:02:03', 0, NULL, 1, 0, 'client'),
(61, 2, '✅ Demande de service envoyée avec succès\n📦 Service : \"Formation Office\"\n💰 Montant : 1 GNF\n🏪 Boutique : KJS GROUP\n📞 Vous serez contacté au +224666381243', 'client', '2026-01-16 15:02:03', 0, 5, NULL, 0, 'client'),
(62, 2, '💰 Nouvelle demande de réduction\n🏪 Commande #13\n💸 Prix initial : 9000000.00 GNF\n🔽 Prix proposé : 8000000 GNF\n📉 Réduction demandée : 1000000.00 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : 620408850', 'client', '2026-01-16 14:51:37', 0, NULL, 1, 0, 'client'),
(63, 2, '✅ Demande de réduction envoyée\n🏪 Commande #13\n💸 Prix actuel : 9000000.00 GNF\n🔽 Prix proposé : 8000000 GNF\n⏳ En attente de validation du gérant', 'client', '2026-01-16 14:51:37', 0, 2, NULL, 0, 'client'),
(64, 2, '🔔 Nouvelle commande d\'article\n📦 Article : \"HP\"\n🔢 Quantité : 1\n💰 Montant total : 3000000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-16 15:55:21', 0, NULL, 1, 0, 'client'),
(65, 2, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"HP\"\n🔢 Quantité : 1\n💰 Montant total : 3000000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-16 15:55:21', 0, 2, NULL, 0, 'client'),
(66, 2, '🔔 Nouvelle commande d\'article\n📦 Article : \"HP\"\n🔢 Quantité : 4\n💰 Montant total : 12000000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-16 15:56:43', 0, NULL, 1, 0, 'client'),
(67, 2, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"HP\"\n🔢 Quantité : 4\n💰 Montant total : 12000000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-16 15:56:43', 0, 2, NULL, 0, 'client'),
(68, 2, '🔔 Nouvelle commande d\'article\n📦 Article : \"HP\"\n🔢 Quantité : 1\n💰 Montant total : 3000000 GNF\n👤 Client : Ismael Pepcyno\n📞 Téléphone : +224666381243\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-16 16:04:55', 0, NULL, 1, 0, 'client'),
(69, 2, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"HP\"\n🔢 Quantité : 1\n💰 Montant total : 3000000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-16 16:04:55', 0, 5, NULL, 0, 'client'),
(70, 2, 'Nouveau paiement reçu pour la commande #26 via .', 'client', '2026-01-16 15:05:54', 0, NULL, 1, 0, 'client'),
(71, 2, '🔔 Nouvelle commande d\'article\n📦 Article : \"Dell\"\n🔢 Quantité : 7\n💰 Montant total : 38500000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-19 18:54:25', 0, NULL, 1, 0, 'client'),
(72, 2, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Dell\"\n🔢 Quantité : 7\n💰 Montant total : 38500000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-19 18:54:25', 0, 2, NULL, 0, 'client'),
(74, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Pain\"\n🔢 Quantité : 2\n💰 Montant total : 10000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-19 19:12:08', 1, NULL, NULL, 2, 'client'),
(76, 1, '🔔 Nouvelle demande de service\n📦 Service : \"Formation sur le Routeur Cisco\"\n💰 Montant : 2500000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850\n', 'client', '2026-01-19 19:17:37', 1, NULL, NULL, 1, 'client'),
(77, 1, '✅ Demande de service envoyée avec succès\n📦 Service : \"Formation sur le Routeur Cisco\"\n💰 Montant : 2500000 GNF\n🏪 Boutique : TC shop\n📞 Vous serez contacté au +224620408850', 'client', '2026-01-19 19:17:37', 1, NULL, NULL, 2, 'client'),
(81, 2, '💰 Nouvelle demande de réduction\n🏪 Commande #31\n💸 Prix initial : 38500000.00 GNF\n🔽 Prix proposé : 3500000 GNF\n📉 Réduction demandée : 35000000.00 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850', 'client', '2026-01-19 19:40:57', 1, NULL, NULL, 1, 'gerant'),
(82, 2, '✅ Demande de réduction envoyée\n🏪 Commande #31\n💸 Prix actuel : 38500000.00 GNF\n🔽 Prix proposé : 3500000 GNF\n⏳ En attente de validation du gérant', 'client', '2026-01-19 19:40:57', 1, NULL, NULL, 2, 'client'),
(83, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Gâteau au chocolat\"\n🔢 Quantité : 3\n💰 Montant total : 750000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-19 20:54:11', 1, NULL, NULL, 1, 'client'),
(86, 1, '✅ Demande de réduction envoyée\n🏪 Commande #34\n💸 Prix actuel : 750000.00 GNF\n🔽 Prix proposé : 700000 GNF\n⏳ En attente de validation du gérant', 'client', '2026-01-19 19:54:54', 1, NULL, NULL, 2, 'client'),
(87, 1, '✅ Réduction acceptée !\n🏪 Commande #34\n🔴 Ancien prix : undefined GNF\n🟬 Nouveau prix : 700000.00 GNF\n💰 Économie : NaN GNF\n🎉 Votre demande a été acceptée par le gérant', 'client', '2026-01-19 19:56:12', 1, NULL, NULL, 2, 'client'),
(88, 1, 'La commande #20 a été livrée avec succès.', 'client', '2026-01-19 20:05:50', 1, NULL, NULL, 1, 'client'),
(89, 1, 'La commande #33 a été livrée avec succès.', 'client', '2026-01-19 20:05:59', 1, NULL, NULL, 1, 'client'),
(90, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Gâteau au chocolat\"\n🔢 Quantité : 7\n💰 Montant total : 1750000 GNF\n👤 Client : Mamady Sacko\n📞 Téléphone : +224612374585\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-24 13:25:59', 1, NULL, NULL, 1, 'client'),
(92, 1, '🔔 Nouvelle demande de service\n📦 Service : \"Formation sur le Routeur Cisco\"\n💰 Montant : 2500000 GNF\n👤 Client : Mamady Sacko\n📞 Téléphone : +224612374585\n', 'client', '2026-01-24 13:44:32', 1, NULL, NULL, 1, 'client'),
(93, 1, '✅ Demande de service envoyée avec succès\n📦 Service : \"Formation sur le Routeur Cisco\"\n💰 Montant : 2500000 GNF\n🏪 Boutique : TC shop\n📞 Vous serez contacté au +224612374585', 'client', '2026-01-24 13:44:32', 1, NULL, NULL, 6, 'client'),
(94, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Mangue\"\n🔢 Quantité : 1\n💰 Montant total : 2500 GNF\n👤 Client : Mamady Sacko\n📞 Téléphone : +224612374585\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-24 13:47:25', 1, NULL, NULL, 1, 'client'),
(95, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Mangue\"\n🔢 Quantité : 1\n💰 Montant total : 2500 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-24 13:47:25', 0, NULL, NULL, 6, 'client'),
(96, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Gâteau au chocolat\"\n🔢 Quantité : 1\n💰 Montant total : 250000 GNF\n👤 Client : Mamady Sacko\n📞 Téléphone : +224612374585\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-24 13:47:47', 1, NULL, NULL, 1, 'client'),
(97, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Gâteau au chocolat\"\n🔢 Quantité : 1\n💰 Montant total : 250000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-24 13:47:47', 1, NULL, NULL, 6, 'client'),
(98, 1, 'Nouveau paiement reçu pour la commande #37 via .', 'client', '2026-01-24 13:29:41', 1, NULL, NULL, 1, 'client'),
(99, 1, 'Nouveau paiement reçu pour la commande #36 via .', 'client', '2026-01-24 13:32:58', 1, NULL, NULL, 1, 'client'),
(100, 1, 'Nouvelle commande #37 assignée à vous. Coordonnées client : (9.615775, -13.633897)', 'client', '2026-01-24 13:34:01', 1, NULL, NULL, 1, 'client'),
(101, 1, 'Nouvelle commande #36 assignée à vous. Coordonnées client : (9.615780, -13.633905)', 'client', '2026-01-24 13:34:17', 1, NULL, NULL, 2, 'client'),
(102, 1, 'La commande #37 a été livrée avec succès.', 'client', '2026-01-24 13:38:02', 1, NULL, NULL, 1, 'client'),
(103, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Pain\"\n🔢 Quantité : 1\n💰 Montant total : 5000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-26 19:10:47', 1, NULL, NULL, 1, 'client'),
(104, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Pain\"\n🔢 Quantité : 1\n💰 Montant total : 5000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-26 19:10:47', 1, NULL, NULL, 2, 'client'),
(105, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Gâteau au chocolat\"\n🔢 Quantité : 1\n💰 Montant total : 250000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-26 19:18:43', 1, NULL, NULL, 1, 'client'),
(106, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Gâteau au chocolat\"\n🔢 Quantité : 1\n💰 Montant total : 250000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-26 19:18:43', 0, NULL, NULL, 2, 'client'),
(107, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Gâteau au chocolat\"\n🔢 Quantité : 1\n💰 Montant total : 250000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-26 19:21:01', 1, NULL, NULL, 1, 'client'),
(108, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Gâteau au chocolat\"\n🔢 Quantité : 1\n💰 Montant total : 250000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-26 19:21:01', 0, NULL, NULL, 2, 'client'),
(109, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Gâteau au chocolat\"\n🔢 Quantité : 1\n💰 Montant total : 250000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-26 19:24:10', 1, NULL, NULL, 1, 'client'),
(110, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Gâteau au chocolat\"\n🔢 Quantité : 1\n💰 Montant total : 250000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-26 19:24:10', 0, NULL, NULL, 2, 'client'),
(111, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Mangue\"\n🔢 Quantité : 1\n💰 Montant total : 2500 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-26 19:25:55', 1, NULL, NULL, 1, 'client'),
(112, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Mangue\"\n🔢 Quantité : 1\n💰 Montant total : 2500 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-26 19:25:55', 0, NULL, NULL, 2, 'client'),
(113, 1, '🔔 Nouvelle demande de service\n📦 Service : \"Formation sur le Routeur Cisco\"\n💰 Montant : 2500000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850\n', 'client', '2026-01-26 20:23:55', 1, NULL, NULL, 1, 'client'),
(114, 1, '✅ Demande de service envoyée avec succès\n📦 Service : \"Formation sur le Routeur Cisco\"\n💰 Montant : 2500000 GNF\n🏪 Boutique : TC shop\n📞 Vous serez contacté au +224620408850', 'client', '2026-01-26 20:23:55', 0, NULL, NULL, 2, 'client'),
(115, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Pain\"\n🔢 Quantité : 1\n💰 Montant total : 5000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-26 20:24:41', 1, NULL, NULL, 1, 'client'),
(116, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Pain\"\n🔢 Quantité : 1\n💰 Montant total : 5000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-26 20:24:41', 0, NULL, NULL, 2, 'client'),
(117, 2, '🔔 Nouvelle commande d\'article\n📦 Article : \"Dell\"\n🔢 Quantité : 1\n💰 Montant total : 5500000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-26 20:29:35', 1, NULL, NULL, 1, 'client'),
(118, 2, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Dell\"\n🔢 Quantité : 1\n💰 Montant total : 5500000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-26 20:29:35', 0, NULL, NULL, 2, 'client'),
(119, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Pain\"\n🔢 Quantité : 1\n💰 Montant total : 5000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-26 20:43:15', 1, NULL, NULL, 1, 'client'),
(120, 1, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Pain\"\n🔢 Quantité : 1\n💰 Montant total : 5000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-26 20:43:15', 0, NULL, NULL, 2, 'client'),
(121, 2, '🔔 Nouvelle commande d\'article\n📦 Article : \"Dell\"\n🔢 Quantité : 19\n💰 Montant total : 104500000 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850\n📍 Adresse livraison : Non spécifiée', 'client', '2026-01-26 20:50:40', 1, NULL, NULL, 1, 'client'),
(122, 2, '✅ Commande d\'article envoyée avec succès\n📦 Article : \"Dell\"\n🔢 Quantité : 19\n💰 Montant total : 104500000 GNF\n🏪 Votre commande sera préparée et livrée bientôt', 'client', '2026-01-26 20:50:40', 0, NULL, NULL, 2, 'client'),
(123, 1, '💰 Nouvelle demande de réduction\n🏪 Commande #45\n💸 Prix initial : 5000.00 GNF\n🔽 Prix proposé : 4500 GNF\n📉 Réduction demandée : 500.00 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850', 'client', '2026-01-27 10:46:02', 1, NULL, NULL, 1, 'client'),
(124, 1, '✅ Demande de réduction envoyée\n🏪 Commande #45\n💸 Prix actuel : 5000.00 GNF\n🔽 Prix proposé : 4500 GNF\n⏳ En attente de validation du gérant', 'client', '2026-01-27 10:46:02', 0, NULL, NULL, 2, 'client'),
(126, 1, 'Nouveau paiement reçu pour la commande #42 via Paiement à la livraison.', 'client', '2026-01-27 11:01:34', 1, NULL, NULL, 1, 'client'),
(127, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Mangue\"\n🔢 Quantité : 43\n💰 Total : 107500 GNF\n👤 Client : Moise Johnson', 'client', '2026-01-27 22:53:15', 1, NULL, NULL, 1, 'client'),
(129, 1, '✅ Réduction acceptée !\n🏪 Commande #45\n🔴 Ancien prix : undefined GNF\n🟬 Nouveau prix : 4500.00 GNF\n💰 Économie : NaN GNF\n🎉 Votre demande a été acceptée par le gérant', 'client', '2026-01-27 22:40:30', 0, NULL, NULL, 2, 'client'),
(130, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Mangue\"\n🔢 Quantité : 1\n💰 Total : 2500 GNF\n👤 Client : Moise Johnson', 'client', '2026-01-28 15:22:24', 1, NULL, NULL, 1, 'client'),
(131, 1, '✅ Commande envoyée : \"Mangue\" (2500 GNF). En attente de validation.', 'client', '2026-01-28 15:22:24', 0, NULL, NULL, 2, 'client'),
(132, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Pain\"\n🔢 Quantité : 1\n💰 Total : 5000 GNF\n👤 Client : Moise Johnson', 'client', '2026-01-28 15:22:33', 1, NULL, NULL, 1, 'client'),
(133, 1, '✅ Commande envoyée : \"Pain\" (5000 GNF). En attente de validation.', 'client', '2026-01-28 15:22:33', 0, NULL, NULL, 2, 'client'),
(134, 1, 'Nouveau paiement reçu pour la commande #49 via .', 'client', '2026-01-28 14:25:54', 1, NULL, NULL, 1, 'client'),
(135, 1, 'Nouveau paiement reçu pour la commande #48 via .', 'client', '2026-01-28 14:26:21', 1, NULL, NULL, 1, 'client'),
(136, 1, 'Nouveau paiement reçu pour la commande #45 via .', 'client', '2026-01-28 14:27:49', 1, NULL, NULL, 1, 'client'),
(137, 1, '🔔 Nouvelle commande d\'article\n📦 Article : \"Mangue\"\n🔢 Quantité : 1\n💰 Total : 2500 GNF\n👤 Client : Moïse Johnson', 'client', '2026-01-28 19:52:50', 1, NULL, NULL, 1, 'client'),
(138, 1, '✅ Commande envoyée : \"Mangue\" (2500 GNF). En attente de validation.', 'client', '2026-01-28 19:52:50', 0, NULL, NULL, 2, 'client'),
(139, 4, '🔔 Nouvelle commande d\'article\n📦 Article : \"Plat à la soupe\"\n🔢 Quantité : 3\n💰 Total : 150000 GNF\n👤 Client : Moïse Johnson', 'client', '2026-01-29 00:38:24', 1, NULL, NULL, 1, 'client'),
(140, 4, '✅ Commande envoyée : \"Plat à la soupe\" (150000 GNF). En attente de validation.', 'client', '2026-01-29 00:38:24', 1, NULL, NULL, 2, 'client'),
(141, 4, 'Nouveau paiement reçu pour la commande #51 via .', 'client', '2026-01-28 23:39:48', 1, NULL, NULL, 1, 'client'),
(142, 1, '❌ Commande #50 annulée par le client.', 'client', '2026-01-29 00:06:22', 1, NULL, NULL, 1, 'client'),
(143, 4, 'Votre commande #51 est maintenant : en cours de livraison', 'client', '2026-01-29 00:08:08', 1, NULL, NULL, 2, 'client'),
(144, 4, 'Votre commande #51 est maintenant : en cours de livraison', 'client', '2026-01-29 00:09:10', 0, NULL, NULL, 2, 'client'),
(145, 1, 'Nouveau paiement reçu pour la commande #41 via .', 'client', '2026-01-29 05:25:21', 1, NULL, NULL, 1, 'client'),
(146, 2, '❌ Commande #46 annulée par le client.', 'client', '2026-01-29 07:25:08', 1, NULL, NULL, 1, 'client'),
(147, 4, '🔔 Nouvelle commande d\'article\n📦 Article : \"Plat à la soupe\"\n🔢 Quantité : 3\n💰 Total : 150000 GNF\n👤 Client : Moise Johnson', 'client', '2026-01-29 10:36:26', 1, NULL, NULL, 1, 'client'),
(148, 4, '✅ Commande envoyée : \"Plat à la soupe\" (150000 GNF). En attente de validation.', 'client', '2026-01-29 10:36:26', 0, NULL, NULL, 2, 'client'),
(149, 4, '💰 Nouvelle demande de réduction\n🏪 Commande #52\n💸 Prix initial : 150000.00 GNF\n🔽 Prix proposé : 140000 GNF\n📉 Réduction demandée : 10000.00 GNF\n👤 Client : Moise Johnson\n📞 Téléphone : +224620408850', 'client', '2026-01-29 09:37:15', 1, NULL, NULL, 1, 'client'),
(150, 4, '✅ Demande de réduction envoyée\n🏪 Commande #52\n💸 Prix actuel : 150000.00 GNF\n🔽 Prix proposé : 140000 GNF\n⏳ En attente de validation du gérant', 'client', '2026-01-29 09:37:15', 0, NULL, NULL, 2, 'client'),
(151, 4, '✅ Réduction acceptée !\n🏪 Commande #52\n🔴 Ancien prix : undefined GNF\n🟬 Nouveau prix : 140000.00 GNF\n💰 Économie : NaN GNF\n🎉 Votre demande a été acceptée par le gérant', 'client', '2026-01-29 09:40:17', 1, NULL, NULL, 2, 'client'),
(152, 4, 'Votre commande #51 est maintenant : en préparation', 'client', '2026-01-29 09:44:45', 0, NULL, NULL, 2, 'client'),
(153, 4, '🚀 NOUVELLE MISSION : Commande #51 vous est assignée. À récupérer et livrer immédiatement !', 'client', '2026-01-29 09:45:07', 0, NULL, NULL, 8, 'client'),
(154, 4, 'Succès ! Vous avez livré la commande #51. Bon travail.', 'client', '2026-01-29 09:47:31', 0, NULL, NULL, 8, 'client'),
(155, 4, '📦 Votre commande #51 a été livrée avec succès. Merci de votre confiance !', 'client', '2026-01-29 09:47:31', 0, NULL, NULL, 2, 'client'),
(156, 4, '✅ La commande #51 a bien été livrée par Le Blanc Mr .', 'client', '2026-01-29 09:47:31', 1, NULL, NULL, 1, 'client'),
(157, 2, '✅ Réduction acceptée !\n🏪 Commande #31\n🔴 Ancien prix : undefined GNF\n🟬 Nouveau prix : 3500000.00 GNF\n💰 Économie : NaN GNF\n🎉 Votre demande a été acceptée par le gérant', 'client', '2026-01-29 10:25:12', 0, NULL, NULL, 2, 'client');

-- --------------------------------------------------------

--
-- Structure de la table `paiements`
--

CREATE TABLE `paiements` (
  `id` int(11) NOT NULL,
  `commande_id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `boutique_id` int(11) NOT NULL,
  `montant` decimal(10,2) NOT NULL,
  `moyen_paiement` varchar(50) NOT NULL,
  `date` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `paiements`
--

INSERT INTO `paiements` (`id`, `commande_id`, `utilisateur_id`, `boutique_id`, `montant`, `moyen_paiement`, `date`) VALUES
(1, 1, 2, 1, '200.00', '', '2026-01-02 16:29:42'),
(2, 2, 2, 1, '2500.00', 'John-Pay', '2026-01-09 22:02:17'),
(3, 10, 2, 2, '16500000.00', '', '2026-01-11 09:04:45'),
(4, 23, 5, 2, '6000000.00', '', '2026-01-16 13:42:43'),
(5, 26, 5, 2, '3000000.00', '', '2026-01-16 15:05:54'),
(6, 20, 2, 1, '17500.00', '', '2026-01-19 09:12:28'),
(7, 19, 2, 1, '15000.00', '', '2026-01-19 09:13:16'),
(8, 33, 2, 1, '10000.00', '', '2026-01-19 18:12:42'),
(9, 37, 6, 1, '250000.00', '', '2026-01-24 13:29:41'),
(10, 36, 6, 1, '2500.00', '', '2026-01-24 13:32:58'),
(11, 43, 2, 1, '5000.00', '', '2026-01-27 10:49:17'),
(12, 42, 2, 1, '2500.00', 'Paiement à la livraison', '2026-01-27 11:01:34'),
(13, 49, 2, 1, '5000.00', '', '2026-01-28 14:25:54'),
(14, 48, 2, 1, '2500.00', '', '2026-01-28 14:26:21'),
(15, 45, 2, 1, '4500.00', '', '2026-01-28 14:27:49'),
(16, 51, 2, 4, '150000.00', '', '2026-01-28 23:39:48'),
(17, 41, 2, 1, '250000.00', '', '2026-01-29 05:25:21');

-- --------------------------------------------------------

--
-- Structure de la table `paniers`
--

CREATE TABLE `paniers` (
  `id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `article_id` int(11) DEFAULT NULL,
  `service_id` int(11) DEFAULT NULL,
  `boutique_id` int(11) NOT NULL,
  `date_ajout` datetime DEFAULT current_timestamp(),
  `quantite` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `paniers`
--

INSERT INTO `paniers` (`id`, `utilisateur_id`, `article_id`, `service_id`, `boutique_id`, `date_ajout`, `quantite`) VALUES
(1, 2, 3, NULL, 2, '2026-01-19 18:08:47', 1),
(2, 2, 3, NULL, 2, '2026-01-19 18:09:57', 2),
(3, 2, 2, NULL, 2, '2026-01-19 18:10:11', 3);

-- --------------------------------------------------------

--
-- Structure de la table `personnel`
--

CREATE TABLE `personnel` (
  `id` int(11) NOT NULL,
  `boutique_id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) NOT NULL,
  `telephone` varchar(20) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `type_personnel` enum('Gérant','Employé','Caissier','Vendeur','Serveur','Cuisinier','Coiffeur','Esthéticien','Responsable','Stagiaire') NOT NULL,
  `salaire` decimal(10,2) DEFAULT NULL,
  `date_embauche` date NOT NULL,
  `actif` tinyint(1) DEFAULT 1,
  `photo` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `personnel`
--

INSERT INTO `personnel` (`id`, `boutique_id`, `nom`, `prenom`, `telephone`, `email`, `type_personnel`, `salaire`, `date_embauche`, `actif`, `photo`, `created_at`) VALUES
(1, 1, 'Camara', 'Teninke', '664341709', 'teninkcamara@gmail.com', 'Responsable', NULL, '2026-01-08', 1, '/Uploads/personnel/1768210124371.jpg', '2026-01-10 00:40:27'),
(2, 1, 'Sylla', 'Moussa', '627032267', 'syllamoussa@gmail.com', 'Employé', NULL, '2026-01-07', 1, '/Uploads/personnel/1769636290821.jpg', '2026-01-10 17:06:12'),
(3, 1, 'Tiktokeur', 'Mobile', '624134216', NULL, 'Serveur', NULL, '2026-01-08', 1, '/Uploads/personnel/1768210247541.jpg', '2026-01-12 09:30:47'),
(4, 1, 'Beau', 'Gars', '610101012', NULL, 'Esthéticien', NULL, '2026-01-26', 1, '/Uploads/personnel/1769553169938.jpg', '2026-01-27 22:32:49');

-- --------------------------------------------------------

--
-- Structure de la table `positions_livreurs`
--

CREATE TABLE `positions_livreurs` (
  `id` int(11) NOT NULL,
  `livreur_id` int(11) NOT NULL,
  `commande_id` int(11) NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `timestamp` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `reductions`
--

CREATE TABLE `reductions` (
  `id` int(11) NOT NULL,
  `commande_id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `montant_propose` decimal(10,2) NOT NULL,
  `statut` enum('en attente','acceptée','refusée') NOT NULL DEFAULT 'en attente',
  `date_creation` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `reductions`
--

INSERT INTO `reductions` (`id`, `commande_id`, `utilisateur_id`, `montant_propose`, `statut`, `date_creation`) VALUES
(1, 1, 2, '200.00', 'acceptée', '2026-01-02 17:17:46'),
(2, 2, 2, '2000.00', 'en attente', '2026-01-09 22:56:48'),
(13, 31, 2, '3500000.00', 'acceptée', '2026-01-19 20:40:57'),
(14, 34, 2, '700000.00', 'acceptée', '2026-01-19 20:54:54'),
(15, 45, 2, '4500.00', 'acceptée', '2026-01-27 11:46:02'),
(16, 52, 2, '140000.00', 'acceptée', '2026-01-29 10:37:15');

-- --------------------------------------------------------

--
-- Structure de la table `services`
--

CREATE TABLE `services` (
  `id` int(11) NOT NULL,
  `boutique_id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `prix` decimal(10,2) NOT NULL,
  `disponible` tinyint(1) DEFAULT 1,
  `image` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `services`
--

INSERT INTO `services` (`id`, `boutique_id`, `nom`, `description`, `prix`, `disponible`, `image`) VALUES
(1, 1, 'Formation Microsoft', 'Nous formons....', '10.00', 1, '/Uploads/services/1769637115537.jpeg'),
(2, 2, 'Formation Office', 'Cette formation contient les logiciels\nWord, Excell, PowerPoint, Access, Publisher', '1.00', 1, '/uploads/1767435366313.jpeg'),
(3, 1, 'Formation sur le Routeur Cisco', 'Nous donnons de notions très solide dans la gestion gestion des routeurs Cisco à tout type de client.', '2500000.00', 1, '/uploads/1768208917460.png'),
(6, 1, 'Stage pratique', 'Nous offrons le stage pratique en informatique pour pour les niveaux.', '1500000.00', 1, '/Uploads/services/1769636811510.jpeg');

-- --------------------------------------------------------

--
-- Structure de la table `signalements`
--

CREATE TABLE `signalements` (
  `id` int(11) NOT NULL,
  `type` enum('BOUTIQUE','UTILISATEUR','COMMANDE','AUTRE') NOT NULL,
  `reported_by` int(11) NOT NULL,
  `resource_id` int(11) DEFAULT NULL,
  `raison` text NOT NULL,
  `statut` enum('EN_ATTENTE','EN_COURS','RESOLU','REJETE') DEFAULT 'EN_ATTENTE',
  `resolution` text DEFAULT NULL,
  `resolved_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `resolved_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `super_admins`
--

CREATE TABLE `super_admins` (
  `id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `role` enum('super_admin','admin','moderateur') DEFAULT 'admin',
  `actif` tinyint(1) DEFAULT 1,
  `photo` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `super_admins`
--

INSERT INTO `super_admins` (`id`, `nom`, `prenom`, `email`, `mot_de_passe`, `role`, `actif`, `photo`, `created_at`, `last_login`) VALUES
(2, 'Johnson', 'Moisse', 'johnsonmoise@gmail.com', 'mjp@mapshop', 'super_admin', 1, NULL, '2026-01-10 04:21:27', NULL),
(3, 'Admin', 'Super', 'admin@mapshop.com', '$2b$12$T5NP711GZQrTIH3W8VUf1.aOABgs94aJae5jhHzcBsVk15Plgtz6a', 'super_admin', 1, NULL, '2026-01-10 05:57:57', '2026-01-10 15:07:46');

-- --------------------------------------------------------

--
-- Structure de la table `system_logs`
--

CREATE TABLE `system_logs` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `action_type` enum('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','BAN','UNBAN','APPROVE','REJECT') NOT NULL,
  `resource_type` enum('UTILISATEUR','BOUTIQUE','COMMANDE','PERSONNEL','SIGNALEMENT','AUTRE') NOT NULL,
  `resource_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `system_logs`
--

INSERT INTO `system_logs` (`id`, `admin_id`, `action_type`, `resource_type`, `resource_id`, `description`, `ip_address`, `created_at`) VALUES
(1, 3, 'LOGIN', 'AUTRE', NULL, 'Connexion super admin: admin@mapshop.com', '::1', '2026-01-10 09:45:13'),
(2, 3, 'LOGIN', 'AUTRE', NULL, 'Connexion super admin: admin@mapshop.com', '::ffff:192.168.43.1', '2026-01-10 09:45:55'),
(3, 3, 'LOGOUT', 'AUTRE', NULL, 'Déconnexion super admin', '::ffff:192.168.43.1', '2026-01-10 15:03:45'),
(4, 3, 'LOGIN', 'AUTRE', NULL, 'Connexion super admin: admin@mapshop.com', '::ffff:192.168.43.1', '2026-01-10 15:04:05'),
(5, 3, 'LOGOUT', 'AUTRE', NULL, 'Déconnexion super admin', '::1', '2026-01-10 15:07:43'),
(6, 3, 'LOGIN', 'AUTRE', NULL, 'Connexion super admin: admin@mapshop.com', '::1', '2026-01-10 15:07:46');

-- --------------------------------------------------------

--
-- Structure de la table `utilisateurs`
--

CREATE TABLE `utilisateurs` (
  `id` int(11) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `prenom` varchar(50) NOT NULL,
  `telephone` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `type` enum('client','gerant') NOT NULL,
  `date_inscription` datetime NOT NULL,
  `date_naissance` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `utilisateurs_old`
--

CREATE TABLE `utilisateurs_old` (
  `id` int(11) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `prenom` varchar(50) NOT NULL,
  `telephone` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `type` enum('client','gerant') NOT NULL,
  `date_inscription` datetime NOT NULL,
  `date_naissance` date NOT NULL,
  `statut` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `utilisateurs_old`
--

INSERT INTO `utilisateurs_old` (`id`, `nom`, `prenom`, `telephone`, `email`, `image`, `mot_de_passe`, `type`, `date_inscription`, `date_naissance`, `statut`) VALUES
(1, 'Camara', 'Teninke', '+224664341709', 'teninkcamara@gmail.com', '/uploads/1768210727042.jpeg', '$2b$10$B5KqCFyJxiANWs6iviPW2OtVLu4Xg0xLmgNF/jyzesMPFF.k.vHl6', 'gerant', '2026-01-01 15:35:24', '1977-01-05', 1),
(2, 'Johnson', 'Moise', '+224620408850', 'johnsonmoise2100@gmail.com', '/uploads/1767279000550.jpeg', '$2b$10$a24BPIgr1EMRiBKVvkPgE../kNfIDhxSUTxlAynZf4qRn2H3glyvi', 'client', '2026-01-01 15:50:00', '2003-02-12', 1),
(3, 'Kamano', 'Ismael', '+224620728773', 'ismaelkamano@gmail.com', '/uploads/1767446263327.jpeg', '$2b$10$3LF2aWBgqx8mdDm7zL.miu51WZfCCSlBSUt7ZiDViknrSMwckiiNO', 'client', '2026-01-03 14:17:43', '2026-01-03', 1),
(4, 'Makoss', 'Maka', '+224612374585', NULL, NULL, '$2b$10$m8M.VVtTAsKtWhy6BQAE5uQw8YS2FL.33xDMWetIhTIp.a1WnjabG', 'client', '2026-01-15 14:38:42', '2000-01-15', 1),
(5, 'Pepcyno', 'Ismael', '+224666381243', NULL, '/uploads/1768570178736.jpeg', '$2b$10$eT1wpmg71RJSH5gLrvemze6SDJ4hT7jCtPX3Nr3yuCIfDiy2I5k0C', 'client', '2026-01-16 14:29:38', '2026-01-16', 1),
(6, 'Sylla', 'Hawa', '+224628723093', NULL, '/uploads/1768578004648.jpeg', '$2b$10$4t.0MebVBDqc6qp7CLbTbe4LbC6pGnCRHW63n5nFf663h/exCuLZG', 'gerant', '2026-01-16 16:39:19', '1985-01-01', 1);

-- --------------------------------------------------------

--
-- Structure de la table `visites`
--

CREATE TABLE `visites` (
  `id` int(11) NOT NULL,
  `utilisateur_id` int(11) NOT NULL,
  `boutique_id` int(11) NOT NULL,
  `date_visite` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `visites`
--

INSERT INTO `visites` (`id`, `utilisateur_id`, `boutique_id`, `date_visite`) VALUES
(1, 2, 1, '2026-01-01 14:52:35'),
(2, 2, 1, '2026-01-02 15:35:40'),
(3, 2, 1, '2026-01-02 15:37:16'),
(4, 2, 1, '2026-01-02 15:56:16'),
(5, 2, 1, '2026-01-02 16:01:18'),
(6, 2, 1, '2026-01-02 16:04:35'),
(7, 2, 1, '2026-01-02 16:19:57'),
(8, 2, 1, '2026-01-02 16:20:27'),
(9, 2, 2, '2026-01-03 10:23:46'),
(10, 2, 1, '2026-01-03 10:23:55'),
(11, 3, 2, '2026-01-03 13:22:12'),
(12, 3, 2, '2026-01-03 13:25:00'),
(13, 3, 2, '2026-01-03 13:39:06'),
(14, 3, 1, '2026-01-03 13:41:12'),
(15, 3, 2, '2026-01-03 13:41:25'),
(16, 3, 2, '2026-01-03 13:44:10'),
(17, 3, 1, '2026-01-03 13:46:00'),
(18, 3, 2, '2026-01-03 13:48:18'),
(19, 3, 2, '2026-01-03 13:50:12'),
(20, 3, 1, '2026-01-03 14:10:21'),
(21, 2, 2, '2026-01-04 13:18:42'),
(22, 2, 1, '2026-01-04 13:18:55'),
(23, 2, 2, '2026-01-09 21:14:16'),
(24, 2, 2, '2026-01-09 21:56:01'),
(25, 2, 1, '2026-01-09 21:56:10'),
(26, 2, 2, '2026-01-09 22:00:31'),
(27, 2, 2, '2026-01-10 16:23:31'),
(28, 2, 2, '2026-01-10 17:35:11'),
(29, 2, 1, '2026-01-10 17:35:18'),
(30, 2, 2, '2026-01-10 17:36:36'),
(31, 2, 1, '2026-01-10 17:36:46'),
(32, 2, 1, '2026-01-10 17:39:20'),
(33, 2, 1, '2026-01-10 17:41:46'),
(34, 2, 1, '2026-01-10 17:50:45'),
(35, 2, 1, '2026-01-10 18:13:10'),
(36, 2, 1, '2026-01-10 18:22:35'),
(37, 2, 2, '2026-01-10 18:26:12'),
(38, 2, 1, '2026-01-11 07:34:14'),
(39, 2, 2, '2026-01-11 07:53:28'),
(40, 2, 2, '2026-01-11 07:55:08'),
(41, 2, 2, '2026-01-11 07:57:06'),
(42, 2, 1, '2026-01-11 07:59:55'),
(43, 2, 1, '2026-01-11 08:03:05'),
(44, 2, 1, '2026-01-11 08:50:48'),
(45, 2, 2, '2026-01-11 08:53:16'),
(46, 2, 1, '2026-01-11 09:02:16'),
(47, 2, 1, '2026-01-11 09:02:17'),
(48, 2, 2, '2026-01-11 09:27:20'),
(49, 2, 2, '2026-01-11 09:32:42'),
(50, 2, 1, '2026-01-11 09:35:10'),
(51, 2, 2, '2026-01-11 09:42:25'),
(52, 2, 2, '2026-01-11 11:48:01'),
(53, 2, 1, '2026-01-11 11:58:47'),
(54, 2, 2, '2026-01-12 08:47:19'),
(55, 2, 1, '2026-01-12 09:45:12'),
(56, 2, 2, '2026-01-12 09:56:29'),
(57, 2, 2, '2026-01-12 09:57:52'),
(58, 2, 2, '2026-01-12 10:01:20'),
(59, 2, 1, '2026-01-12 10:03:35'),
(60, 2, 2, '2026-01-12 10:12:47'),
(61, 2, 1, '2026-01-12 10:22:04'),
(62, 2, 2, '2026-01-12 10:26:53'),
(63, 2, 1, '2026-01-12 10:28:04'),
(64, 2, 2, '2026-01-12 10:34:41'),
(65, 2, 1, '2026-01-12 10:34:51'),
(66, 2, 2, '2026-01-12 10:34:56'),
(67, 2, 2, '2026-01-12 10:40:33'),
(68, 2, 2, '2026-01-12 11:23:37'),
(69, 2, 1, '2026-01-12 11:23:39'),
(70, 2, 1, '2026-01-12 11:23:51'),
(71, 2, 1, '2026-01-12 11:29:18'),
(72, 2, 2, '2026-01-12 11:29:24'),
(73, 2, 2, '2026-01-12 11:29:27'),
(74, 2, 1, '2026-01-12 11:29:28'),
(75, 2, 2, '2026-01-12 11:30:46'),
(76, 2, 2, '2026-01-12 11:34:15'),
(77, 2, 2, '2026-01-13 10:22:08'),
(78, 2, 1, '2026-01-13 10:22:30'),
(79, 2, 1, '2026-01-13 10:28:02'),
(80, 2, 1, '2026-01-13 11:48:36'),
(81, 2, 2, '2026-01-14 12:00:45'),
(82, 2, 2, '2026-01-14 21:02:14'),
(83, 2, 2, '2026-01-14 21:10:40'),
(84, 2, 2, '2026-01-16 12:18:25'),
(85, 2, 2, '2026-01-16 12:45:45'),
(86, 2, 1, '2026-01-16 12:45:49'),
(87, 3, 1, '2026-01-16 12:53:49'),
(88, 3, 2, '2026-01-16 13:02:27'),
(89, 3, 1, '2026-01-16 13:02:36'),
(90, 3, 2, '2026-01-16 13:11:29'),
(91, 3, 1, '2026-01-16 13:17:56'),
(92, 5, 2, '2026-01-16 13:33:48'),
(93, 5, 2, '2026-01-16 14:01:27'),
(94, 5, 2, '2026-01-16 14:39:41'),
(95, 2, 1, '2026-01-16 14:40:33'),
(96, 2, 2, '2026-01-16 14:52:47'),
(97, 5, 2, '2026-01-16 14:57:52'),
(98, 5, 2, '2026-01-16 15:03:59'),
(99, 2, 2, '2026-01-16 15:25:51'),
(100, 2, 1, '2026-01-16 15:26:08'),
(101, 5, 2, '2026-01-19 13:05:13'),
(102, 5, 2, '2026-01-19 13:56:13'),
(103, 2, 3, '2026-01-19 14:17:14'),
(104, 2, 2, '2026-01-19 14:17:16'),
(105, 2, 1, '2026-01-19 14:17:17'),
(106, 2, 2, '2026-01-19 14:18:39'),
(107, 2, 3, '2026-01-19 14:56:12'),
(108, 2, 2, '2026-01-19 17:07:38'),
(109, 2, 1, '2026-01-19 17:14:59'),
(110, 2, 2, '2026-01-19 17:15:03'),
(111, 2, 3, '2026-01-19 17:15:04'),
(112, 2, 2, '2026-01-19 17:15:05'),
(113, 2, 2, '2026-01-19 17:28:31'),
(114, 2, 1, '2026-01-19 17:56:20'),
(115, 2, 1, '2026-01-19 19:53:34'),
(116, 2, 3, '2026-01-19 19:53:37'),
(117, 2, 2, '2026-01-19 19:53:38'),
(118, 2, 1, '2026-01-19 19:53:43'),
(119, 2, 2, '2026-01-19 20:09:15'),
(120, 2, 2, '2026-01-19 20:09:16'),
(121, 2, 2, '2026-01-20 08:45:57'),
(122, 6, 3, '2026-01-24 12:02:42'),
(123, 6, 2, '2026-01-24 12:03:41'),
(124, 6, 1, '2026-01-24 12:03:54'),
(125, 6, 3, '2026-01-24 12:03:57'),
(126, 6, 2, '2026-01-24 12:04:34'),
(127, 6, 1, '2026-01-24 12:04:36'),
(128, 6, 2, '2026-01-24 12:04:37'),
(129, 6, 1, '2026-01-24 12:05:50'),
(130, 6, 2, '2026-01-24 12:11:16'),
(131, 6, 1, '2026-01-24 12:11:18'),
(132, 6, 1, '2026-01-24 12:20:19'),
(133, 6, 1, '2026-01-24 12:25:37'),
(134, 6, 1, '2026-01-24 12:43:04'),
(135, 6, 1, '2026-01-24 12:52:19'),
(136, 6, 2, '2026-01-24 13:10:56'),
(137, 6, 3, '2026-01-24 13:10:58'),
(138, 6, 1, '2026-01-24 13:11:15'),
(139, 2, 2, '2026-01-26 16:58:00'),
(140, 2, 2, '2026-01-26 17:40:21'),
(141, 2, 1, '2026-01-26 18:09:39'),
(142, 2, 1, '2026-01-26 18:18:16'),
(143, 2, 1, '2026-01-26 19:23:44'),
(144, 2, 1, '2026-01-26 19:28:49'),
(145, 2, 2, '2026-01-26 19:28:53'),
(146, 2, 3, '2026-01-26 19:28:54'),
(147, 2, 3, '2026-01-26 19:28:55'),
(148, 2, 2, '2026-01-26 19:28:56'),
(149, 2, 2, '2026-01-26 19:28:56'),
(150, 2, 1, '2026-01-26 19:28:57'),
(151, 2, 3, '2026-01-26 19:28:58'),
(152, 2, 2, '2026-01-26 19:28:59'),
(153, 2, 1, '2026-01-26 19:34:31'),
(154, 2, 1, '2026-01-26 19:37:40'),
(155, 2, 2, '2026-01-26 19:46:49'),
(156, 2, 2, '2026-01-26 19:50:15'),
(157, 2, 1, '2026-01-26 19:56:58'),
(158, 2, 2, '2026-01-26 20:21:53'),
(159, 2, 1, '2026-01-26 20:26:46'),
(160, 2, 1, '2026-01-26 20:27:39'),
(161, 2, 1, '2026-01-26 20:55:41'),
(162, 2, 1, '2026-01-27 10:44:29'),
(163, 2, 1, '2026-01-27 21:52:02'),
(164, 2, 2, '2026-01-27 21:52:04'),
(165, 2, 3, '2026-01-27 21:52:16'),
(166, 2, 1, '2026-01-27 21:52:21'),
(167, 2, 2, '2026-01-27 21:52:26'),
(168, 2, 3, '2026-01-27 21:52:28'),
(169, 2, 1, '2026-01-27 21:52:30'),
(170, 2, 1, '2026-01-28 14:21:22'),
(171, 2, 2, '2026-01-28 14:33:20'),
(172, 2, 1, '2026-01-28 14:36:06'),
(173, 2, 3, '2026-01-28 18:50:08'),
(174, 2, 3, '2026-01-28 18:50:13'),
(175, 2, 3, '2026-01-28 18:50:15'),
(176, 2, 3, '2026-01-28 18:50:18'),
(177, 2, 1, '2026-01-28 18:50:36'),
(178, 2, 1, '2026-01-28 18:50:38'),
(179, 2, 1, '2026-01-28 18:50:40'),
(180, 2, 3, '2026-01-28 19:22:54'),
(181, 2, 1, '2026-01-28 19:23:06'),
(182, 2, 2, '2026-01-28 19:23:07'),
(183, 2, 1, '2026-01-28 20:35:31'),
(184, 2, 2, '2026-01-28 20:51:19'),
(185, 2, 1, '2026-01-28 23:37:51'),
(186, 2, 5, '2026-01-28 23:37:53'),
(187, 2, 3, '2026-01-28 23:37:55'),
(188, 2, 4, '2026-01-28 23:37:58'),
(189, 2, 4, '2026-01-28 23:38:00'),
(190, 2, 2, '2026-01-28 23:38:02'),
(191, 2, 4, '2026-01-28 23:38:06'),
(192, 2, 4, '2026-01-29 07:20:40'),
(193, 2, 1, '2026-01-29 09:34:25'),
(194, 2, 5, '2026-01-29 09:34:27'),
(195, 2, 3, '2026-01-29 09:34:28'),
(196, 2, 3, '2026-01-29 09:34:29'),
(197, 2, 4, '2026-01-29 09:34:32'),
(198, 2, 2, '2026-01-29 09:35:07'),
(199, 2, 1, '2026-01-29 09:35:09'),
(200, 2, 5, '2026-01-29 09:35:14'),
(201, 2, 3, '2026-01-29 09:35:16'),
(202, 2, 3, '2026-01-29 09:35:31'),
(203, 2, 1, '2026-01-29 09:35:33'),
(204, 2, 5, '2026-01-29 09:35:35'),
(205, 2, 4, '2026-01-29 09:35:40');

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `articles`
--
ALTER TABLE `articles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `boutique_id` (`boutique_id`);

--
-- Index pour la table `boutiques`
--
ALTER TABLE `boutiques`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_boutique_gerant` (`gerant_id`);

--
-- Index pour la table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `telephone` (`telephone`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Index pour la table `commandes`
--
ALTER TABLE `commandes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `article_id` (`article_id`),
  ADD KEY `service_id` (`service_id`),
  ADD KEY `livreur_id` (`livreur_id`),
  ADD KEY `idx_commandes_user_boutique` (`utilisateur_id`,`boutique_id`),
  ADD KEY `idx_commandes_boutique` (`boutique_id`);

--
-- Index pour la table `commentaires`
--
ALTER TABLE `commentaires`
  ADD PRIMARY KEY (`id`),
  ADD KEY `boutique_id` (`boutique_id`),
  ADD KEY `article_id` (`article_id`),
  ADD KEY `service_id` (`service_id`),
  ADD KEY `fk_commentaire_client` (`utilisateur_id`);

--
-- Index pour la table `demandes_services`
--
ALTER TABLE `demandes_services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_utilisateur` (`utilisateur_id`),
  ADD KEY `idx_boutique` (`boutique_id`),
  ADD KEY `idx_service` (`service_id`),
  ADD KEY `idx_statut` (`statut`),
  ADD KEY `idx_date_creation` (`date_creation`);

--
-- Index pour la table `gerants`
--
ALTER TABLE `gerants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `telephone` (`telephone`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Index pour la table `historique_visites`
--
ALTER TABLE `historique_visites`
  ADD PRIMARY KEY (`utilisateur_id`,`boutique_id`,`date_visite`),
  ADD KEY `boutique_id` (`boutique_id`),
  ADD KEY `idx_historique_visites_date` (`date_visite`);

--
-- Index pour la table `livreurs`
--
ALTER TABLE `livreurs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_livreurs_boutique` (`boutique_id`);

--
-- Index pour la table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `boutique_id` (`boutique_id`),
  ADD KEY `fk_notif_client` (`client_id`),
  ADD KEY `fk_notif_gerant` (`gerant_id`);

--
-- Index pour la table `paiements`
--
ALTER TABLE `paiements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `commande_id` (`commande_id`),
  ADD KEY `idx_paiements_boutique` (`boutique_id`),
  ADD KEY `fk_paiement_client` (`utilisateur_id`);

--
-- Index pour la table `paniers`
--
ALTER TABLE `paniers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `article_id` (`article_id`),
  ADD KEY `service_id` (`service_id`),
  ADD KEY `boutique_id` (`boutique_id`),
  ADD KEY `fk_panier_client` (`utilisateur_id`);

--
-- Index pour la table `personnel`
--
ALTER TABLE `personnel`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `telephone` (`telephone`),
  ADD KEY `boutique_id` (`boutique_id`);

--
-- Index pour la table `positions_livreurs`
--
ALTER TABLE `positions_livreurs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `livreur_id` (`livreur_id`),
  ADD KEY `commande_id` (`commande_id`);

--
-- Index pour la table `reductions`
--
ALTER TABLE `reductions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `commande_id` (`commande_id`),
  ADD KEY `fk_reduction_client` (`utilisateur_id`);

--
-- Index pour la table `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `boutique_id` (`boutique_id`);

--
-- Index pour la table `signalements`
--
ALTER TABLE `signalements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reported_by` (`reported_by`),
  ADD KEY `resolved_by` (`resolved_by`);

--
-- Index pour la table `super_admins`
--
ALTER TABLE `super_admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Index pour la table `system_logs`
--
ALTER TABLE `system_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `admin_id` (`admin_id`);

--
-- Index pour la table `utilisateurs`
--
ALTER TABLE `utilisateurs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `telephone` (`telephone`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Index pour la table `utilisateurs_old`
--
ALTER TABLE `utilisateurs_old`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `telephone` (`telephone`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Index pour la table `visites`
--
ALTER TABLE `visites`
  ADD PRIMARY KEY (`id`),
  ADD KEY `boutique_id` (`boutique_id`),
  ADD KEY `fk_visite_client` (`utilisateur_id`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `articles`
--
ALTER TABLE `articles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT pour la table `boutiques`
--
ALTER TABLE `boutiques`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT pour la table `commandes`
--
ALTER TABLE `commandes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT pour la table `commentaires`
--
ALTER TABLE `commentaires`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT pour la table `demandes_services`
--
ALTER TABLE `demandes_services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT pour la table `gerants`
--
ALTER TABLE `gerants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pour la table `livreurs`
--
ALTER TABLE `livreurs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT pour la table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=158;

--
-- AUTO_INCREMENT pour la table `paiements`
--
ALTER TABLE `paiements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT pour la table `paniers`
--
ALTER TABLE `paniers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `personnel`
--
ALTER TABLE `personnel`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `positions_livreurs`
--
ALTER TABLE `positions_livreurs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `reductions`
--
ALTER TABLE `reductions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT pour la table `services`
--
ALTER TABLE `services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `signalements`
--
ALTER TABLE `signalements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `super_admins`
--
ALTER TABLE `super_admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `system_logs`
--
ALTER TABLE `system_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `utilisateurs`
--
ALTER TABLE `utilisateurs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `utilisateurs_old`
--
ALTER TABLE `utilisateurs_old`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `visites`
--
ALTER TABLE `visites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=206;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `articles`
--
ALTER TABLE `articles`
  ADD CONSTRAINT `articles_ibfk_1` FOREIGN KEY (`boutique_id`) REFERENCES `boutiques` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `boutiques`
--
ALTER TABLE `boutiques`
  ADD CONSTRAINT `fk_boutique_gerant` FOREIGN KEY (`gerant_id`) REFERENCES `gerants` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `commandes`
--
ALTER TABLE `commandes`
  ADD CONSTRAINT `commandes_ibfk_2` FOREIGN KEY (`boutique_id`) REFERENCES `boutiques` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `commandes_ibfk_3` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `commandes_ibfk_4` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `commandes_ibfk_5` FOREIGN KEY (`livreur_id`) REFERENCES `livreurs` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_commande_client` FOREIGN KEY (`utilisateur_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `commentaires`
--
ALTER TABLE `commentaires`
  ADD CONSTRAINT `commentaires_ibfk_1` FOREIGN KEY (`boutique_id`) REFERENCES `boutiques` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `commentaires_ibfk_3` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `commentaires_ibfk_4` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_commentaire_client` FOREIGN KEY (`utilisateur_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `demandes_services`
--
ALTER TABLE `demandes_services`
  ADD CONSTRAINT `demandes_services_ibfk_2` FOREIGN KEY (`boutique_id`) REFERENCES `boutiques` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `demandes_services_ibfk_3` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_demande_client` FOREIGN KEY (`utilisateur_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `historique_visites`
--
ALTER TABLE `historique_visites`
  ADD CONSTRAINT `fk_hist_visite_client` FOREIGN KEY (`utilisateur_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `historique_visites_ibfk_2` FOREIGN KEY (`boutique_id`) REFERENCES `boutiques` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `livreurs`
--
ALTER TABLE `livreurs`
  ADD CONSTRAINT `livreurs_ibfk_1` FOREIGN KEY (`boutique_id`) REFERENCES `boutiques` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notif_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_notif_gerant` FOREIGN KEY (`gerant_id`) REFERENCES `gerants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`boutique_id`) REFERENCES `boutiques` (`id`);

--
-- Contraintes pour la table `paiements`
--
ALTER TABLE `paiements`
  ADD CONSTRAINT `fk_paiement_client` FOREIGN KEY (`utilisateur_id`) REFERENCES `clients` (`id`),
  ADD CONSTRAINT `paiements_ibfk_1` FOREIGN KEY (`commande_id`) REFERENCES `commandes` (`id`),
  ADD CONSTRAINT `paiements_ibfk_3` FOREIGN KEY (`boutique_id`) REFERENCES `boutiques` (`id`);

--
-- Contraintes pour la table `paniers`
--
ALTER TABLE `paniers`
  ADD CONSTRAINT `fk_panier_client` FOREIGN KEY (`utilisateur_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `paniers_ibfk_2` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `paniers_ibfk_3` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `paniers_ibfk_4` FOREIGN KEY (`boutique_id`) REFERENCES `boutiques` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `personnel`
--
ALTER TABLE `personnel`
  ADD CONSTRAINT `personnel_ibfk_1` FOREIGN KEY (`boutique_id`) REFERENCES `boutiques` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `positions_livreurs`
--
ALTER TABLE `positions_livreurs`
  ADD CONSTRAINT `positions_livreurs_ibfk_1` FOREIGN KEY (`livreur_id`) REFERENCES `livreurs` (`id`),
  ADD CONSTRAINT `positions_livreurs_ibfk_2` FOREIGN KEY (`commande_id`) REFERENCES `commandes` (`id`);

--
-- Contraintes pour la table `reductions`
--
ALTER TABLE `reductions`
  ADD CONSTRAINT `fk_reduction_client` FOREIGN KEY (`utilisateur_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reductions_ibfk_1` FOREIGN KEY (`commande_id`) REFERENCES `commandes` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `services`
--
ALTER TABLE `services`
  ADD CONSTRAINT `services_ibfk_1` FOREIGN KEY (`boutique_id`) REFERENCES `boutiques` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `signalements`
--
ALTER TABLE `signalements`
  ADD CONSTRAINT `signalements_ibfk_1` FOREIGN KEY (`reported_by`) REFERENCES `utilisateurs_old` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `signalements_ibfk_2` FOREIGN KEY (`resolved_by`) REFERENCES `super_admins` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `system_logs`
--
ALTER TABLE `system_logs`
  ADD CONSTRAINT `system_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `super_admins` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `visites`
--
ALTER TABLE `visites`
  ADD CONSTRAINT `fk_visite_client` FOREIGN KEY (`utilisateur_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `visites_ibfk_2` FOREIGN KEY (`boutique_id`) REFERENCES `boutiques` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
