-- phpMyAdmin SQL Dump
-- version 4.6.6deb4
-- https://www.phpmyadmin.net/
--
-- Client :  localhost:3306
-- Généré le :  Jeu 12 Décembre 2019 à 02:49
-- Version du serveur :  10.1.26-MariaDB-0+deb9u1
-- Version de PHP :  7.0.33-0+deb9u6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données :  `semasim_webphone_data`
--

-- --------------------------------------------------------

--
-- Structure de la table `chat`
--

CREATE TABLE `chat` (
  `id_` int(11) NOT NULL,
  `user` int(11) NOT NULL,
  `imsi` varchar(15) COLLATE utf8_bin NOT NULL,
  `ref` varchar(32) COLLATE utf8_bin NOT NULL,
  `contact_number_enc` varchar(255) COLLATE utf8_bin NOT NULL,
  `contact_name_enc` text COLLATE utf8_bin NOT NULL,
  `contact_index_in_sim_enc` text COLLATE utf8_bin NOT NULL,
  `last_message_seen` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Structure de la table `message`
--

CREATE TABLE `message` (
  `id_` int(11) NOT NULL,
  `chat` int(11) NOT NULL,
  `ref` varchar(32) COLLATE utf8_bin NOT NULL,
  `time` bigint(20) NOT NULL,
  `text_enc` text COLLATE utf8_bin NOT NULL,
  `is_incoming` tinyint(1) NOT NULL,
  `incoming_is_notification` tinyint(1) DEFAULT NULL,
  `outgoing_status_code` tinyint(4) DEFAULT NULL,
  `outgoing_is_sent_successfully` tinyint(1) DEFAULT NULL,
  `outgoing_delivered_time` bigint(20) DEFAULT NULL,
  `outgoing_sent_by_email_enc` text COLLATE utf8_bin
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

--
-- Index pour les tables exportées
--

--
-- Index pour la table `chat`
--
ALTER TABLE `chat`
  ADD PRIMARY KEY (`id_`),
  ADD UNIQUE KEY `user` (`user`,`imsi`,`contact_number_enc`),
  ADD UNIQUE KEY `user_2` (`user`,`imsi`,`ref`),
  ADD KEY `last_message_seen` (`last_message_seen`);

--
-- Index pour la table `message`
--
ALTER TABLE `message`
  ADD PRIMARY KEY (`id_`),
  ADD UNIQUE KEY `chat` (`chat`,`ref`);

--
-- AUTO_INCREMENT pour les tables exportées
--

--
-- AUTO_INCREMENT pour la table `chat`
--
ALTER TABLE `chat`
  MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;
--
-- AUTO_INCREMENT pour la table `message`
--
ALTER TABLE `message`
  MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=130;
--
-- Contraintes pour les tables exportées
--

--
-- Contraintes pour la table `chat`
--
ALTER TABLE `chat`
  ADD CONSTRAINT `chat_ibfk_2` FOREIGN KEY (`last_message_seen`) REFERENCES `message` (`id_`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Contraintes pour la table `message`
--
ALTER TABLE `message`
  ADD CONSTRAINT `message_ibfk_1` FOREIGN KEY (`chat`) REFERENCES `chat` (`id_`) ON DELETE CASCADE ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
