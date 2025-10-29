// ==================== GESTION DE L'AUTHENTIFICATION ====================

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.modal = document.getElementById('auth-modal');
        this.authForm = document.getElementById('auth-form');
        this.authError = document.getElementById('auth-error');
        this.loginBtn = document.getElementById('login-btn');
        this.registerBtn = document.getElementById('register-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.userInfo = document.getElementById('user-info');
        this.userEmail = document.getElementById('user-email');
        this.userBadge = document.getElementById('user-badge');
        this.userBadgeEmail = document.getElementById('user-badge-email');
        this.userMenuBtn = document.getElementById('user-menu-btn');

        this.setupEventListeners();
        this.checkAuthState();
    }

    setupEventListeners() {
        // Formulaire de connexion
        this.authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Bouton inscription
        this.registerBtn.addEventListener('click', () => this.register());

        // Bouton déconnexion
        this.logoutBtn.addEventListener('click', () => this.logout());

        // Bouton menu utilisateur
        this.userMenuBtn.addEventListener('click', () => this.showModal());
    }

    checkAuthState() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.onUserLoggedIn(user);
            } else {
                this.currentUser = null;
                this.onUserLoggedOut();
            }
        });
    }

    async login() {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        this.authError.textContent = '';
        this.loginBtn.disabled = true;
        this.loginBtn.textContent = 'Connexion...';

        try {
            await auth.signInWithEmailAndPassword(email, password);
            this.hideModal();
            this.authForm.reset();
        } catch (error) {
            this.showError(this.getErrorMessage(error.code));
        } finally {
            this.loginBtn.disabled = false;
            this.loginBtn.textContent = 'Se connecter';
        }
    }

    async register() {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        if (!email || !password) {
            this.showError('Veuillez remplir tous les champs');
            return;
        }

        if (password.length < 6) {
            this.showError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        this.authError.textContent = '';
        this.registerBtn.disabled = true;
        this.registerBtn.textContent = 'Création...';

        try {
            await auth.createUserWithEmailAndPassword(email, password);
            this.hideModal();
            this.authForm.reset();
            alert('Compte créé avec succès! Vous êtes maintenant connecté.');
        } catch (error) {
            this.showError(this.getErrorMessage(error.code));
        } finally {
            this.registerBtn.disabled = false;
            this.registerBtn.textContent = 'Créer un compte';
        }
    }

    async logout() {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter?')) {
            try {
                await auth.signOut();
                this.hideModal();
            } catch (error) {
                alert('Erreur lors de la déconnexion: ' + error.message);
            }
        }
    }

    onUserLoggedIn(user) {
        // Masquer le formulaire, afficher les infos utilisateur
        this.authForm.style.display = 'none';
        this.userInfo.style.display = 'block';
        this.userEmail.textContent = user.email;

        // Afficher le badge utilisateur dans le header
        this.userBadge.style.display = 'flex';
        this.userBadgeEmail.textContent = user.email;

        // Cacher le modal
        this.hideModal();

        // Notifier les autres composants
        if (window.invoiceManager) {
            window.invoiceManager.renderList();
        }
        if (window.expenseManager) {
            window.expenseManager.renderList();
            window.expenseManager.updateTotal();
        }

        console.log('Utilisateur connecté:', user.email);
    }

    onUserLoggedOut() {
        // Afficher le formulaire, masquer les infos utilisateur
        this.authForm.style.display = 'block';
        this.userInfo.style.display = 'none';

        // Masquer le badge utilisateur
        this.userBadge.style.display = 'none';

        // Afficher le modal de connexion
        this.showModal();

        console.log('Utilisateur déconnecté');
    }

    showModal() {
        this.modal.classList.remove('hidden');
        this.modal.style.display = 'flex';
    }

    hideModal() {
        this.modal.classList.add('hidden');
        setTimeout(() => {
            this.modal.style.display = 'none';
        }, 300);
    }

    showError(message) {
        this.authError.textContent = message;
    }

    getErrorMessage(code) {
        const messages = {
            'auth/invalid-email': 'Adresse email invalide',
            'auth/user-disabled': 'Ce compte a été désactivé',
            'auth/user-not-found': 'Aucun compte trouvé avec cet email',
            'auth/wrong-password': 'Mot de passe incorrect',
            'auth/email-already-in-use': 'Cet email est déjà utilisé',
            'auth/weak-password': 'Le mot de passe est trop faible',
            'auth/network-request-failed': 'Erreur de connexion réseau',
            'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard',
            'auth/invalid-credential': 'Email ou mot de passe incorrect'
        };

        return messages[code] || 'Une erreur est survenue: ' + code;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }
}

// Initialiser l'authentification au chargement
let authManager;
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
});
