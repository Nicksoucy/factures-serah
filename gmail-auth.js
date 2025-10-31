// ==================== AUTHENTIFICATION GMAIL ====================

/**
 * Configuration Gmail OAuth
 * IMPORTANT: Ces valeurs doivent être remplacées par vos propres clés
 * depuis Google Cloud Console
 */
const GMAIL_CONFIG = {
    clientId: '317976995359-1avo57g6pb58os4sh22jj083pesk95bb.apps.googleusercontent.com',
    // Les scopes nécessaires pour envoyer des emails
    scopes: [
        'https://www.googleapis.com/auth/gmail.send'
    ],
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest']
};

class GmailAuthManager {
    constructor() {
        this.isInitialized = false;
        this.isAuthorized = false;
        this.connectBtn = null;
        this.statusElement = null;
    }

    /**
     * Initialiser l'API Google
     */
    async initialize() {
        if (this.isInitialized) return true;

        try {
            // Attendre que gapi soit chargé (max 10 secondes)
            if (!window.gapi) {
                console.log('Attente du chargement de Google API...');
                await this.waitForGapi(10000);
            }

            if (!window.gapi) {
                console.error('Google API non chargée après 10 secondes');
                return false;
            }

            console.log('Google API chargée, initialisation...');

            // Initialiser gapi
            await new Promise((resolve, reject) => {
                gapi.load('client:auth2', {
                    callback: resolve,
                    onerror: reject
                });
            });

            // Configurer le client OAuth
            await gapi.client.init({
                clientId: GMAIL_CONFIG.clientId,
                scope: GMAIL_CONFIG.scopes.join(' '),
                discoveryDocs: GMAIL_CONFIG.discoveryDocs
            });

            this.isInitialized = true;

            // Vérifier si déjà autorisé
            const authInstance = gapi.auth2.getAuthInstance();
            this.isAuthorized = authInstance.isSignedIn.get();

            // Écouter les changements d'état de connexion
            authInstance.isSignedIn.listen((isSignedIn) => {
                this.isAuthorized = isSignedIn;
                this.updateUI();
            });

            this.updateUI();
            return true;

        } catch (error) {
            console.error('Erreur lors de l\'initialisation de Gmail API:', error);
            return false;
        }
    }

    /**
     * Attendre que gapi soit chargé
     */
    waitForGapi(timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (window.gapi) {
                    clearInterval(checkInterval);
                    resolve(true);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    resolve(false);
                }
            }, 100);
        });
    }

    /**
     * Connecter l'utilisateur à Gmail
     */
    async connect() {
        if (!this.isInitialized) {
            const initialized = await this.initialize();
            if (!initialized) {
                alert('Erreur lors de l\'initialisation de Gmail. Vérifiez la configuration.');
                return false;
            }
        }

        try {
            const authInstance = gapi.auth2.getAuthInstance();

            if (!authInstance.isSignedIn.get()) {
                // Demander l'autorisation à l'utilisateur
                await authInstance.signIn({
                    prompt: 'consent' // Force l'affichage de l'écran de consentement
                });
            }

            // Obtenir le code d'autorisation
            const authCode = await authInstance.grantOfflineAccess();

            // Envoyer le code au backend pour l'échanger contre des tokens
            const exchangeGmailCode = firebase.functions().httpsCallable('exchangeGmailCode');
            const result = await exchangeGmailCode({ code: authCode.code });

            if (result.data.success) {
                this.isAuthorized = true;
                this.updateUI();
                alert('Gmail connecté avec succès! Vous pouvez maintenant envoyer des factures par email.');
                return true;
            }

        } catch (error) {
            console.error('Erreur lors de la connexion à Gmail:', error);
            alert('Erreur lors de la connexion à Gmail: ' + error.message);
            return false;
        }
    }

    /**
     * Déconnecter l'utilisateur de Gmail
     */
    async disconnect() {
        if (!this.isInitialized) return;

        try {
            const authInstance = gapi.auth2.getAuthInstance();
            await authInstance.signOut();

            // Supprimer les tokens du backend
            const userId = authManager.getUserId();
            if (userId) {
                await db.collection('users').doc(userId).update({
                    gmailTokens: firebase.firestore.FieldValue.delete(),
                    gmailConnectedAt: firebase.firestore.FieldValue.delete()
                });
            }

            this.isAuthorized = false;
            this.updateUI();
            alert('Gmail déconnecté.');

        } catch (error) {
            console.error('Erreur lors de la déconnexion de Gmail:', error);
        }
    }

    /**
     * Mettre à jour l'UI selon l'état de connexion
     */
    updateUI() {
        if (!this.connectBtn || !this.statusElement) return;

        if (this.isAuthorized) {
            this.connectBtn.textContent = '✓ Gmail Connecté';
            this.connectBtn.classList.add('connected');
            this.statusElement.textContent = 'Vous pouvez envoyer des factures par email';
            this.statusElement.style.color = '#27ae60';
        } else {
            this.connectBtn.textContent = 'Connecter Gmail';
            this.connectBtn.classList.remove('connected');
            this.statusElement.textContent = 'Gmail non connecté';
            this.statusElement.style.color = '#e74c3c';
        }
    }

    /**
     * Vérifier si Gmail est connecté
     */
    isConnected() {
        return this.isAuthorized;
    }

    /**
     * Définir les éléments UI
     */
    setUIElements(connectBtn, statusElement) {
        this.connectBtn = connectBtn;
        this.statusElement = statusElement;
        this.updateUI();
    }
}

