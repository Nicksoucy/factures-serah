# Application de Facturation - Serah Kong

Application web de gestion de factures et dépenses pour Serah Kong, instructrice de Jiu-Jitsu.

## Fonctionnalités

### Gestion des Factures
- Création de factures avec jusqu'à 6 sessions
- Génération automatique de PDF professionnels
- Numérotation automatique et incrémentale des factures
- Sauvegarde de brouillons
- Liste des factures sauvegardées
- Export Excel de toutes les factures

### Gestion des Dépenses
- Ajout de dépenses avec catégorisation
- Upload de photos de reçus
- Visualisation des photos en plein écran
- Calcul automatique du total des dépenses
- Export Excel des dépenses

### Autres Fonctionnalités
- Sauvegarde automatique dans le navigateur (localStorage)
- Interface responsive (mobile, tablette, desktop)
- Design moderne et intuitif
- Aucun serveur requis

## Technologies Utilisées

- **HTML5/CSS3** - Structure et design
- **JavaScript Vanilla** - Logique applicative
- **jsPDF** - Génération de PDF
- **SheetJS (XLSX)** - Export Excel
- **LocalStorage** - Persistance des données

## Installation Locale

1. Téléchargez tous les fichiers du projet
2. Ouvrez `index.html` dans votre navigateur
3. C'est tout! Aucune installation supplémentaire requise

## Déploiement sur GitHub Pages

### Méthode 1: Via l'interface GitHub

1. Créez un nouveau repository sur GitHub
2. Uploadez tous les fichiers du projet:
   - `index.html`
   - `style.css`
   - `app.js`
   - `README.md`

3. Allez dans les paramètres du repository (Settings)
4. Dans le menu latéral, cliquez sur "Pages"
5. Sous "Source", sélectionnez la branche `main` et le dossier `/ (root)`
6. Cliquez sur "Save"
7. Attendez quelques minutes, votre site sera accessible à: `https://[votre-username].github.io/[nom-du-repo]`

### Méthode 2: Via Git en ligne de commande

```bash
# Initialiser Git dans le dossier du projet
cd factures-serah
git init

# Ajouter tous les fichiers
git add .

# Créer le premier commit
git commit -m "Initial commit - Application de facturation"

# Créer un repository sur GitHub, puis:
git remote add origin https://github.com/[votre-username]/[nom-du-repo].git
git branch -M main
git push -u origin main

# Activer GitHub Pages
# Aller sur GitHub > Repository Settings > Pages
# Sélectionner la branche 'main' et dossier '/ (root)'
```

## Utilisation

### Créer une Facture

1. Allez dans l'onglet "Factures"
2. Remplissez les informations du client
3. Ajoutez les sessions (date + montant)
4. Cliquez sur "Générer Facture PDF"
5. Le PDF sera automatiquement téléchargé

### Sauvegarder un Brouillon

1. Remplissez les informations de base
2. Cliquez sur "Sauvegarder Brouillon"
3. Le brouillon apparaîtra dans la liste des factures

### Ajouter une Dépense

1. Allez dans l'onglet "Dépenses"
2. Remplissez les informations
3. Optionnel: ajoutez une photo du reçu
4. Cliquez sur "Ajouter Dépense"

### Exporter vers Excel

- Pour les factures: cliquez sur "Export Excel" dans la section factures
- Pour les dépenses: cliquez sur "Export Excel" dans la section dépenses
- Le fichier Excel sera téléchargé automatiquement

## Informations de Facturation

Les factures générées incluent automatiquement:

- **Nom**: Serah Kong
- **Adresse**: 1709 rue des Pommiers, Pincourt QC J7W 0A5
- **Téléphone**: 514-947-2561
- **Email**: serah_k@hotmail.com
- **Modalité de paiement**: Virement Interac

## Stockage des Données

Toutes les données sont sauvegardées localement dans le navigateur via localStorage:
- Pas de serveur requis
- Les données persistent entre les sessions
- Les données sont privées et restent sur votre appareil

**Important**: Les données sont liées au navigateur utilisé. Si vous changez de navigateur ou d'appareil, vous devrez exporter vos données via Excel pour les transférer.

## Compatibilité

- Chrome/Edge (version récente)
- Firefox (version récente)
- Safari (version récente)
- Mobile: iOS Safari, Chrome Android

## Support

Pour toute question ou problème, contactez le développeur.

## Licence

Application développée pour un usage personnel par Serah Kong.

---

**Dernière mise à jour**: 2025

**Version**: 1.0.0
