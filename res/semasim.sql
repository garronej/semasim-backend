
-- phpMyAdmin SQL Dump
-- version 4.2.12deb2+deb8u2
-- http://www.phpmyadmin.net
--
-- Client :  localhost
-- Généré le :  Dim 06 Août 2017 à 03:55
-- Version du serveur :  5.5.55-0+deb8u1
-- Version de PHP :  5.6.30-0+deb8u1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Base de données :  `semasim`
--

-- --------------------------------------------------------

--
-- Structure de la table `contacts`
--

CREATE TABLE IF NOT EXISTS `contacts` (
`id` int(11) NOT NULL,
  `dongles_imei` varchar(15) NOT NULL,
  `instanceid` varchar(64) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `contacts_notifications`
--

CREATE TABLE IF NOT EXISTS `contacts_notifications` (
`id` int(11) NOT NULL,
  `contacts_id` int(11) NOT NULL,
  `notifications_id` int(11) NOT NULL,
  `delivered` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `dongles`
--

CREATE TABLE IF NOT EXISTS `dongles` (
  `imei` varchar(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `notifications`
--

CREATE TABLE IF NOT EXISTS `notifications` (
`id` int(11) NOT NULL,
  `dongles_imei` varchar(15) NOT NULL,
  `date` bigint(20) NOT NULL,
  `payload` text NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8;

--
-- Index pour les tables exportées
--

--
-- Index pour la table `contacts`
--
ALTER TABLE `contacts`
 ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `dongles_imei_2` (`dongles_imei`,`instanceid`), ADD KEY `dongles_imei` (`dongles_imei`);

--
-- Index pour la table `contacts_notifications`
--
ALTER TABLE `contacts_notifications`
 ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `contacts_id_2` (`contacts_id`,`notifications_id`), ADD KEY `contacts_id` (`contacts_id`), ADD KEY `notifications_id` (`notifications_id`);

--
-- Index pour la table `dongles`
--
ALTER TABLE `dongles`
 ADD PRIMARY KEY (`imei`);

--
-- Index pour la table `notifications`
--
ALTER TABLE `notifications`
 ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `dongles_imei_2` (`dongles_imei`,`date`), ADD KEY `dongles_imei` (`dongles_imei`);

--
-- AUTO_INCREMENT pour les tables exportées
--

--
-- AUTO_INCREMENT pour la table `contacts`
--
ALTER TABLE `contacts`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=7;
--
-- AUTO_INCREMENT pour la table `contacts_notifications`
--
ALTER TABLE `contacts_notifications`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `notifications`
--
ALTER TABLE `notifications`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=8;
--
-- Contraintes pour les tables exportées
--

--
-- Contraintes pour la table `contacts`
--
ALTER TABLE `contacts`
ADD CONSTRAINT `contacts_ibfk_1` FOREIGN KEY (`dongles_imei`) REFERENCES `dongles` (`imei`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `contacts_notifications`
--
ALTER TABLE `contacts_notifications`
ADD CONSTRAINT `contacts_notifications_ibfk_2` FOREIGN KEY (`notifications_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `contacts_notifications_ibfk_1` FOREIGN KEY (`contacts_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `notifications`
--
ALTER TABLE `notifications`
ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`dongles_imei`) REFERENCES `dongles` (`imei`) ON DELETE CASCADE ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

