# Configuration Firebase - Guide Complet

Ce guide vous explique comment configurer Firebase pour votre application de facturation afin d'avoir une base de données cloud permanente.

## Pourquoi Firebase?

- ✅ **Gratuit** jusqu'à 50,000 lectures/jour
- ✅ **Données permanentes** - ne seront jamais perdues
- ✅ **Multi-appareils** - accessible depuis n'importe où
- ✅ **Backup automatique** - vos données sont protégées
- ✅ **Authentification sécurisée** - chaque utilisateur a ses propres données

## Étape 1: Créer un compte Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Connectez-vous avec votre compte Google
3. Cliquez sur **"Ajouter un projet"**

## Étape 2: Créer votre projet

1. **Nom du projet**: `factures-serah` (ou autre nom de votre choix)
2. **Google Analytics**: Vous pouvez désactiver (non nécessaire pour ce projet)
3. Cliquez sur **"Créer le projet"**
4. Attendez quelques secondes que le projet soit créé

## Étape 3: Activer l'authentification

1. Dans le menu latéral, cliquez sur **"Authentication"** (🔐)
2. Cliquez sur **"Get started"**
3. Sous "Sign-in method", cliquez sur **"Email/Password"**
4. **Activez** le premier bouton (Email/Password)
5. Cliquez sur **"Enregistrer"**

## Étape 4: Créer la base de données Firestore

1. Dans le menu latéral, cliquez sur **"Firestore Database"** (🗄️)
2. Cliquez sur **"Créer une base de données"**
3. Choisissez **"Démarrer en mode production"**
4. Sélectionnez l'emplacement le plus proche de vous (ex: `northamerica-northeast1 (Montréal)`)
5. Cliquez sur **"Activer"**

## Étape 5: Configurer les règles de sécurité

1. Dans Firestore Database, cliquez sur l'onglet **"Règles"**
2. Remplacez les règles par ceci:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permettre aux utilisateurs authentifiés d'accéder uniquement à leurs propres données
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Cliquez sur **"Publier"**

## Étape 6: Obtenir vos clés de configuration

1. Dans le menu latéral, cliquez sur l'icône **⚙️** (paramètres du projet)
2. Cliquez sur **"Paramètres du projet"**
3. Faites défiler jusqu'à **"Vos applications"**
4. Cliquez sur l'icône **</>** (Web)
5. **Nom de l'app**: `factures-serah-web`
6. **NE PAS** cocher "Firebase Hosting"
7. Cliquez sur **"Enregistrer l'application"**
8. Vous verrez un code de configuration qui ressemble à:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "factures-serah.firebaseapp.com",
  projectId: "factures-serah",
  storageBucket: "factures-serah.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

## Étape 7: Configurer l'application

1. Ouvrez le fichier `firebase-config.js`
2. Remplacez les valeurs `VOTRE_XXX` par vos vraies valeurs:

```javascript
const firebaseConfig = {
    apiKey: "COLLER_VOTRE_API_KEY_ICI",
    authDomain: "COLLER_VOTRE_AUTH_DOMAIN_ICI",
    projectId: "COLLER_VOTRE_PROJECT_ID_ICI",
    storageBucket: "COLLER_VOTRE_STORAGE_BUCKET_ICI",
    messagingSenderId: "COLLER_VOTRE_MESSAGING_SENDER_ID_ICI",
    appId: "COLLER_VOTRE_APP_ID_ICI"
};
```

3. Sauvegardez le fichier

## Étape 8: Créer le premier compte utilisateur

1. Ouvrez `index.html` dans votre navigateur
2. Un écran de connexion apparaîtra
3. Cliquez sur **"Créer un compte"**
4. Entrez votre email et mot de passe (minimum 6 caractères)
5. Vous serez automatiquement connecté!

## Étape 9: Test

Essayez de:
1. Créer une facture
2. Fermer le navigateur
3. Rouvrir l'application
4. **Vos données sont toujours là!** ✨

## Structure de la base de données

Vos données sont organisées ainsi dans Firestore:

```
users/
  └── {userId}/
      ├── invoiceNumber: 1000
      ├── invoices/
      │   ├── {invoiceId}
      │   │   ├── clientName
      │   │   ├── clientEmail
      │   │   ├── date
      │   │   ├── sessions[]
      │   │   ├── total
      │   │   └── createdAt
      │   └── ...
      └── expenses/
          ├── {expenseId}
          │   ├── description
          │   ├── amount
          │   ├── date
          │   ├── category
          │   ├── photo
          │   └── createdAt
          └── ...
```

## Sécurité

- ✅ Chaque utilisateur ne peut voir QUE ses propres données
- ✅ Les mots de passe sont chiffrés par Firebase
- ✅ Les données sont transmises via HTTPS
- ✅ Règles de sécurité strictes activées

## Limites du plan gratuit

- ✅ 50,000 lectures/jour
- ✅ 20,000 écritures/jour
- ✅ 1 GB de stockage
- ✅ Largement suffisant pour un usage personnel!

## Déploiement sur GitHub Pages

Une fois configuré, vous pouvez déployer sur GitHub Pages:

1. Commitez tous les fichiers (SAUF firebase-config.js avec vos vraies clés si le repo est public)
2. Pour un repo public, utilisez des variables d'environnement GitHub Secrets
3. Pour un repo privé, vous pouvez commit firebase-config.js directement

**IMPORTANT**: Ne commitez JAMAIS vos vraies clés Firebase sur un repository PUBLIC!

## Support

Si vous rencontrez des problèmes:

1. Vérifiez que toutes les étapes ont été suivies
2. Vérifiez la console du navigateur (F12) pour les erreurs
3. Vérifiez que l'authentification est bien activée dans Firebase
4. Vérifiez que les règles Firestore sont correctement configurées

## Migration depuis localStorage

Si vous aviez des données en localStorage avant Firebase:

1. Les données localStorage restent locales à votre navigateur
2. Vous devrez recréer vos factures et dépenses dans la nouvelle interface
3. Utilisez l'export Excel de l'ancienne version si besoin de garder l'historique

---

**Félicitations!** Vous avez maintenant une application de facturation professionnelle avec base de données cloud! 🎉
