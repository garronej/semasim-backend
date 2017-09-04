-- phpMyAdmin SQL Dump
-- version 4.2.12deb2+deb8u2
-- http://www.phpmyadmin.net
--
-- Client :  localhost
-- Généré le :  Lun 04 Septembre 2017 à 15:17
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
-- Structure de la table `dongle`
--

CREATE TABLE IF NOT EXISTS `dongle` (
  `imei` varchar(15) NOT NULL,
  `sim_iccid` varchar(22) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `message_toward_gsm`
--

CREATE TABLE IF NOT EXISTS `message_toward_gsm` (
`id` int(11) NOT NULL,
  `sim_iccid` varchar(22) NOT NULL,
  `creation_timestamp` bigint(20) NOT NULL,
  `ua_instance_id` int(11) NOT NULL,
  `to_number` varchar(25) NOT NULL,
  `base64_text` text NOT NULL,
  `sent_message_id` bigint(20) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `message_toward_sip`
--

CREATE TABLE IF NOT EXISTS `message_toward_sip` (
`id` int(11) NOT NULL,
  `sim_iccid` varchar(22) NOT NULL,
  `creation_timestamp` bigint(20) NOT NULL,
  `from_number` varchar(25) DEFAULT NULL,
  `base64_text` text NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `sim`
--

CREATE TABLE IF NOT EXISTS `sim` (
  `iccid` varchar(22) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `ua_instance`
--

CREATE TABLE IF NOT EXISTS `ua_instance` (
`id` int(11) NOT NULL,
  `dongle_imei` varchar(15) NOT NULL,
  `instance_id` varchar(125) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=138 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `ua_instance_message_toward_sip`
--

CREATE TABLE IF NOT EXISTS `ua_instance_message_toward_sip` (
`id` int(11) NOT NULL,
  `ua_instance_id` int(11) NOT NULL,
  `message_toward_sip_id` int(11) NOT NULL,
  `delivered_timestamp` bigint(20) DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=1038 DEFAULT CHARSET=utf8;

--
-- Index pour les tables exportées
--

--
-- Index pour la table `dongle`
--
ALTER TABLE `dongle`
 ADD PRIMARY KEY (`imei`), ADD KEY `sim_iccid` (`sim_iccid`);

--
-- Index pour la table `message_toward_gsm`
--
ALTER TABLE `message_toward_gsm`
 ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `REAL_PRIMARY` (`sim_iccid`,`creation_timestamp`), ADD KEY `sim_iccid` (`sim_iccid`), ADD KEY `ua_instance_id` (`ua_instance_id`);

--
-- Index pour la table `message_toward_sip`
--
ALTER TABLE `message_toward_sip`
 ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `REAL_PRIMARY` (`sim_iccid`,`creation_timestamp`), ADD KEY `sim_iccid` (`sim_iccid`);

--
-- Index pour la table `sim`
--
ALTER TABLE `sim`
 ADD PRIMARY KEY (`iccid`);

--
-- Index pour la table `ua_instance`
--
ALTER TABLE `ua_instance`
 ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `REAL_PRIMARY` (`dongle_imei`,`instance_id`), ADD KEY `dongle_imei` (`dongle_imei`);

--
-- Index pour la table `ua_instance_message_toward_sip`
--
ALTER TABLE `ua_instance_message_toward_sip`
 ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `REAL_PRIMARY` (`ua_instance_id`,`message_toward_sip_id`), ADD KEY `ua_instance_id` (`ua_instance_id`), ADD KEY `message_toward_sip_id` (`message_toward_sip_id`);

--
-- AUTO_INCREMENT pour les tables exportées
--

--
-- AUTO_INCREMENT pour la table `message_toward_gsm`
--
ALTER TABLE `message_toward_gsm`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=33;
--
-- AUTO_INCREMENT pour la table `message_toward_sip`
--
ALTER TABLE `message_toward_sip`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=72;
--
-- AUTO_INCREMENT pour la table `ua_instance`
--
ALTER TABLE `ua_instance`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=138;
--
-- AUTO_INCREMENT pour la table `ua_instance_message_toward_sip`
--
ALTER TABLE `ua_instance_message_toward_sip`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=1038;
--
-- Contraintes pour les tables exportées
--

--
-- Contraintes pour la table `dongle`
--
ALTER TABLE `dongle`
ADD CONSTRAINT `dongle_ibfk_1` FOREIGN KEY (`sim_iccid`) REFERENCES `sim` (`iccid`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `message_toward_gsm`
--
ALTER TABLE `message_toward_gsm`
ADD CONSTRAINT `message_toward_gsm_ibfk_1` FOREIGN KEY (`sim_iccid`) REFERENCES `sim` (`iccid`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `message_toward_gsm_ibfk_2` FOREIGN KEY (`ua_instance_id`) REFERENCES `ua_instance` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `message_toward_sip`
--
ALTER TABLE `message_toward_sip`
ADD CONSTRAINT `message_toward_sip_ibfk_1` FOREIGN KEY (`sim_iccid`) REFERENCES `sim` (`iccid`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `ua_instance`
--
ALTER TABLE `ua_instance`
ADD CONSTRAINT `ua_instance_ibfk_1` FOREIGN KEY (`dongle_imei`) REFERENCES `dongle` (`imei`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `ua_instance_message_toward_sip`
--
ALTER TABLE `ua_instance_message_toward_sip`
ADD CONSTRAINT `ua_instance_message_toward_sip_ibfk_1` FOREIGN KEY (`ua_instance_id`) REFERENCES `ua_instance` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `ua_instance_message_toward_sip_ibfk_2` FOREIGN KEY (`message_toward_sip_id`) REFERENCES `message_toward_sip` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
