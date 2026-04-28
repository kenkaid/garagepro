// src/config/serverConfig.ts
// ============================================================
// CONFIGURATION CENTRALE DU SERVEUR BACKEND
// ============================================================
// Modifier uniquement ce fichier pour changer l'adresse du serveur.
//
// Environnements :
//   - Émulateur Android  : '10.0.2.2'
//   - Vrai téléphone (LAN) : IP locale du PC, ex: '192.168.1.15'
//   - VPS / Production   : IP publique ou domaine, ex: '10.41.175.90'
//
// Protocole :
//   - Développement local : 'http'
//   - Production avec SSL : 'https'
// ============================================================

export const SERVER_IP = '192.168.1.5';
export const SERVER_PORT = '8000';
export const SERVER_PROTOCOL = 'http';

export const BASE_URL = `${SERVER_PROTOCOL}://${SERVER_IP}:${SERVER_PORT}/api`;
