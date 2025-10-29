// Configuration Firebase
// IMPORTANT: Remplacez ces valeurs par celles de votre projet Firebase
// Instructions complètes dans FIREBASE_SETUP.md

const firebaseConfig = {
    apiKey: "VOTRE_API_KEY",
    authDomain: "VOTRE_PROJECT_ID.firebaseapp.com",
    projectId: "VOTRE_PROJECT_ID",
    storageBucket: "VOTRE_PROJECT_ID.appspot.com",
    messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
    appId: "VOTRE_APP_ID"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);

// Références aux services Firebase
const auth = firebase.auth();
const db = firebase.firestore();

// Configuration de la persistance locale
firebase.firestore().enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Persistance désactivée: plusieurs onglets ouverts');
        } else if (err.code == 'unimplemented') {
            console.warn('Persistance non supportée par ce navigateur');
        }
    });

console.log('Firebase initialisé ✓');
