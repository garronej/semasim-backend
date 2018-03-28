-- phpMyAdmin SQL Dump
-- version 4.2.12deb2+deb8u2
-- http://www.phpmyadmin.net
--
-- Client :  localhost
-- Généré le :  Mer 28 Mars 2018 à 09:35
-- Version du serveur :  5.5.55-0+deb8u1
-- Version de PHP :  5.6.30-0+deb8u1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Base de données :  `semasim_running_instances`
--

-- --------------------------------------------------------

--
-- Structure de la table `instance`
--

CREATE TABLE IF NOT EXISTS `instance` (
  `id_` varchar(32) COLLATE utf8_bin NOT NULL,
  `interface_address` varchar(15) COLLATE utf8_bin NOT NULL,
  `https_port` mediumint(9) NOT NULL,
  `http_port` mediumint(9) NOT NULL,
  `sip_ua_port` mediumint(9) NOT NULL,
  `sip_gw_port` mediumint(9) NOT NULL,
  `inter_instances_port` mediumint(9) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Structure de la table `touch`
--

CREATE TABLE IF NOT EXISTS `touch` (
  `id_` enum('singleton') COLLATE utf8_bin NOT NULL DEFAULT 'singleton',
  `val` int(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

--
-- Index pour les tables exportées
--

--
-- Index pour la table `instance`
--
ALTER TABLE `instance`
 ADD PRIMARY KEY (`id_`);

--
-- Index pour la table `touch`
--
ALTER TABLE `touch`
 ADD PRIMARY KEY (`id_`);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

