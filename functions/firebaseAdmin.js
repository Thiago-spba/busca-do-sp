const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

// Inicializacao unica do Admin SDK, compartilhada por todas as functions
// (acesso.js e autenticacao.js dependem deste mesmo app).
const app = initializeApp();
const db = getFirestore(app);
const authAdmin = getAuth(app);

module.exports = { db, authAdmin };
