-- phpMyAdmin SQL Dump
-- version 4.2.12deb2+deb8u2
-- http://www.phpmyadmin.net
--
-- Client :  localhost
-- Généré le :  Mer 03 Octobre 2018 à 08:57
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

DELIMITER $$
--
-- Fonctions
--
CREATE DEFINER=`semasim`@`localhost` FUNCTION `assert`(doit INTEGER, message VARCHAR(256)) RETURNS int(11)
    DETERMINISTIC
BEGIN                                                                                      
    IF doit IS NULL OR doit = 0 THEN                                                       
        SIGNAL SQLSTATE 'ERR0R' SET MESSAGE_TEXT = message;                                
    END IF;                                                                                
    RETURN doit;                                                                           
END$$

CREATE DEFINER=`semasim`@`localhost` FUNCTION `assert2`(doit INTEGER, message VARCHAR(256)) RETURNS int(11)
    DETERMINISTIC
BEGIN                                                                                      
    IF doit IS NULL OR doit = 0 THEN                                                       
        SIGNAL SQLSTATE 'ERR0R' SET MESSAGE_TEXT = message;                                
    END IF;                                                                                
    RETURN doit;                                                                           
END$$

CREATE DEFINER=`semasim`@`localhost` FUNCTION `checkit`(doit INTEGER, message VARCHAR(256)) RETURNS int(11)
    DETERMINISTIC
BEGIN                                                                                      
    IF doit IS NULL OR doit = 0 THEN                                                       
        SIGNAL SQLSTATE 'ERR0R' SET MESSAGE_TEXT = message;                                
    END IF;                                                                                
    RETURN doit;                                                                           
END$$

CREATE DEFINER=`semasim`@`172.31.16.0/255.255.240.0` FUNCTION `_ASSERT`(bool INTEGER, message VARCHAR(256)) RETURNS int(11)
    DETERMINISTIC
BEGIN
    IF bool IS NULL OR bool = 0 THEN
        SIGNAL SQLSTATE 'ERR0R' SET MESSAGE_TEXT = message;
    END IF;
    RETURN bool;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Structure de la table `contact`
--

