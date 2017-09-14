-- phpMyAdmin SQL Dump
-- version 4.2.12deb2+deb8u2
-- http://www.phpmyadmin.net
--
-- Client :  localhost
-- Généré le :  Jeu 14 Septembre 2017 à 03:28
-- Version du serveur :  5.5.55-0+deb8u1
-- Version de PHP :  5.6.30-0+deb8u1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Base de données :  `semasim_backend`
--

-- --------------------------------------------------------

--
-- Structure de la table `endpoint_config`
--

CREATE TABLE IF NOT EXISTS `endpoint_config` (
`id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `dongle_imei` varchar(15) NOT NULL,
  `sim_iccid` varchar(22) NOT NULL,
  `sim_service_provider` varchar(100) DEFAULT NULL,
  `sim_number` varchar(30) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `sim_contact`
--

CREATE TABLE IF NOT EXISTS `sim_contact` (
`id` int(11) NOT NULL,
  `sim_iccid` varchar(22) NOT NULL,
  `index` int(11) NOT NULL,
  `number` varchar(30) NOT NULL,
  `base64_name` varchar(124) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `user`
--

CREATE TABLE IF NOT EXISTS `user` (
`id` int(11) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_md5` varchar(32) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8;

--
-- Index pour les tables exportées
--

--
-- Index pour la table `endpoint_config`
--
ALTER TABLE `endpoint_config`
 ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `dongle_imei` (`dongle_imei`), ADD UNIQUE KEY `sim_iccid` (`sim_iccid`), ADD KEY `user_id` (`user_id`);

--
-- Index pour la table `sim_contact`
--
ALTER TABLE `sim_contact`
 ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `sim_iccid_2` (`sim_iccid`,`index`), ADD KEY `sim_iccid` (`sim_iccid`);

--
-- Index pour la table `user`
--
ALTER TABLE `user`
 ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT pour les tables exportées
--

--
-- AUTO_INCREMENT pour la table `endpoint_config`
--
ALTER TABLE `endpoint_config`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=12;
--
-- AUTO_INCREMENT pour la table `sim_contact`
--
ALTER TABLE `sim_contact`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=11;
--
-- AUTO_INCREMENT pour la table `user`
--
ALTER TABLE `user`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=49;
--
-- Contraintes pour les tables exportées
--

--
-- Contraintes pour la table `endpoint_config`
--
ALTER TABLE `endpoint_config`
ADD CONSTRAINT `endpoint_config_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `sim_contact`
--
ALTER TABLE `sim_contact`
ADD CONSTRAINT `sim_contact_ibfk_1` FOREIGN KEY (`sim_iccid`) REFERENCES `endpoint_config` (`sim_iccid`) ON DELETE CASCADE ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

