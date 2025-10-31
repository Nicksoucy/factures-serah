# Configuration Gmail API - Guide Complet

Ce guide vous explique comment configurer l'envoi automatique d'emails pour vos factures en utilisant Gmail API avec OAuth 2.0.

## Pourquoi cette solution?

- ✅ **Envoi automatique depuis VOTRE Gmail** - Les emails sont envoyés depuis votre propre adresse
- ✅ **Connexion unique** - Un seul clic pour connecter Gmail, pas de configuration manuelle
- ✅ **Sécurisé** - Utilise OAuth 2.0, la méthode recommandée par Google
- ✅ **Gratuit** - Utilise les limites Gmail gratuites (500 emails/jour)
- ✅ **PDF automatiquement joint** - La facture PDF est attachée à l'email

## Architecture

```
Utilisateur
    ↓ (clique "Envoyer Email")
Application Frontend (gmail-auth.js)
    ↓ (demande autorisation OAuth)
Google OAuth
    ↓ (retourne code d'autorisation)
Firebase Function (exchangeGmailCode)
    ↓ (échange code contre tokens)
Firestore
    ↓ (stocke les tokens)
Firebase Function (sendInvoiceEmail)
    ↓ (utilise tokens pour envoyer)
Gmail API
    ↓
Email envoyé ✓
```

## Prérequis

- Projet Firebase déjà configuré (voir FIREBASE_SETUP.md)
- Compte Google (Gmail)
- Node.js installé (pour Firebase Functions)

---

## Étape 1: Activer Gmail API dans Google Cloud

### 1.1 Accéder à Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Connectez-vous avec le même compte Google que votre projet Firebase
3. En haut à gauche, cliquez sur le sélecteur de projet
4. **Sélectionnez votre projet Firebase** (ex: `factures-serah`)
   - Si vous ne le voyez pas, retournez dans Firebase Console pour trouver le Project ID

### 1.2 Activer Gmail API

1. Dans le menu latéral, allez dans **APIs & Services** → **Library**
2. Recherchez `Gmail API`
3. Cliquez sur **Gmail API**
4. Cliquez sur **ENABLE** (Activer)
5. Attendez quelques secondes

---

## Étape 2: Configurer l'écran de consentement OAuth

### 2.1 Configurer l'écran de consentement

1. Dans le menu latéral, allez dans **APIs & Services** → **OAuth consent screen**
2. Sélectionnez **External** (utilisateurs externes)
3. Cliquez sur **CREATE**

### 2.2 Remplir les informations