/**
 * Classe pour gérer l'envoi d'emails
 */
class EmailSender {
    /**
     * Envoyer une facture par email
     */
    static async sendInvoice(invoice, pdfBlob) {
        // Vérifier que Gmail est connecté
        if (!window.gmailAuthManager || !window.gmailAuthManager.isConnected()) {
            if (confirm('Gmail n\'est pas connecté. Voulez-vous configurer la connexion maintenant?')) {
                // Basculer vers l'onglet Paramètres
                const tabManager = window.tabManager;
                if (tabManager) {
                    tabManager.switchTab('settings');
                }
            }
            return false;
        }

        try {
            // Convertir le PDF en base64
            const pdfBase64 = await this.blobToBase64(pdfBlob);

            // Construire le corps de l'email en HTML
            const htmlBody = this.buildEmailHTML(invoice);

            // Préparer les données pour la Cloud Function
            const emailData = {
                to: invoice.clientEmail,
                subject: `Facture #${invoice.invoiceNumber} - ${userProfile.name}`,
                htmlBody: htmlBody,
                pdfData: pdfBase64,
                pdfFileName: `Facture_${invoice.invoiceNumber}.pdf`
            };

            // Afficher un indicateur de chargement
            const loadingAlert = alert('Envoi de l\'email en cours...');

            // Appeler la Cloud Function
            const sendInvoiceEmail = firebase.functions().httpsCallable('sendInvoiceEmail');
            const result = await sendInvoiceEmail(emailData);

            if (result.data.success) {
                alert(`Email envoyé avec succès à ${invoice.clientEmail}!`);
                return true;
            }

        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email:', error);

            let errorMessage = 'Erreur lors de l\'envoi de l\'email.';

            if (error.code === 'permission-denied') {
                errorMessage = 'Les permissions Gmail ont expiré. Veuillez vous reconnecter dans les Paramètres.';
            } else if (error.message) {
                errorMessage += ' ' + error.message;
            }

            alert(errorMessage);
            return false;
        }
    }

    /**
     * Convertir un Blob en base64
     */
    static blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Extraire seulement la partie base64 (après la virgule)
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Construire le corps de l'email en HTML
     */
    static buildEmailHTML(invoice) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px;
        }
        .content {
            padding: 20px;
            background: #f9f9f9;
            margin-top: 20px;
            border-radius: 5px;
        }
        .invoice-details {
            background: white;
            padding: 15px;
            margin: 15px 0;
            border-left: 4px solid #3498db;
        }
        .total {
            font-size: 24px;
            color: #27ae60;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #777;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Facture de ${userProfile.name}</h1>
    </div>

    <div class="content">
        <p>Bonjour ${invoice.clientName},</p>

        <p>Veuillez trouver ci-joint votre facture pour les services fournis.</p>

        <div class="invoice-details">
            <p><strong>Numéro de facture:</strong> #${invoice.invoiceNumber}</p>
            <p><strong>Date d'émission:</strong> ${this.formatDate(invoice.date)}</p>
            ${invoice.dueDate ? `<p><strong>Date d'échéance:</strong> ${this.formatDate(invoice.dueDate)}</p>` : ''}
            <p class="total">Total: ${invoice.total.toFixed(2)} $</p>
        </div>

        <p><strong>Modalités de paiement:</strong></p>
        <p>Paiement par: ${userProfile.paymentMethod}</p>
        <p>Envoyer à: ${userProfile.email}</p>

        <p>Si vous avez des questions concernant cette facture, n'hésitez pas à me contacter.</p>

        <p>Cordialement,<br>
        ${userProfile.name}<br>
        ${userProfile.email}<br>
        ${userProfile.phone}</p>
    </div>

    <div class="footer">
        <p>Cet email a été généré automatiquement par le système de facturation.</p>
    </div>
</body>
</html>
        `;
    }

    /**
     * Formater une date
     */
    static formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('fr-CA', options);
    }
}

// Initialiser le gestionnaire Gmail au chargement
let gmailAuthManager;
document.addEventListener('DOMContentLoaded', () => {
    gmailAuthManager = new GmailAuthManager();
    window.gmailAuthManager = gmailAuthManager;
});
