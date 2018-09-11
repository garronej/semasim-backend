-- phpMyAdmin SQL Dump
-- version 4.2.12deb2+deb8u2
-- http://www.phpmyadmin.net
--
-- Client :  localhost
-- Généré le :  Mer 05 Septembre 2018 à 19:14
-- Version du serveur :  5.5.55-0+deb8u1
-- Version de PHP :  5.6.30-0+deb8u1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Base de données :  `semasim_webphone`
--
CREATE DATABASE IF NOT EXISTS `semasim_webphone` DEFAULT CHARACTER SET utf8 COLLATE utf8_bin;
USE `semasim_webphone`;

DELIMITER $$
--
-- Fonctions
--
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
-- Structure de la table `chat`
--

CREATE TABLE IF NOT EXISTS `chat` (
`id_` int(11) NOT NULL,
  `instance` int(11) NOT NULL,
  `contact_number` varchar(30) COLLATE utf8_bin NOT NULL,
  `contact_name` varchar(126) COLLATE utf8_bin NOT NULL,
  `contact_index_in_sim` smallint(6) DEFAULT NULL,
  `last_message_seen` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Structure de la table `instance`
--

CREATE TABLE IF NOT EXISTS `instance` (
`id_` int(11) NOT NULL,
  `user` int(11) NOT NULL,
  `imsi` varchar(15) COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Structure de la table `message`
--

CREATE TABLE IF NOT EXISTS `message` (
`id_` int(11) NOT NULL,
  `chat` int(11) NOT NULL,
  `time` bigint(20) NOT NULL,
  `text` text COLLATE utf8_bin NOT NULL,
  `is_incoming` tinyint(1) NOT NULL,
  `incoming_is_notification` tinyint(1) DEFAULT NULL,
  `outgoing_status_code` tinyint(4) DEFAULT NULL,
  `outgoing_is_sent_successfully` tinyint(1) DEFAULT NULL,
  `outgoing_delivered_time` bigint(20) DEFAULT NULL,
  `outgoing_sent_by_email` varchar(150) COLLATE utf8_bin DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

--
-- Index pour les tables exportées
--

--
-- Index pour la table `chat`
--
ALTER TABLE `chat`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `instance_2` (`instance`,`contact_number`), ADD KEY `instance` (`instance`), ADD KEY `last_message_seen` (`last_message_seen`);

--
-- Index pour la table `instance`
--
ALTER TABLE `instance`
 ADD PRIMARY KEY (`id_`), ADD UNIQUE KEY `user_2` (`user`,`imsi`), ADD KEY `user` (`user`);

--
-- Index pour la table `message`
--
ALTER TABLE `message`
 ADD PRIMARY KEY (`id_`), ADD KEY `chat` (`chat`);

--
-- AUTO_INCREMENT pour les tables exportées
--

--
-- AUTO_INCREMENT pour la table `chat`
--
ALTER TABLE `chat`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `instance`
--
ALTER TABLE `instance`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `message`
--
ALTER TABLE `message`
MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT;
--
-- Contraintes pour les tables exportées
--

--
-- Contraintes pour la table `chat`
--
ALTER TABLE `chat`
ADD CONSTRAINT `chat_ibfk_1` FOREIGN KEY (`instance`) REFERENCES `instance` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `chat_ibfk_2` FOREIGN KEY (`last_message_seen`) REFERENCES `message` (`id_`) ON DELETE SET NULL ON UPDATE SET NULL;

--
-- Contraintes pour la table `instance`
--
ALTER TABLE `instance`
ADD CONSTRAINT `instance_ibfk_1` FOREIGN KEY (`user`) REFERENCES `semasim`.`user` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `message`
--
ALTER TABLE `message`
ADD CONSTRAINT `message_ibfk_1` FOREIGN KEY (`chat`) REFERENCES `chat` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
