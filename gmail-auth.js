// ==================== AUTHENTIFICATION GMAIL ====================

/**
 * Configuration Gmail OAuth avec la nouvelle Google Identity Services API
 */
const GMAIL_CONFIG = {
    clientId: '317976995359-1avo57g6pb58os4sh22jj083pesk95bb.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/gmail.send'
};

class GmailAuthManager {
    constructor() {
        this.isInitialized = false;
        this.isAuthorized = false;
        this.tokenClient = null;
        this.accessToken = null;
        this.connectBtn = null;
        this.statusElement = null;
    }

    /**
     * Initialiser Google Identity Services
     */
    async initialize() {
        if (this.isInitialized) return true;

        try {
            // Attendre que google.accounts soit chargé
            if (!window.google?.accounts?.oauth2) {
                console.log('Attente du chargement de Google Identity Services...');
                await this.waitForGoogleIdentity(10000);
            }

            if (!window.google?.accounts?.oauth2) {
                console.error('Google Identity Services non chargé après 10 secondes');
                return false;
            }

            console.log('Google Identity Services chargé, initialisation...');

            // Créer le token client
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GMAIL_CONFIG.clientId,
                scope: GMAIL_CONFIG.scope,
                callback: async (response) => {
                    if (response.error !== undefined) {
                        console.error('Erreur OAuth:', response);
                        alert('Erreur lors de la connexion à Gmail: ' + response.error);
                        return;
                    }

                    console.log('Token OAuth reçu');
                    this.accessToken = response.access_token;

                    // Sauvegarder le token dans Firestore via Firebase Function
                    await this.saveTokenToFirestore(response);

                    this.isAuthorized = true;
                    this.updateUI();
                    alert('Gmail connecté avec succès!');
                },
            });

            this.isInitialized = true;

            // Vérifier si on a déjà un token sauvegardé
            await this.checkExistingToken();

            return true;

        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            return false;
        }
    }

    /**
     * Attendre que google.accounts soit chargé
     */
    waitForGoogleIdentity(timeout = 10000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (window.google?.accounts?.oauth2) {
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
     * Vérifier si l'utilisateur a déjà un token Gmail dans Firestore
     */
    async checkExistingToken() {
        try {
            const userId = authManager?.getUserId();
            if (!userId) return;

            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();

            if (userData && userData.gmailTokens) {
                this.isAuthorized = true;
                this.updateUI();
            }
        } catch (error) {
            console.error('Erreur lors de la vérification du token:', error);
        }
    }

    /**
     * Sauvegarder le token dans Firestore
     */
    async saveTokenToFirestore(tokenResponse) {
        try {
            const userId = authManager?.getUserId();
            if (!userId) {
                console.error('Utilisateur non connecté');
                return;
            }

            // Sauvegarder le token dans Firestore
            await db.collection('users').doc(userId).set({
                gmailTokens: {
                    access_token: tokenResponse.access_token,
                    expires_in: tokenResponse.expires_in,
                    token_type: tokenResponse.token_type,
                    scope: tokenResponse.scope,
                    received_at: Date.now()
                },
                gmailConnectedAt: new Date().toISOString()
            }, { merge: true });

            console.log('Token Gmail sauvegardé dans Firestore');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du token:', error);
        }
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
            // Demander l'autorisation à l'utilisateur
            console.log('Demande d\'autorisation Gmail...');
            this.tokenClient.requestAccessToken({ prompt: 'consent' });
            return true;

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
        try {
            // Révoquer le token
            if (this.accessToken) {
                google.accounts.oauth2.revoke(this.accessToken, () => {
                    console.log('Token révoqué');
                });
            }

            // Supprimer les tokens du Firestore
            const userId = authManager?.getUserId();
            if (userId) {
                await db.collection('users').doc(userId).update({
                    gmailTokens: firebase.firestore.FieldValue.delete(),
                    gmailConnectedAt: firebase.firestore.FieldValue.delete()
                });
            }

            this.accessToken = null;
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
                    tabManager.switchTab('parametres');
                }
            }
            return false;
        }

        // Vérifier qu'on a un access token
        if (!window.gmailAuthManager.accessToken) {
            // Demander un nouveau token
            alert('Votre session Gmail a expiré. Reconnectez-vous.');
            await window.gmailAuthManager.connect();
            return false;
        }

        try {
            // Convertir le PDF en base64
            const pdfBase64 = await this.blobToBase64(pdfBlob);

            // Construire le corps de l'email en HTML
            const htmlBody = this.buildEmailHTML(invoice);

            // Construire l'email au format RFC 2822
            const boundary = 'boundary_' + Date.now();
            const subject = `Facture #${invoice.invoiceNumber} - ${userProfile.name}`;
            const pdfFileName = `Facture_${invoice.invoiceNumber}.pdf`;

            let emailBody = [
                'Content-Type: multipart/mixed; boundary="' + boundary + '"',
                'MIME-Version: 1.0',
                'From: ' + userProfile.email,
                'To: ' + invoice.clientEmail,
                'Subject: =?UTF-8?B?' + btoa(unescape(encodeURIComponent(subject))) + '?=',
                '',
                '--' + boundary,
                'Content-Type: text/html; charset="UTF-8"',
                'MIME-Version: 1.0',
                'Content-Transfer-Encoding: 7bit',
                '',
                htmlBody,
                '',
                '--' + boundary,
                'Content-Type: application/pdf; name="' + pdfFileName + '"',
                'MIME-Version: 1.0',
                'Content-Transfer-Encoding: base64',
                'Content-Disposition: attachment; filename="' + pdfFileName + '"',
                '',
                pdfBase64,
                '',
                '--' + boundary + '--'
            ].join('\n');

            // Encoder l'email en base64url
            const encodedEmail = btoa(unescape(encodeURIComponent(emailBody)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            // Envoyer via Gmail API
            const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + window.gmailAuthManager.accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    raw: encodedEmail
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error.message || 'Erreur lors de l\'envoi');
            }

            alert(`Email envoyé avec succès à ${invoice.clientEmail}!`);
            return true;

        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email:', error);

            let errorMessage = 'Erreur lors de l\'envoi de l\'email.';

            if (error.message.includes('401') || error.message.includes('invalid_grant')) {
                errorMessage = 'Votre session Gmail a expiré. Veuillez vous reconnecter dans les Paramètres.';
                window.gmailAuthManager.isAuthorized = false;
                window.gmailAuthManager.accessToken = null;
                window.gmailAuthManager.updateUI();
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

// Exposer EmailSender globalement
window.EmailSender = EmailSender;

// Initialiser le gestionnaire Gmail au chargement
let gmailAuthManager;
document.addEventListener('DOMContentLoaded', () => {
    gmailAuthManager = new GmailAuthManager();
    window.gmailAuthManager = gmailAuthManager;
});
