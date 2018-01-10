
-- phpMyAdmin SQL Dump
-- version 4.2.12deb2+deb8u2
-- http://www.phpmyadmin.net
--
-- Client :  localhost
-- Généré le :  Mer 10 Janvier 2018 à 12:56
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

CREATE DEFINER=`semasim`@`localhost` FUNCTION `_ASSERT`(bool INTEGER, message VARCHAR(256)) RETURNS int(11)
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
  `mem_index` smallint(6) NOT NULL,
  `number_as_stored` varchar(30) NOT NULL,
  `number_local_format` varchar(30) NOT NULL,
  `base64_name_as_stored` varchar(126) NOT NULL,
  `base64_name_full` varchar(126) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=122253 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `sim`
--

CREATE TABLE IF NOT EXISTS `sim` (
`id_` int(11) NOT NULL,
  `imsi` varchar(15) NOT NULL,
  `iccid` varchar(22) NOT NULL,
  `number` varchar(30) DEFAULT NULL,
  `base64_service_provider_from_imsi` varchar(124) DEFAULT NULL,
  `base64_service_provider_from_network` varchar(124) DEFAULT NULL,
  `contact_name_max_length` tinyint(4) NOT NULL,
  `number_max_length` tinyint(4) NOT NULL,
  `storage_left` smallint(6) NOT NULL,
  `storage_digest` varchar(32) NOT NULL,
  `user` int(11) NOT NULL,
  `password` varchar(32) NOT NULL,
  `need_password_renewal` tinyint(1) NOT NULL,
  `base64_friendly_name` varchar(126) NOT NULL,
  `is_voice_enabled` tinyint(1) DEFAULT NULL,
  `is_online` tinyint(1) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=1604 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `ua`
--

CREATE TABLE IF NOT EXISTS `ua` (
`id_` int(11) NOT NULL,
  `instance` varchar(125) NOT NULL,
  `user` int(11) NOT NULL,
  `platform` varchar(10) NOT NULL,
  `push_token` varchar(1024) NOT NULL,
  `software` varchar(255) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=2014 DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `user`
--

CREATE TABLE IF NOT EXISTS `user` (
`id_` int(11) NOT NULL,
  `email` varchar(150) NOT NULL,
  `salt` varchar(16) NOT NULL,
  `hash` varchar(40) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=1485 DEFAULT CHARSET=utf8;

--
-- Contenu de la table `user`
--

INSERT INTO `user` (`id_`, `email`, `salt`, `hash`) VALUES
(1484, 'joseph.garrone.gj@gmail.com', '64781ff04f87c93c', 'f12d401ecc39d3d790b1e959db045c051f24fc8d');

-- --------------------------------------------------------

--
-- Structure de la table `user_sim`
--

CREATE TABLE IF NOT EXISTS `user_sim` (
`id_` int(11) NOT NULL,
  `user` int(11) NOT NULL,
  `sim` int(11) NOT NULL,
  `base64_friendly_name` varchar(124) DEFAULT NULL,
  `base64_sharing_request_message` text
) ENGINE=InnoDB AUTO_INCREMENT=743 DEFAULT CHARSET=utf8;

--
-- Index pour les tables exportées
--

--
-- Index pour la table `contact`
--
ALTER TABLE `contact`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `sim_2` (`sim`,`mem_index`), ADD KEY `sim` (`sim`);

--
-- Index pour la table `sim`
--
ALTER TABLE `sim`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `imsi` (`imsi`), ADD UNIQUE KEY `iccid` (`iccid`), ADD KEY `user` (`user`);

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
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=122253;
--
-- AUTO_INCREMENT pour la table `sim`
--
ALTER TABLE `sim`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=1604;
--
-- AUTO_INCREMENT pour la table `ua`
--
ALTER TABLE `ua`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=2014;
--
-- AUTO_INCREMENT pour la table `user`
--
ALTER TABLE `user`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=1485;
--
-- AUTO_INCREMENT pour la table `user_sim`
--
ALTER TABLE `user_sim`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=743;
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
ADD CONSTRAINT `sim_ibfk_1` FOREIGN KEY (`user`) REFERENCES `user` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE;

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


-- Create user 'semasim' with passord 'semasim'
GRANT USAGE ON *.* TO 'semasim'@'localhost' IDENTIFIED BY PASSWORD '*06F17F404CC5FA440043FF7299795394C01AA1DA';

GRANT ALL PRIVILEGES ON `semasim`.* TO 'semasim'@'localhost' WITH GRANT OPTION;

