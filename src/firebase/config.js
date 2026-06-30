import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// ATENÇÃO: Substitua esses valores falsos (placeholders) pelos dados reais
// do seu projeto Firebase. Você encontra isso no console do Firebase,
// na seção "Configurações do Projeto" > "Geral" > "Seus aplicativos" (Web).
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "busca-do-sp.firebaseapp.com",
  projectId: "busca-do-sp",
  storageBucket: "busca-do-sp.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "southamerica-east1");

export { app, auth, db, functions };