**Page 1: OAuth consent screen**
- **App name**: `Gestion de Factures` (ou votre nom d'application)
- **User support email**: Votre email
- **App logo**: (optionnel)
- **Application home page**: Laisser vide ou mettre l'URL de votre app
- **Authorized domains**:
  - Ajoutez `firebaseapp.com` si vous utilisez Firebase Hosting
  - Ajoutez votre domaine si vous en avez un
- **Developer contact information**: Votre email
- Cliquez sur **SAVE AND CONTINUE**

**Page 2: Scopes**
- Cliquez sur **ADD OR REMOVE SCOPES**
- Recherchez et cochez: `https://www.googleapis.com/auth/gmail.send`
- Description: "Send email on your behalf"
- Cliquez sur **UPDATE**
- Cliquez sur **SAVE AND CONTINUE**

**Page 3: Test users**
- Cliquez sur **ADD USERS**
- Ajoutez votre propre email (et celui de vos utilisateurs tests)
- Cliquez sur **SAVE AND CONTINUE**

**Page 4: Summary**
- Vérifiez les informations
- Cliquez sur **BACK TO DASHBOARD**

---

## Étape 3: Créer les identifiants OAuth 2.0

### 3.1 Créer un Client ID OAuth

1. Dans le menu latéral, allez dans **APIs & Services** → **Credentials**
2. Cliquez sur **+ CREATE CREDENTIALS** en haut
3. Sélectionnez **OAuth client ID**

### 3.2 Configurer le Client ID

1. **Application type**: Sélectionnez **Web application**
2. **Name**: `factures-app-web-client` (ou autre nom)
3. **Authorized JavaScript origins**: Ajoutez les URLs suivantes:
   ```
   http://localhost:5500
   http://localhost:8080
   http://127.0.0.1:5500
   https://VOTRE-PROJECT-ID.web.app
   https://VOTRE-PROJECT-ID.firebaseapp.com
   ```
   *Remplacez `VOTRE-PROJECT-ID` par votre vrai Project ID Firebase*

4. **Authorized redirect URIs**: Ajoutez les mêmes URLs que ci-dessus
5. Cliquez sur **CREATE**

### 3.3 Copier les identifiants

Une popup s'ouvre avec vos identifiants:
```
Client ID: 123456789-abcdefghijklmnop.apps.googleusercontent.com
Client secret: GOCSPX-aBcDeFgHiJkLmNoPqRsTuVwXyZ
```

**⚠️ IMPORTANT**: Notez ces valeurs, vous en aurez besoin!

---

## Étape 4: Configurer Firebase Functions

### 4.1 Installer Firebase CLI

Si pas déjà fait:
```bash
npm install -g firebase-tools
```

### 4.2 Initialiser Firebase Functions

Dans le dossier de votre projet:
```bash
firebase login
firebase init functions
```

Sélectionnez:
- **Language**: JavaScript
- **ESLint**: No (ou Yes si vous voulez)
- **Install dependencies**: Yes

### 4.3 Installer les dépendances

```bash
cd functions
npm install googleapis nodemailer
cd ..
```

### 4.4 Configurer les variables d'environnement Firebase

Remplacez les valeurs par vos vrais identifiants:

```bash
firebase functions:config:set gmail.client_id="VOTRE_CLIENT_ID.apps.googleusercontent.com"
firebase functions:config:set gmail.client_secret="VOTRE_CLIENT_SECRET"
firebase functions:config:set gmail.redirect_uri="https://VOTRE-PROJECT-ID.firebaseapp.com"
```

Vérifiez la configuration:
```bash
firebase functions:config:get
```

---

## Étape 5: Déployer Firebase Functions

### 5.1 Vérifier le code

Les fichiers `functions/index.js` et `functions/package.json` ont déjà été créés.

### 5.2 Déployer les fonctions

```bash
firebase deploy --only functions
```

Attendez quelques minutes. Vous verrez:
```
✔  functions: Finished running predeploy script.
✔  functions[exchangeGmailCode(...)]: Successful create operation.
✔  functions[sendInvoiceEmail(...)]: Successful create operation.
```

---

## Étape 6: Configurer le frontend

### 6.1 Mettre à jour gmail-auth.js

Ouvrez `gmail-auth.js` et remplacez:

```javascript
const GMAIL_CONFIG = {
    clientId: 'VOTRE_CLIENT_ID.apps.googleusercontent.com',  // ← Remplacez ici
    scopes: [
        'https://www.googleapis.com/auth/gmail.send'
    ],
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest']
};
```

### 6.2 Tester localement

1. Ouvrez `index.html` dans votre navigateur
2. Connectez-vous à Firebase Auth
3. Allez dans l'onglet **Paramètres**
4. Dans la section **Configuration Email**, cliquez sur **Connecter Gmail**
5. Une popup Google s'ouvre, autorisez l'application
6. Vous devriez voir "✓ Gmail Connecté"

---

## Étape 7: Envoyer votre première facture

### 7.1 Créer une facture

1. Allez dans l'onglet **Factures**
2. Créez une facture avec un email de client valide
3. Cliquez sur **Générer Facture PDF**

### 7.2 Envoyer par email

1. Dans la liste des factures, trouvez votre facture
2. Cliquez sur **✉️ Envoyer Email**
3. L'email sera envoyé avec le PDF en pièce jointe!

### 7.3 Vérifier

1. Vérifiez la boîte de réception du client
2. L'email devrait arriver de votre adresse Gmail
3. Le PDF est attaché

---

## Dépannage

### Erreur: "Gmail non connecté"

**Solution**: Allez dans Paramètres → Configuration Email → Connecter Gmail

### Erreur: "The OAuth client was not found"

**Solution**: Vérifiez que le Client ID dans `gmail-auth.js` est correct

### Erreur: "Redirect URI mismatch"

**Solution**:
1. Vérifiez l'URL dans votre navigateur
2. Ajoutez cette URL exacte dans Google Cloud Console → Credentials → Authorized redirect URIs

### Erreur: "Access blocked: This app's request is invalid"

**Solution**: Vérifiez que vous avez bien ajouté votre email dans les "Test users" de l'écran de consentement OAuth

### Erreur lors du déploiement des fonctions

**Solution**:
```bash
# Vérifier que vous êtes connecté
firebase login

# Vérifier le projet actif
firebase projects:list

# Changer de projet si nécessaire
firebase use VOTRE-PROJECT-ID

# Réessayer
firebase deploy --only functions
```

### Les emails ne partent pas

**Solution**:
1. Vérifiez les logs Firebase Functions:
   ```bash
   firebase functions:log
   ```
2. Vérifiez que Gmail API est bien activée
3. Vérifiez que les tokens sont stockés dans Firestore (collection `users/{userId}` → champ `gmailTokens`)

---

## Limites

### Limites Gmail API (gratuit)

- **500 emails/jour** par compte Gmail
- **10 emails/seconde** (burst)
- Largement suffisant pour un usage individuel

### Limites Firebase Functions (plan Spark - gratuit)

- **125,000 invocations/mois**
- **40,000 GB-secondes/mois**
- **5 GB de trafic sortant/mois**

Pour envoyer des emails, c'est largement suffisant!

---

## Sécurité

✅ **OAuth 2.0**: Méthode sécurisée recommandée par Google
✅ **Tokens stockés côté serveur**: Dans Firestore avec règles de sécurité
✅ **Refresh automatique**: Les tokens sont rafraîchis automatiquement
✅ **Isolation par utilisateur**: Chaque utilisateur utilise son propre compte Gmail

⚠️ **Important**:
- Ne commitez JAMAIS vos `Client Secret` sur GitHub public
- Utilisez les variables d'environnement Firebase (déjà configurées)
- Les tokens OAuth sont stockés de façon sécurisée dans Firestore

---

## Passer en production

### Option 1: Rester en mode "Test"

Pour un usage personnel, le mode Test suffit:
- Ajoutez tous vos utilisateurs dans "Test users"
- Maximum 100 utilisateurs tests
- Pas besoin de vérification Google

### Option 2: Publier l'app (usage public)

Pour permettre à n'importe qui d'utiliser l'app:
1. Allez dans OAuth consent screen
2. Cliquez sur **PUBLISH APP**
3. Google demandera une vérification (peut prendre quelques jours)
4. Nécessite:
   - Politique de confidentialité
   - Conditions d'utilisation
   - Page d'accueil de l'app

**Recommandation**: Restez en mode Test si vous avez moins de 100 utilisateurs.

---

## Alternative: Utiliser un service tiers

Si la configuration Gmail API vous semble trop complexe, vous pouvez utiliser **EmailJS** (voir documentation précédente). C'est plus simple mais:
- Chaque utilisateur doit créer un compte EmailJS
- Configuration manuelle nécessaire
- Limites du plan gratuit: 200 emails/mois

---

## Support

Si vous rencontrez des problèmes:

1. **Vérifiez les logs**:
   ```bash
   firebase functions:log
   ```

2. **Vérifiez la console du navigateur** (F12)

3. **Consultez la documentation**:
   - [Gmail API Documentation](https://developers.google.com/gmail/api)
   - [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
   - [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

---

**Félicitations!** Vous pouvez maintenant envoyer vos factures automatiquement par email depuis votre propre compte Gmail! 🎉
