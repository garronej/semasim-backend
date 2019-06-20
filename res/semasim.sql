-- phpMyAdmin SQL Dump
-- version 4.6.6deb4
-- https://www.phpmyadmin.net/
--
-- Client :  localhost:3306
-- Généré le :  Sam 08 Juin 2019 à 13:07
-- Version du serveur :  10.1.26-MariaDB-0+deb9u1
-- Version de PHP :  7.0.33-0+deb9u3

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données :  `semasim`
--

-- --------------------------------------------------------

--
-- Structure de la table `contact`
--

CREATE TABLE `contact` (
  `id_` int(11) NOT NULL,
  `sim` int(11) NOT NULL,
  `mem_index` smallint(6) DEFAULT NULL,
  `number_raw` varchar(30) COLLATE utf8_bin NOT NULL,
  `name_as_stored` varchar(50) COLLATE utf8_bin DEFAULT NULL,
  `name` varchar(126) COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Structure de la table `dongle`
--

CREATE TABLE `dongle` (
  `id_` int(11) NOT NULL,
  `imei` varchar(15) COLLATE utf8_bin NOT NULL,
  `is_voice_enabled` tinyint(1) DEFAULT NULL,
  `manufacturer` varchar(30) COLLATE utf8_bin NOT NULL,
  `model` varchar(30) COLLATE utf8_bin NOT NULL,
  `firmware_version` varchar(30) COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Structure de la table `gateway_location`
--

CREATE TABLE `gateway_location` (
  `id_` int(11) NOT NULL,
  `ip` varchar(15) COLLATE utf8_bin NOT NULL,
  `country_iso` varchar(5) COLLATE utf8_bin DEFAULT NULL,
  `subdivisions` varchar(50) COLLATE utf8_bin DEFAULT NULL,
  `city` varchar(50) COLLATE utf8_bin DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Structure de la table `sim`
--

CREATE TABLE `sim` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Structure de la table `ua`
--

CREATE TABLE `ua` (
  `id_` int(11) NOT NULL,
  `instance` varchar(125) COLLATE utf8_bin NOT NULL,
  `user` int(11) NOT NULL,
  `platform` varchar(10) COLLATE utf8_bin NOT NULL,
  `push_token` varchar(1024) COLLATE utf8_bin NOT NULL,
  `messages_enabled` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Structure de la table `user`
--

CREATE TABLE `user` (
  `id_` int(11) NOT NULL,
  `email` varchar(150) COLLATE utf8_bin NOT NULL,
  `salt` varchar(16) COLLATE utf8_bin NOT NULL,
  `digest` varchar(40) COLLATE utf8_bin NOT NULL,
  `last_attempt_date` bigint(20) DEFAULT NULL,
  `forbidden_retry_delay` bigint(11) DEFAULT NULL,
  `password_renewal_token` varchar(32) COLLATE utf8_bin DEFAULT NULL,
  `activation_code` varchar(4) COLLATE utf8_bin DEFAULT NULL,
  `toward_user_encrypt_key` text COLLATE utf8_bin NOT NULL,
  `sym_key_enc` text COLLATE utf8_bin NOT NULL,
  `web_ua_instance_id` varchar(150) COLLATE utf8_bin NOT NULL,
  `creation_date` bigint(20) NOT NULL,
  `ip` varchar(15) COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Structure de la table `user_sim`
--

CREATE TABLE `user_sim` (
  `id_` int(11) NOT NULL,
  `user` int(11) NOT NULL,
  `sim` int(11) NOT NULL,
  `friendly_name` varchar(124) COLLATE utf8_bin DEFAULT NULL,
  `sharing_request_message` text COLLATE utf8_bin
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

--
-- Index pour les tables exportées
--

--
-- Index pour la table `contact`
--
ALTER TABLE `contact`
  ADD PRIMARY KEY (`id_`),
  ADD UNIQUE KEY `sim_2` (`sim`,`mem_index`),
  ADD KEY `sim` (`sim`),
  ADD KEY `number_raw` (`number_raw`);

--
-- Index pour la table `dongle`
--
ALTER TABLE `dongle`
  ADD PRIMARY KEY (`id_`),
  ADD UNIQUE KEY `imei` (`imei`);

--
-- Index pour la table `gateway_location`
--
ALTER TABLE `gateway_location`
  ADD PRIMARY KEY (`id_`),
  ADD UNIQUE KEY `ip` (`ip`);

--
-- Index pour la table `sim`
--
ALTER TABLE `sim`
  ADD PRIMARY KEY (`id_`),
  ADD UNIQUE KEY `imsi` (`imsi`),
  ADD UNIQUE KEY `iccid` (`iccid`),
  ADD KEY `user` (`user`),
  ADD KEY `dongle` (`dongle`),
  ADD KEY `gateway_location` (`gateway_location`);

--
-- Index pour la table `ua`
--
ALTER TABLE `ua`
  ADD PRIMARY KEY (`id_`),
  ADD UNIQUE KEY `instance` (`instance`,`user`),
  ADD KEY `user` (`user`);

--
-- Index pour la table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id_`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Index pour la table `user_sim`
--
ALTER TABLE `user_sim`
  ADD PRIMARY KEY (`id_`),
  ADD UNIQUE KEY `user_2` (`user`,`sim`),
  ADD KEY `user` (`user`),
  ADD KEY `sim` (`sim`);

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
  MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=101;
--
-- AUTO_INCREMENT pour la table `gateway_location`
--
ALTER TABLE `gateway_location`
  MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=135;
--
-- AUTO_INCREMENT pour la table `sim`
--
ALTER TABLE `sim`
  MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `ua`
--
ALTER TABLE `ua`
  MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `user`
--
ALTER TABLE `user`
  MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `user_sim`
--
ALTER TABLE `user_sim`
  MODIFY `id_` int(11) NOT NULL AUTO_INCREMENT;
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
