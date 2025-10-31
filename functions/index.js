const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

admin.initializeApp();

/**
 * Cloud Function pour envoyer des emails via Gmail API
 * Utilise les tokens OAuth stockés dans Firestore pour chaque utilisateur
 */
exports.sendInvoiceEmail = functions.https.onCall(async (data, context) => {
    // Vérifier que l'utilisateur est authentifié
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'L\'utilisateur doit être connecté pour envoyer des emails.'
        );
    }

    const userId = context.auth.uid;
    const { to, subject, htmlBody, pdfData, pdfFileName } = data;

    // Valider les paramètres
    if (!to || !subject || !htmlBody) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Les paramètres to, subject et htmlBody sont requis.'
        );
    }

    try {
        // Récupérer les tokens OAuth de l'utilisateur depuis Firestore
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(userId)
            .get();

        const userData = userDoc.data();

        if (!userData || !userData.gmailTokens) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Vous devez d\'abord autoriser l\'accès à Gmail dans les Paramètres.'
            );
        }

        const tokens = userData.gmailTokens;

        // Configurer OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            functions.config().gmail.client_id,
            functions.config().gmail.client_secret,
            functions.config().gmail.redirect_uri
        );

        oauth2Client.setCredentials(tokens);

        // Vérifier si le token doit être rafraîchi
        if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
            const { credentials } = await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials(credentials);

            // Sauvegarder les nouveaux tokens
            await admin.firestore()
                .collection('users')
                .doc(userId)
                .update({
                    gmailTokens: credentials
                });
        }

        // Créer le client Gmail
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Construire l'email au format RFC 2822
        const boundary = 'boundary_' + Date.now();
        let emailBody = [
            'Content-Type: multipart/mixed; boundary="' + boundary + '"',
            'MIME-Version: 1.0',
            'To: ' + to,
            'Subject: ' + subject,
            '',
            '--' + boundary,
            'Content-Type: text/html; charset="UTF-8"',
            'MIME-Version: 1.0',
            'Content-Transfer-Encoding: 7bit',
            '',
            htmlBody,
            ''
        ];

        // Ajouter le PDF en pièce jointe si fourni
        if (pdfData && pdfFileName) {
            emailBody.push('--' + boundary);
            emailBody.push('Content-Type: application/pdf; name="' + pdfFileName + '"');
            emailBody.push('MIME-Version: 1.0');
            emailBody.push('Content-Transfer-Encoding: base64');
            emailBody.push('Content-Disposition: attachment; filename="' + pdfFileName + '"');
            emailBody.push('');
            emailBody.push(pdfData);
            emailBody.push('');
        }

        emailBody.push('--' + boundary + '--');

        // Encoder l'email en base64url
        const encodedEmail = Buffer.from(emailBody.join('\n'))
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // Envoyer l'email
        const result = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedEmail
            }
        });

        return {
            success: true,
            messageId: result.data.id
        };

    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'email:', error);

        // Gérer les différentes erreurs
        if (error.code === 401) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Les permissions Gmail ont expiré. Veuillez vous reconnecter dans les Paramètres.'
            );
        }

        throw new functions.https.HttpsError(
            'internal',
            'Erreur lors de l\'envoi de l\'email: ' + error.message
        );
    }
});

/**
 * Endpoint pour échanger le code OAuth contre des tokens
 * Appelé depuis le frontend après l'autorisation Google
 */
exports.exchangeGmailCode = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'L\'utilisateur doit être connecté.'
        );
    }

    const userId = context.auth.uid;
    const { code } = data;

    if (!code) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Le code d\'autorisation est requis.'
        );
    }

    try {
        // Configurer OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            functions.config().gmail.client_id,
            functions.config().gmail.client_secret,
            functions.config().gmail.redirect_uri
        );

        // Échanger le code contre des tokens
        const { tokens } = await oauth2Client.getToken(code);

        // Sauvegarder les tokens dans Firestore
        await admin.firestore()
            .collection('users')
            .doc(userId)
            .set({
                gmailTokens: tokens,
                gmailConnectedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

        return {
            success: true,
            message: 'Gmail connecté avec succès!'
        };

    } catch (error) {
        console.error('Erreur lors de l\'échange du code:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Erreur lors de la connexion à Gmail: ' + error.message
        );
    }
});
