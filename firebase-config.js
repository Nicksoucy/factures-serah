// Configuration Firebase
// Configuration complétée avec les clés du projet factures-serah

const firebaseConfig = {
    apiKey: "AIzaSyBDzmieVANgqmdG1Wd32jZPzusbL20sUlY",
    authDomain: "factures-serah.firebaseapp.com",
    projectId: "factures-serah",
    storageBucket: "factures-serah.firebasestorage.app",
    messagingSenderId: "317976995359",
    appId: "1:317976995359:web:ebf96ad1b2da2f8adad72a"
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
