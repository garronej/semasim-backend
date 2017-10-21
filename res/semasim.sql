-- phpMyAdmin SQL Dump
-- version 4.2.12deb2+deb8u2
-- http://www.phpmyadmin.net
--
-- Client :  localhost
-- Généré le :  Sam 21 Octobre 2017 à 17:55
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
CREATE DATABASE IF NOT EXISTS `semasim` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
USE `semasim`;

-- --------------------------------------------------------

--
-- Structure de la table `contact`
--

CREATE TABLE IF NOT EXISTS `contact` (
`id_` int(11) NOT NULL,
  `sim` int(11) NOT NULL,
  `number` varchar(30) NOT NULL,
  `base64_name` varchar(124) NOT NULL,
  `mem_index` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `dongle`
--

CREATE TABLE IF NOT EXISTS `dongle` (
`id_` int(11) NOT NULL,
  `imei` varchar(15) NOT NULL,
  `is_voice_enabled` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `endpoint`
--

CREATE TABLE IF NOT EXISTS `endpoint` (
`id_` int(11) NOT NULL,
  `dongle` int(11) NOT NULL,
  `sim` int(11) NOT NULL,
  `user` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `sim`
--

CREATE TABLE IF NOT EXISTS `sim` (
`id_` int(11) NOT NULL,
  `iccid` varchar(22) NOT NULL,
  `imsi` varchar(15) NOT NULL,
  `service_provider` varchar(100) DEFAULT NULL,
  `number` varchar(30) DEFAULT NULL,
  `contact_name_max_length` int(11) NOT NULL,
  `number_max_length` int(11) NOT NULL,
  `storage_left` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `user`
--

CREATE TABLE IF NOT EXISTS `user` (
`id_` int(11) NOT NULL,
  `email` varchar(150) NOT NULL,
  `salt` varchar(16) NOT NULL,
  `hash` varchar(40) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;

--
-- Index pour les tables exportées
--

--
-- Index pour la table `contact`
--
ALTER TABLE `contact`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `sim` (`sim`,`mem_index`), ADD KEY `sim_2` (`sim`);

--
-- Index pour la table `dongle`
--
ALTER TABLE `dongle`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `imei` (`imei`);

--
-- Index pour la table `endpoint`
--
ALTER TABLE `endpoint`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `dongle_2` (`dongle`,`sim`), ADD UNIQUE KEY `user_2` (`user`,`dongle`), ADD KEY `dongle` (`dongle`), ADD KEY `sim` (`sim`), ADD KEY `user` (`user`);

--
-- Index pour la table `sim`
--
ALTER TABLE `sim`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `iccid` (`iccid`), ADD UNIQUE KEY `imsi` (`imsi`);

--
-- Index pour la table `user`
--
ALTER TABLE `user`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT pour les tables exportées
--

--
-- AUTO_INCREMENT pour la table `contact`
--
ALTER TABLE `contact`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `dongle`
--
ALTER TABLE `dongle`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `endpoint`
--
ALTER TABLE `endpoint`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `sim`
--
ALTER TABLE `sim`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `user`
--
ALTER TABLE `user`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=2;
--
-- Contraintes pour les tables exportées
--

--
-- Contraintes pour la table `contact`
--
ALTER TABLE `contact`
ADD CONSTRAINT `contact_ibfk_1` FOREIGN KEY (`sim`) REFERENCES `sim` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `endpoint`
--
ALTER TABLE `endpoint`
ADD CONSTRAINT `endpoint_ibfk_1` FOREIGN KEY (`dongle`) REFERENCES `dongle` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `endpoint_ibfk_2` FOREIGN KEY (`sim`) REFERENCES `sim` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `endpoint_ibfk_3` FOREIGN KEY (`user`) REFERENCES `user` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- Create user 'semasim' with passord 'semasim'
GRANT USAGE ON *.* TO 'semasim'@'localhost' IDENTIFIED BY PASSWORD '*06F17F404CC5FA440043FF7299795394C01AA1DA';

GRANT ALL PRIVILEGES ON `semasim`.* TO 'semasim'@'localhost' WITH GRANT OPTION;

