import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBglEWIfRgTQWXcPyfQlHWjVitvJyfif1E",
  authDomain: "busca-do-sp.firebaseapp.com",
  projectId: "busca-do-sp",
  storageBucket: "busca-do-sp.firebasestorage.app",
  messagingSenderId: "57633434913",
  appId: "1:57633434913:web:24c33a487e858633a36260"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "southamerica-east1");

export { app, auth, db, functions };