CREATE TABLE IF NOT EXISTS `contact` (
`id_` int(11) NOT NULL,
  `sim` int(11) NOT NULL,
  `mem_index` smallint(6) DEFAULT NULL,
  `number_raw` varchar(30) COLLATE utf8_bin NOT NULL,
  `name_as_stored` varchar(50) COLLATE utf8_bin DEFAULT NULL,
  `name` varchar(126) COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=7009 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Structure de la table `dongle`
--

CREATE TABLE IF NOT EXISTS `dongle` (
`id_` int(11) NOT NULL,
  `imei` varchar(15) COLLATE utf8_bin NOT NULL,
  `is_voice_enabled` tinyint(1) DEFAULT NULL,
  `manufacturer` varchar(30) COLLATE utf8_bin NOT NULL,
  `model` varchar(30) COLLATE utf8_bin NOT NULL,
  `firmware_version` varchar(30) COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=99 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Structure de la table `gateway_location`
--

CREATE TABLE IF NOT EXISTS `gateway_location` (
`id_` int(11) NOT NULL,
  `ip` varchar(15) COLLATE utf8_bin NOT NULL,
  `country_iso` varchar(5) COLLATE utf8_bin DEFAULT NULL,
  `subdivisions` varchar(50) COLLATE utf8_bin DEFAULT NULL,
  `city` varchar(50) COLLATE utf8_bin DEFAULT NULL
) ENGINE=InnoDB AUTO_INCREMENT=95 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Structure de la table `sim`
--

CREATE TABLE IF NOT EXISTS `sim` (
`id_` int(11) NOT NULL,
  `imsi` varchar(15) COLLATE utf8_bin NOT NULL,
  `country_name` varchar(30) COLLATE utf8_bin DEFAULT NULL,
  `country_iso` varchar(5) COLLATE utf8_bin DEFAULT NULL,
  `country_code` int(11) DEFAULT NULL,
  `iccid` varchar(22) COLLATE utf8_bin NOT NULL,
  `dongle` int(11) NOT NULL,
  `gateway_location` int(11) NOT NULL,
  `number_as_stored` varchar(30) COLLATE utf8_bin DEFAULT NULL,
  `service_provider_from_imsi` varchar(124) COLLATE utf8_bin DEFAULT NULL,
  `service_provider_from_network` varchar(124) COLLATE utf8_bin DEFAULT NULL,
  `contact_name_max_length` tinyint(4) NOT NULL,
  `number_max_length` tinyint(4) NOT NULL,
  `storage_left` smallint(6) NOT NULL,
  `storage_digest` varchar(32) COLLATE utf8_bin NOT NULL,
  `user` int(11) NOT NULL,
  `password` varchar(32) COLLATE utf8_bin NOT NULL,
  `need_password_renewal` tinyint(1) NOT NULL,
  `friendly_name` varchar(126) COLLATE utf8_bin NOT NULL,
  `is_online` tinyint(1) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Structure de la table `ua`
--

CREATE TABLE IF NOT EXISTS `ua` (
`id_` int(11) NOT NULL,
  `instance` varchar(125) COLLATE utf8_bin NOT NULL,
  `user` int(11) NOT NULL,
  `platform` varchar(10) COLLATE utf8_bin NOT NULL,
  `push_token` varchar(1024) COLLATE utf8_bin NOT NULL,
  `software` varchar(255) COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=159 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Structure de la table `user`
--

CREATE TABLE IF NOT EXISTS `user` (
`id_` int(11) NOT NULL,
  `email` varchar(150) COLLATE utf8_bin NOT NULL,
  `salt` varchar(16) COLLATE utf8_bin NOT NULL,
  `hash` varchar(40) COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Structure de la table `user_sim`
--

CREATE TABLE IF NOT EXISTS `user_sim` (
`id_` int(11) NOT NULL,
  `user` int(11) NOT NULL,
  `sim` int(11) NOT NULL,
  `friendly_name` varchar(124) COLLATE utf8_bin DEFAULT NULL,
  `sharing_request_message` text COLLATE utf8_bin
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

--
-- Index pour les tables exportées
--

--
-- Index pour la table `contact`
--
ALTER TABLE `contact`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `sim_2` (`sim`,`mem_index`), ADD KEY `sim` (`sim`), ADD KEY `number_raw` (`number_raw`);

--
-- Index pour la table `dongle`
--
ALTER TABLE `dongle`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `imei` (`imei`);

--
-- Index pour la table `gateway_location`
--
ALTER TABLE `gateway_location`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `ip` (`ip`);

--
-- Index pour la table `sim`
--
ALTER TABLE `sim`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `imsi` (`imsi`), ADD UNIQUE KEY `iccid` (`iccid`), ADD KEY `user` (`user`), ADD KEY `dongle` (`dongle`), ADD KEY `gateway_location` (`gateway_location`);

--
-- Index pour la table `ua`
--
ALTER TABLE `ua`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `instance` (`instance`,`user`), ADD KEY `user` (`user`);

--
-- Index pour la table `user`
--
ALTER TABLE `user`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `email` (`email`);

--
-- Index pour la table `user_sim`
--
ALTER TABLE `user_sim`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `user_2` (`user`,`sim`), ADD KEY `user` (`user`), ADD KEY `sim` (`sim`);

--
-- AUTO_INCREMENT pour les tables exportées
--

--
-- AUTO_INCREMENT pour la table `contact`
--
ALTER TABLE `contact`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=7009;
--
-- AUTO_INCREMENT pour la table `dongle`
--
ALTER TABLE `dongle`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=99;
--
-- AUTO_INCREMENT pour la table `gateway_location`
--
ALTER TABLE `gateway_location`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=95;
--
-- AUTO_INCREMENT pour la table `sim`
--
ALTER TABLE `sim`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=51;
--
-- AUTO_INCREMENT pour la table `ua`
--
ALTER TABLE `ua`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=159;
--
-- AUTO_INCREMENT pour la table `user`
--
ALTER TABLE `user`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=57;
--
-- AUTO_INCREMENT pour la table `user_sim`
--
ALTER TABLE `user_sim`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=3;
--
-- Contraintes pour les tables exportées
--

--
-- Contraintes pour la table `contact`
--
ALTER TABLE `contact`
ADD CONSTRAINT `contact_ibfk_1` FOREIGN KEY (`sim`) REFERENCES `sim` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `sim`
--
ALTER TABLE `sim`
ADD CONSTRAINT `sim_ibfk_1` FOREIGN KEY (`user`) REFERENCES `user` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `sim_ibfk_2` FOREIGN KEY (`dongle`) REFERENCES `dongle` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `sim_ibfk_3` FOREIGN KEY (`gateway_location`) REFERENCES `gateway_location` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `ua`
--
ALTER TABLE `ua`
ADD CONSTRAINT `ua_ibfk_1` FOREIGN KEY (`user`) REFERENCES `user` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `user_sim`
--
ALTER TABLE `user_sim`
ADD CONSTRAINT `user_sim_ibfk_1` FOREIGN KEY (`user`) REFERENCES `user` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `user_sim_ibfk_2` FOREIGN KEY (`sim`) REFERENCES `sim` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
