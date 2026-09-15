// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Sustitua com as credenciais reais do seu projeto do Firebase Console:
// https://console.firebase.google.com/ -> Configurações do Projeto (Project Settings)
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "seu-projeto-id.firebaseapp.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456789"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firestore
export const db = getFirestore(app);

// Exporta os métodos para reutilização nos módulos do projeto
export { 
    collection, 
    addDoc, 
    onSnapshot, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc 
};