// ==================== CONFIGURATION ====================
// Profil utilisateur chargé dynamiquement depuis Firebase
let userProfile = null;

// ==================== STOCKAGE FIREBASE ====================
class Storage {
    static getUserId() {
        return authManager?.getUserId();
    }

    static getUserCollection(collectionName) {
        const userId = this.getUserId();
        if (!userId) {
            throw new Error('Utilisateur non connecté');
        }
        return db.collection('users').doc(userId).collection(collectionName);
    }

    // FACTURES
    static async getInvoices() {
        try {
            const snapshot = await this.getUserCollection('invoices')
                .orderBy('createdAt', 'desc')
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Erreur lors de la récupération des factures:', error);
            return [];
        }
    }

    static async addInvoice(invoice) {
        try {
            const userId = this.getUserId();
            invoice.userId = userId;
            await this.getUserCollection('invoices').add(invoice);
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la facture:', error);
            throw error;
        }
    }

    static async deleteInvoice(id) {
        try {
            await this.getUserCollection('invoices').doc(id).delete();
        } catch (error) {
            console.error('Erreur lors de la suppression de la facture:', error);
            throw error;
        }
    }

    // DÉPENSES
    static async getExpenses() {
        try {
            const snapshot = await this.getUserCollection('expenses')
                .orderBy('createdAt', 'desc')
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Erreur lors de la récupération des dépenses:', error);
            return [];
        }
    }

    static async addExpense(expense) {
        try {
            const userId = this.getUserId();
            expense.userId = userId;
            await this.getUserCollection('expenses').add(expense);
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la dépense:', error);
            throw error;
        }
    }

    static async deleteExpense(id) {
        try {
            await this.getUserCollection('expenses').doc(id).delete();
        } catch (error) {
            console.error('Erreur lors de la suppression de la dépense:', error);
            throw error;
        }
    }

    // NUMÉROTATION DES FACTURES
    static async getInvoiceNumber() {
        try {
            const userId = this.getUserId();
            const counterDoc = await db.collection('users').doc(userId).get();
            const data = counterDoc.data();
            return data?.invoiceNumber || 1000;
        } catch (error) {
            console.error('Erreur lors de la récupération du numéro de facture:', error);
            return 1000;
        }
    }

    static async incrementInvoiceNumber() {
        try {
            const userId = this.getUserId();
            const userDoc = db.collection('users').doc(userId);

            // Utiliser une transaction pour éviter les doublons
            return await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(userDoc);
                const currentNumber = doc.data()?.invoiceNumber || 1000;
                const nextNumber = currentNumber + 1;

                transaction.set(userDoc, { invoiceNumber: nextNumber }, { merge: true });
                return currentNumber;
            });
        } catch (error) {
            console.error('Erreur lors de l\'incrémentation du numéro de facture:', error);
            return Date.now(); // Fallback sur timestamp si erreur
        }
    }

    // PROFIL UTILISATEUR
    static async getProfile() {
        try {
            const userId = this.getUserId();
            const profileDoc = await db.collection('users').doc(userId).get();
            return profileDoc.data()?.profile || null;
        } catch (error) {
            console.error('Erreur lors de la récupération du profil:', error);
            return null;
        }
    }

    static async saveProfile(profile) {
        try {
            const userId = this.getUserId();
            await db.collection('users').doc(userId).set({
                profile: profile,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            return true;
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du profil:', error);
            throw error;
        }
    }

    // CLIENTS
    static async getClients() {
        try {
            const snapshot = await this.getUserCollection('clients')
                .orderBy('name')
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Erreur lors de la récupération des clients:', error);
            return [];
        }
    }

    static async addClient(client) {
        try {
            const userId = this.getUserId();

            // Vérifier si le client existe déjà (par email)
            const existingClients = await this.getUserCollection('clients')
                .where('email', '==', client.email)
                .get();

            if (!existingClients.empty) {
                // Mettre à jour le client existant
                const existingClient = existingClients.docs[0];
                await existingClient.ref.update({
                    ...client,
                    updatedAt: new Date().toISOString()
                });
                return existingClient.id;
            } else {
                // Créer un nouveau client
                client.userId = userId;
                client.createdAt = new Date().toISOString();
                const docRef = await this.getUserCollection('clients').add(client);
                return docRef.id;
            }
        } catch (error) {
            console.error('Erreur lors de l\'ajout du client:', error);
            throw error;
        }
    }

    static async deleteClient(id) {
        try {
            await this.getUserCollection('clients').doc(id).delete();
        } catch (error) {
            console.error('Erreur lors de la suppression du client:', error);
            throw error;
        }
    }
}

// ==================== GESTION DES SESSIONS ====================
class SessionManager {
    constructor() {
        this.sessions = [];
        this.container = document.getElementById('sessions-container');
        this.addButton = document.getElementById('add-session-btn');
        this.subtotalElement = document.getElementById('invoice-subtotal');
        this.tpsElement = document.getElementById('invoice-tps');
        this.tvqElement = document.getElementById('invoice-tvq');
        this.totalElement = document.getElementById('invoice-total');
        this.tpsLine = document.getElementById('tps-line');
        this.tvqLine = document.getElementById('tvq-line');
        this.tpsRateDisplay = document.getElementById('tps-rate-display');
        this.tvqRateDisplay = document.getElementById('tvq-rate-display');

        this.addButton.addEventListener('click', () => this.addSession());
        this.addSession(); // Ajouter une première session par défaut
    }

    addSession() {
        const sessionId = Date.now();
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'session-item';
        sessionDiv.dataset.id = sessionId;
        sessionDiv.innerHTML = `
            <div class="form-group">
                <label>Date:</label>
                <input type="date" class="session-date" required>
            </div>
            <div class="form-group">
                <label>Description:</label>
                <input type="text" class="session-description" placeholder="Ex: Cours du 15 janvier, Session privée...">
            </div>
            <div class="form-group">
                <label>Montant ($):</label>
                <input type="number" class="session-amount" step="0.01" min="0" required>
            </div>
            <button type="button" class="btn-remove" onclick="sessionManager.removeSession(${sessionId})">✕</button>
        `;

        this.container.appendChild(sessionDiv);
        this.sessions.push(sessionId);

        // Ajouter event listeners pour calculer le total
        const amountInput = sessionDiv.querySelector('.session-amount');
        amountInput.addEventListener('input', () => this.updateTotal());
    }

    removeSession(sessionId) {
        const sessionDiv = this.container.querySelector(`[data-id="${sessionId}"]`);
        if (sessionDiv) {
            sessionDiv.remove();
            this.sessions = this.sessions.filter(id => id !== sessionId);
            this.updateTotal();
        }
    }

    updateTotal() {
        const amounts = Array.from(this.container.querySelectorAll('.session-amount'))
            .map(input => parseFloat(input.value) || 0);
        const subtotal = amounts.reduce((sum, amount) => sum + amount, 0);

        // Afficher le sous-total
        this.subtotalElement.textContent = subtotal.toFixed(2) + ' $';

        // Calculer et afficher les taxes si activées
        let tpsAmount = 0;
        let tvqAmount = 0;
        let total = subtotal;

        if (userProfile && userProfile.enableTaxes) {
            // Afficher les lignes de taxes
            this.tpsLine.style.display = 'flex';
            this.tvqLine.style.display = 'flex';

            // Mettre à jour les taux affichés
            this.tpsRateDisplay.textContent = userProfile.tpsRate || 5;
            this.tvqRateDisplay.textContent = userProfile.tvqRate || 9.975;

            // Calculer les montants de taxes
            tpsAmount = subtotal * (userProfile.tpsRate / 100);
            tvqAmount = subtotal * (userProfile.tvqRate / 100);
            total = subtotal + tpsAmount + tvqAmount;

            // Afficher les montants
            this.tpsElement.textContent = tpsAmount.toFixed(2) + ' $';
            this.tvqElement.textContent = tvqAmount.toFixed(2) + ' $';
        } else {
            // Masquer les lignes de taxes
            this.tpsLine.style.display = 'none';
            this.tvqLine.style.display = 'none';
        }

        this.totalElement.textContent = total.toFixed(2) + ' $';

        return {
            subtotal,
            tpsAmount,
            tvqAmount,
            total
        };
    }

    getSessions() {
        return Array.from(this.container.querySelectorAll('.session-item')).map(div => ({
            date: div.querySelector('.session-date').value,
            description: div.querySelector('.session-description').value,
            amount: parseFloat(div.querySelector('.session-amount').value) || 0
        }));
    }

    reset() {
        this.container.innerHTML = '';
        this.sessions = [];
        this.addSession();
        this.updateTotal();
    }
}

// ==================== GÉNÉRATION PDF ====================
class PDFGenerator {
    static async generateInvoice(invoiceData) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Vérifier que le profil est chargé
        if (!userProfile) {
            alert('Erreur: Profil utilisateur non configuré. Veuillez configurer votre profil dans l\'onglet Paramètres.');
            return;
        }

        // En-tête avec informations de l'utilisateur
        doc.setFillColor(44, 62, 80);
        doc.rect(0, 0, 210, 45, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text(userProfile.name, 15, 20);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(userProfile.address, 15, 28);
        doc.text(`Tél: ${userProfile.phone}`, 15, 34);
        doc.text(`Email: ${userProfile.email}`, 15, 40);

        // Numéro de facture et date
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Facture #${invoiceData.invoiceNumber}`, 150, 20);
        doc.setFont(undefined, 'normal');
        doc.text(`Date: ${this.formatDate(invoiceData.date)}`, 150, 27);

        // Date d'échéance
        if (invoiceData.dueDate) {
            doc.setFont(undefined, 'bold');
            doc.text(`Échéance: ${this.formatDate(invoiceData.dueDate)}`, 150, 34);
        }

        // Informations client
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Facturé à:', 15, 60);

        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(invoiceData.clientName, 15, 68);
        doc.text(invoiceData.clientEmail, 15, 74);

        // Tableau des sessions
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(userProfile.serviceLabel || 'Services', 15, 90);

        // En-tête du tableau
        doc.setFillColor(52, 152, 219);
        doc.rect(15, 95, 180, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('Date', 20, 102);
        doc.text('Description', 60, 102);
        doc.text('Montant', 165, 102);

        // Lignes du tableau
        doc.setTextColor(0, 0, 0);
        let yPos = 112;
        invoiceData.sessions.forEach((session, index) => {
            const bgColor = index % 2 === 0 ? [245, 246, 250] : [255, 255, 255];
            doc.setFillColor(...bgColor);
            doc.rect(15, yPos - 7, 180, 10, 'F');

            doc.text(this.formatDate(session.date), 20, yPos);

            // Afficher la description si elle existe
            if (session.description) {
                // Tronquer la description si elle est trop longue
                const maxDescLength = 50;
                const description = session.description.length > maxDescLength
                    ? session.description.substring(0, maxDescLength) + '...'
                    : session.description;
                doc.text(description, 60, yPos);
            }

            doc.text(`${session.amount.toFixed(2)} $`, 165, yPos);
            yPos += 10;
        });

        // Sous-total, taxes et total
        yPos += 10;

        // Sous-total
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Sous-total:', 130, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(`${invoiceData.subtotal.toFixed(2)} $`, 165, yPos);

        // TPS (si activée)
        if (invoiceData.taxesEnabled && invoiceData.tpsAmount > 0) {
            yPos += 8;
            doc.setFont(undefined, 'normal');
            doc.text(`TPS (${invoiceData.tpsRate}%):`, 130, yPos);
            doc.text(`${invoiceData.tpsAmount.toFixed(2)} $`, 165, yPos);

            // Afficher le numéro de TPS si disponible
            if (invoiceData.tpsNumber) {
                yPos += 6;
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text(`# TPS: ${invoiceData.tpsNumber}`, 130, yPos);
                doc.setFontSize(11);
                doc.setTextColor(0, 0, 0);
            }
        }

        // TVQ (si activée)
        if (invoiceData.taxesEnabled && invoiceData.tvqAmount > 0) {
            yPos += 8;
            doc.setFont(undefined, 'normal');
            doc.text(`TVQ (${invoiceData.tvqRate}%):`, 130, yPos);
            doc.text(`${invoiceData.tvqAmount.toFixed(2)} $`, 165, yPos);

            // Afficher le numéro de TVQ si disponible
            if (invoiceData.tvqNumber) {
                yPos += 6;
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text(`# TVQ: ${invoiceData.tvqNumber}`, 130, yPos);
                doc.setFontSize(11);
                doc.setTextColor(0, 0, 0);
            }
        }

        // Total final
        yPos += 12;
        doc.setFillColor(39, 174, 96);
        doc.rect(15, yPos - 7, 180, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('TOTAL', 20, yPos);
        doc.text(`${invoiceData.total.toFixed(2)} $`, 165, yPos);

        // Modalités de paiement
        yPos += 25;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Modalités de paiement:', 15, yPos);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`Paiement par: ${userProfile.paymentMethod}`, 15, yPos + 7);
        doc.text(`Envoyer à: ${userProfile.email}`, 15, yPos + 14);

        // Pied de page
        doc.setFontSize(9);
        doc.setTextColor(127, 140, 141);
        doc.text('Merci pour votre confiance!', 105, 280, { align: 'center' });

        // Sauvegarder le PDF
        doc.save(`Facture_${invoiceData.invoiceNumber}_${invoiceData.clientName.replace(/\s/g, '_')}.pdf`);
    }

    static formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('fr-CA', options);
    }
}

// ==================== GESTION DES FACTURES ====================
class InvoiceManager {
    constructor() {
        this.form = document.getElementById('invoice-form');
        this.listContainer = document.getElementById('invoices-list');
        this.allInvoices = [];
        this.searchInput = document.getElementById('invoice-search');
        this.periodFilter = document.getElementById('invoice-period-filter');
        this.sortSelect = document.getElementById('invoice-sort');
        this.countBadge = document.getElementById('invoice-count');

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('save-draft-btn').addEventListener('click', () => this.saveDraft());
        document.getElementById('export-excel-invoices-btn').addEventListener('click', () => this.exportToExcel());

        // Événements pour recherche et filtres
        this.searchInput.addEventListener('input', () => this.renderList());
        this.periodFilter.addEventListener('change', () => this.renderList());
        this.sortSelect.addEventListener('change', () => this.renderList());

        this.setupClientInputs();
        this.renderList();
    }

    setupClientInputs() {
        const clientSelect = document.getElementById('client-select');
        const clientFields = document.getElementById('client-fields');
        const clientName = document.getElementById('client-name');
        const clientEmail = document.getElementById('client-email');

        clientSelect.addEventListener('change', () => {
            const selectedValue = clientSelect.value;

            if (selectedValue === 'new' || selectedValue === '') {
                // Nouveau client ou aucune sélection
                clientFields.style.display = 'block';
                clientName.value = '';
                clientEmail.value = '';
                clientName.required = true;
                clientEmail.required = true;
            } else {
                // Client existant sélectionné
                const selectedOption = clientSelect.options[clientSelect.selectedIndex];
                clientName.value = selectedOption.dataset.name;
                clientEmail.value = selectedOption.dataset.email;
                clientFields.style.display = 'block';
                clientName.required = true;
                clientEmail.required = true;
            }
        });

        // Afficher les champs au chargement si "Nouveau client" est sélectionné
        if (clientSelect.value === 'new') {
            clientFields.style.display = 'block';
        }
    }

    getClientName() {
        return document.getElementById('client-name').value;
    }

    getClientEmail() {
        return document.getElementById('client-email').value;
    }

    calculateDueDate(invoiceDate) {
        const date = new Date(invoiceDate + 'T00:00:00');
        date.setDate(date.getDate() + 30); // Ajouter 30 jours
        return date.toISOString().split('T')[0];
    }

    async handleSubmit(e) {
        e.preventDefault();

        const clientName = this.getClientName();
        const clientEmail = this.getClientEmail();
        const date = document.getElementById('invoice-date').value;
        let dueDate = document.getElementById('invoice-due-date').value;

        // Si pas de date d'échéance, calculer automatiquement (+30 jours)
        if (!dueDate) {
            dueDate = this.calculateDueDate(date);
        }

        const sessions = sessionManager.getSessions();

        if (sessions.length === 0) {
            alert('Veuillez ajouter au moins une ligne de facturation');
            return;
        }

        if (sessions.some(s => !s.date || s.amount <= 0)) {
            alert('Veuillez remplir toutes les lignes avec des valeurs valides');
            return;
        }

        const totals = sessionManager.updateTotal();
        const invoiceNumber = await Storage.incrementInvoiceNumber();

        const invoice = {
            id: Date.now().toString(),
            invoiceNumber,
            clientName,
            clientEmail,
            date,
            dueDate,
            sessions,
            subtotal: totals.subtotal,
            tpsAmount: totals.tpsAmount,
            tvqAmount: totals.tvqAmount,
            total: totals.total,
            taxesEnabled: userProfile?.enableTaxes || false,
            tpsRate: userProfile?.tpsRate || 5,
            tvqRate: userProfile?.tvqRate || 9.975,
            tpsNumber: userProfile?.tpsNumber || '',
            tvqNumber: userProfile?.tvqNumber || '',
            createdAt: new Date().toISOString()
        };

        // Sauvegarder automatiquement le client s'il est nouveau
        const clientSelect = document.getElementById('client-select');
        if (clientSelect.value === 'new' || clientSelect.value === '') {
            try {
                await Storage.addClient({
                    name: clientName,
                    email: clientEmail
                });
                // Recharger la liste des clients
                if (window.clientManager) {
                    await window.clientManager.loadClients();
                }
            } catch (error) {
                console.error('Erreur lors de la sauvegarde du client:', error);
                // Continuer quand même avec la facture
            }
        }

        await Storage.addInvoice(invoice);
        await PDFGenerator.generateInvoice(invoice);

        this.form.reset();
        sessionManager.reset();
        await this.renderList();

        // Réinitialiser le select de client
        clientSelect.value = '';
        document.getElementById('client-fields').style.display = 'none';

        alert(`Facture #${invoiceNumber} générée avec succès!`);
    }

    async saveDraft() {
        const clientName = this.getClientName();
        const clientEmail = this.getClientEmail();
        const date = document.getElementById('invoice-date').value;
        let dueDate = document.getElementById('invoice-due-date').value;

        // Si pas de date d'échéance, calculer automatiquement (+30 jours)
        if (!dueDate) {
            dueDate = this.calculateDueDate(date);
        }

        const sessions = sessionManager.getSessions();

        if (!clientName || sessions.length === 0) {
            alert('Veuillez remplir au moins le nom du client et une ligne');
            return;
        }

        const totals = sessionManager.updateTotal();

        const invoice = {
            id: Date.now().toString(),
            invoiceNumber: 'BROUILLON',
            clientName,
            clientEmail,
            date,
            dueDate,
            sessions,
            subtotal: totals.subtotal,
            tpsAmount: totals.tpsAmount,
            tvqAmount: totals.tvqAmount,
            total: totals.total,
            taxesEnabled: userProfile?.enableTaxes || false,
            tpsRate: userProfile?.tpsRate || 5,
            tvqRate: userProfile?.tvqRate || 9.975,
            tpsNumber: userProfile?.tpsNumber || '',
            tvqNumber: userProfile?.tvqNumber || '',
            createdAt: new Date().toISOString(),
            isDraft: true
        };

        // Sauvegarder automatiquement le client s'il est nouveau
        const clientSelect = document.getElementById('client-select');
        if (clientSelect.value === 'new' || clientSelect.value === '') {
            try {
                await Storage.addClient({
                    name: clientName,
                    email: clientEmail
                });
                // Recharger la liste des clients
                if (window.clientManager) {
                    await window.clientManager.loadClients();
                }
            } catch (error) {
                console.error('Erreur lors de la sauvegarde du client:', error);
            }
        }

        await Storage.addInvoice(invoice);
        this.form.reset();
        sessionManager.reset();
        await this.renderList();

        // Réinitialiser le select de client
        clientSelect.value = '';
        document.getElementById('client-fields').style.display = 'none';

        alert('Brouillon sauvegardé!');
    }

    isOverdue(dueDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate + 'T00:00:00');
        return due < today;
    }

    filterBySearch(invoices, searchTerm) {
        if (!searchTerm) return invoices;

        const term = searchTerm.toLowerCase();
        return invoices.filter(invoice => {
            return (
                invoice.clientName.toLowerCase().includes(term) ||
                invoice.clientEmail.toLowerCase().includes(term) ||
                invoice.invoiceNumber.toString().toLowerCase().includes(term) ||
                invoice.total.toString().includes(term)
            );
        });
    }

    filterByPeriod(invoices, period) {
        if (period === 'all') return invoices;

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        return invoices.filter(invoice => {
            const invoiceDate = new Date(invoice.date + 'T00:00:00');
            const invoiceYear = invoiceDate.getFullYear();
            const invoiceMonth = invoiceDate.getMonth();

            switch (period) {
                case 'this-month':
                    return invoiceYear === currentYear && invoiceMonth === currentMonth;
                case 'last-month':
                    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                    return invoiceYear === lastMonthYear && invoiceMonth === lastMonth;
                case 'this-quarter':
                    const currentQuarter = Math.floor(currentMonth / 3);
                    const invoiceQuarter = Math.floor(invoiceMonth / 3);
                    return invoiceYear === currentYear && invoiceQuarter === currentQuarter;
                case 'this-year':
                    return invoiceYear === currentYear;
                default:
                    return true;
            }
        });
    }

    sortInvoices(invoices, sortBy) {
        const sorted = [...invoices];

        switch (sortBy) {
            case 'date-desc':
                return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
            case 'date-asc':
                return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
            case 'client-asc':
                return sorted.sort((a, b) => a.clientName.localeCompare(b.clientName));
            case 'client-desc':
                return sorted.sort((a, b) => b.clientName.localeCompare(a.clientName));
            case 'amount-desc':
                return sorted.sort((a, b) => b.total - a.total);
            case 'amount-asc':
                return sorted.sort((a, b) => a.total - b.total);
            default:
                return sorted;
        }
    }

    async renderList() {
        this.allInvoices = await Storage.getInvoices();

        // Appliquer les filtres et la recherche
        let filtered = this.allInvoices;
        filtered = this.filterBySearch(filtered, this.searchInput.value);
        filtered = this.filterByPeriod(filtered, this.periodFilter.value);
        filtered = this.sortInvoices(filtered, this.sortSelect.value);

        // Mettre à jour le compteur
        this.countBadge.textContent = `${filtered.length} facture(s)`;

        if (this.allInvoices.length === 0) {
            this.listContainer.innerHTML = '<p class="empty-state">Aucune facture sauvegardée</p>';
            this.countBadge.textContent = '';
            return;
        }

        if (filtered.length === 0) {
            this.listContainer.innerHTML = '<p class="empty-state">Aucune facture ne correspond aux critères de recherche</p>';
            return;
        }

        this.listContainer.innerHTML = filtered.map(invoice => {
            const isOverdue = invoice.dueDate && this.isOverdue(invoice.dueDate) && !invoice.isDraft;
            const overdueClass = isOverdue ? 'overdue' : '';
            const overdueIndicator = isOverdue ? '<span class="overdue-badge">⚠️ EN RETARD</span>' : '';

            return `
            <div class="invoice-item ${overdueClass}">
                <div class="item-header">
                    <div class="item-title">
                        ${invoice.isDraft ? '📝 BROUILLON - ' : ''}${invoice.clientName}
                        ${invoice.isDraft ? '' : `<br><small>Facture #${invoice.invoiceNumber}</small>`}
                        ${overdueIndicator}
                    </div>
                    <div class="item-amount">${invoice.total.toFixed(2)} $</div>
                </div>
                <div class="item-details">
                    Date: ${PDFGenerator.formatDate(invoice.date)} | ${invoice.sessions.length} ligne(s)
                    ${invoice.dueDate ? `<br>Échéance: ${PDFGenerator.formatDate(invoice.dueDate)}` : ''}
                    <br>Email: ${invoice.clientEmail}
                </div>
                <div class="item-actions">
                    ${!invoice.isDraft ? `<button class="btn-small btn-view" onclick="invoiceManager.regeneratePDF('${invoice.id}')">📄 Télécharger PDF</button>` : ''}
                    ${!invoice.isDraft ? `<button class="btn-small btn-email" onclick="invoiceManager.sendEmail('${invoice.id}')">✉️ Envoyer Email</button>` : ''}
                    <button class="btn-small btn-delete" onclick="invoiceManager.deleteInvoice('${invoice.id}')">🗑 Supprimer</button>
                </div>
            </div>
        `;
        }).join('');
    }

    async regeneratePDF(id) {
        const invoices = await Storage.getInvoices();
        const invoice = invoices.find(inv => inv.id === id);
        if (invoice) {
            await PDFGenerator.generateInvoice(invoice);
        }
    }

    async sendEmail(id) {
        const invoices = await Storage.getInvoices();
        const invoice = invoices.find(inv => inv.id === id);

        if (!invoice) {
            alert('Facture introuvable');
            return;
        }

        // Vérifier que le profil est configuré
        if (!userProfile) {
            alert('Veuillez d\'abord configurer votre profil dans l\'onglet Paramètres.');
            return;
        }

        // Vérifier que le client a un email
        if (!invoice.clientEmail) {
            alert('Cette facture n\'a pas d\'adresse email associée.');
            return;
        }

        // Générer le PDF en mémoire
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Utiliser la même logique que generateInvoice mais sans télécharger
        // En-tête
        doc.setFillColor(44, 62, 80);
        doc.rect(0, 0, 210, 45, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text(userProfile.name, 15, 20);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(userProfile.address, 15, 28);
        doc.text(`Tél: ${userProfile.phone}`, 15, 34);
        doc.text(`Email: ${userProfile.email}`, 15, 40);

        // Numéro et date
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Facture #${invoice.invoiceNumber}`, 150, 20);
        doc.setFont(undefined, 'normal');
        doc.text(`Date: ${PDFGenerator.formatDate(invoice.date)}`, 150, 27);
        if (invoice.dueDate) {
            doc.setFont(undefined, 'bold');
            doc.text(`Échéance: ${PDFGenerator.formatDate(invoice.dueDate)}`, 150, 34);
        }

        // Client
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Facturé à:', 15, 60);
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text(invoice.clientName, 15, 68);
        doc.text(invoice.clientEmail, 15, 74);

        // Tableau
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(userProfile.serviceLabel || 'Services', 15, 90);
        doc.setFillColor(52, 152, 219);
        doc.rect(15, 95, 180, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('Date', 20, 102);
        doc.text('Description', 60, 102);
        doc.text('Montant', 165, 102);

        // Lignes
        doc.setTextColor(0, 0, 0);
        let yPos = 112;
        invoice.sessions.forEach((session, index) => {
            const bgColor = index % 2 === 0 ? [245, 246, 250] : [255, 255, 255];
            doc.setFillColor(...bgColor);
            doc.rect(15, yPos - 7, 180, 10, 'F');
            doc.text(PDFGenerator.formatDate(session.date), 20, yPos);
            if (session.description) {
                const maxDescLength = 50;
                const description = session.description.length > maxDescLength
                    ? session.description.substring(0, maxDescLength) + '...'
                    : session.description;
                doc.text(description, 60, yPos);
            }
            doc.text(`${session.amount.toFixed(2)} $`, 165, yPos);
            yPos += 10;
        });

        // Total
        yPos += 10;
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Sous-total:', 130, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(`${invoice.subtotal.toFixed(2)} $`, 165, yPos);

        if (invoice.taxesEnabled && invoice.tpsAmount > 0) {
            yPos += 8;
            doc.text(`TPS (${invoice.tpsRate}%):`, 130, yPos);
            doc.text(`${invoice.tpsAmount.toFixed(2)} $`, 165, yPos);
            if (invoice.tpsNumber) {
                yPos += 6;
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text(`# TPS: ${invoice.tpsNumber}`, 130, yPos);
                doc.setFontSize(11);
                doc.setTextColor(0, 0, 0);
            }
        }

        if (invoice.taxesEnabled && invoice.tvqAmount > 0) {
            yPos += 8;
            doc.text(`TVQ (${invoice.tvqRate}%):`, 130, yPos);
            doc.text(`${invoice.tvqAmount.toFixed(2)} $`, 165, yPos);
            if (invoice.tvqNumber) {
                yPos += 6;
                doc.setFontSize(9);
                doc.setTextColor(100, 100, 100);
                doc.text(`# TVQ: ${invoice.tvqNumber}`, 130, yPos);
                doc.setFontSize(11);
                doc.setTextColor(0, 0, 0);
            }
        }

        // Total final
        yPos += 12;
        doc.setFillColor(39, 174, 96);
        doc.rect(15, yPos - 7, 180, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('TOTAL', 20, yPos);
        doc.text(`${invoice.total.toFixed(2)} $`, 165, yPos);

        // Paiement
        yPos += 25;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('Modalités de paiement:', 15, yPos);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`Paiement par: ${userProfile.paymentMethod}`, 15, yPos + 7);
        doc.text(`Envoyer à: ${userProfile.email}`, 15, yPos + 14);

        // Footer
        doc.setFontSize(9);
        doc.setTextColor(127, 140, 141);
        doc.text('Merci pour votre confiance!', 105, 280, { align: 'center' });

        // Convertir en blob
        const pdfBlob = doc.output('blob');

        // Envoyer l'email
        if (window.EmailSender) {
            await EmailSender.sendInvoice(invoice, pdfBlob);
        } else {
            alert('Le module d\'envoi d\'email n\'est pas chargé. Vérifiez que gmail-auth.js est inclus.');
        }
    }

    async deleteInvoice(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette facture?')) {
            await Storage.deleteInvoice(id);
            await this.renderList();
        }
    }

    async exportToExcel() {
        const invoices = await Storage.getInvoices();

        if (invoices.length === 0) {
            alert('Aucune facture à exporter');
            return;
        }

        const data = invoices.map(invoice => ({
            'Numéro': invoice.invoiceNumber,
            'Client': invoice.clientName,
            'Email': invoice.clientEmail,
            'Date': invoice.date,
            'Nombre de sessions': invoice.sessions.length,
            'Total': invoice.total.toFixed(2),
            'Statut': invoice.isDraft ? 'Brouillon' : 'Facturé'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Factures');

        XLSX.writeFile(wb, `Factures_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
}

// ==================== GESTION DES DÉPENSES ====================
class ExpenseManager {
    constructor() {
        this.form = document.getElementById('expense-form');
        this.listContainer = document.getElementById('expenses-list');
        this.photoInput = document.getElementById('expense-photo');
        this.photoPreview = document.getElementById('photo-preview');
        this.totalElement = document.getElementById('expenses-total');
        this.allExpenses = [];
        this.searchInput = document.getElementById('expense-search');
        this.categoryFilter = document.getElementById('expense-category-filter');
        this.periodFilter = document.getElementById('expense-period-filter');
        this.sortSelect = document.getElementById('expense-sort');

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        document.getElementById('export-excel-expenses-btn').addEventListener('click', () => this.exportToExcel());

        // Événements pour recherche et filtres
        this.searchInput.addEventListener('input', () => this.renderList());
        this.categoryFilter.addEventListener('change', () => this.renderList());
        this.periodFilter.addEventListener('change', () => this.renderList());
        this.sortSelect.addEventListener('change', () => this.renderList());

        this.renderList();
        this.updateTotal();
    }

    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                this.photoPreview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const date = document.getElementById('expense-date').value;
        const description = document.getElementById('expense-description').value;
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const category = document.getElementById('expense-category').value;

        const expense = {
            id: Date.now().toString(),
            date,
            description,
            amount,
            category,
            photo: this.photoPreview.querySelector('img')?.src || null,
            createdAt: new Date().toISOString()
        };

        await Storage.addExpense(expense);
        this.form.reset();
        this.photoPreview.innerHTML = '';
        await this.renderList();
        await this.updateTotal();

        alert('Dépense ajoutée avec succès!');
    }

    filterBySearch(expenses, searchTerm) {
        if (!searchTerm) return expenses;

        const term = searchTerm.toLowerCase();
        return expenses.filter(expense => {
            return (
                expense.description.toLowerCase().includes(term) ||
                expense.amount.toString().includes(term) ||
                this.getCategoryLabel(expense.category).toLowerCase().includes(term)
            );
        });
    }

    filterByCategory(expenses, category) {
        if (category === 'all') return expenses;
        return expenses.filter(expense => expense.category === category);
    }

    filterByPeriod(expenses, period) {
        if (period === 'all') return expenses;

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        return expenses.filter(expense => {
            const expenseDate = new Date(expense.date + 'T00:00:00');
            const expenseYear = expenseDate.getFullYear();
            const expenseMonth = expenseDate.getMonth();

            switch (period) {
                case 'this-month':
                    return expenseYear === currentYear && expenseMonth === currentMonth;
                case 'last-month':
                    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                    return expenseYear === lastMonthYear && expenseMonth === lastMonth;
                case 'this-quarter':
                    const currentQuarter = Math.floor(currentMonth / 3);
                    const expenseQuarter = Math.floor(expenseMonth / 3);
                    return expenseYear === currentYear && expenseQuarter === currentQuarter;
                case 'this-year':
                    return expenseYear === currentYear;
                default:
                    return true;
            }
        });
    }

    sortExpenses(expenses, sortBy) {
        const sorted = [...expenses];

        switch (sortBy) {
            case 'date-desc':
                return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
            case 'date-asc':
                return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
            case 'amount-desc':
                return sorted.sort((a, b) => b.amount - a.amount);
            case 'amount-asc':
                return sorted.sort((a, b) => a.amount - b.amount);
            default:
                return sorted;
        }
    }

    async renderList() {
        this.allExpenses = await Storage.getExpenses();

        // Appliquer les filtres et la recherche
        let filtered = this.allExpenses;
        filtered = this.filterBySearch(filtered, this.searchInput.value);
        filtered = this.filterByCategory(filtered, this.categoryFilter.value);
        filtered = this.filterByPeriod(filtered, this.periodFilter.value);
        filtered = this.sortExpenses(filtered, this.sortSelect.value);

        if (this.allExpenses.length === 0) {
            this.listContainer.innerHTML = '<p class="empty-state">Aucune dépense enregistrée</p>';
            return;
        }

        if (filtered.length === 0) {
            this.listContainer.innerHTML = '<p class="empty-state">Aucune dépense ne correspond aux critères de recherche</p>';
            return;
        }

        this.listContainer.innerHTML = filtered.map(expense => `
            <div class="expense-item">
                <div class="item-header">
                    <div class="item-title">${expense.description}</div>
                    <div class="item-amount">${expense.amount.toFixed(2)} $</div>
                </div>
                <div class="item-details">
                    Date: ${PDFGenerator.formatDate(expense.date)}
                    <span class="category-badge category-${expense.category}">${this.getCategoryLabel(expense.category)}</span>
                </div>
                ${expense.photo ? `<img src="${expense.photo}" alt="Photo dépense" class="expense-photo" onclick="expenseManager.viewPhoto('${expense.photo}')">` : ''}
                <div class="item-actions">
                    <button class="btn-small btn-delete" onclick="expenseManager.deleteExpense('${expense.id}')">🗑 Supprimer</button>
                </div>
            </div>
        `).join('');
    }

    getCategoryLabel(category) {
        const labels = {
            equipement: 'Équipement',
            deplacement: 'Déplacement',
            formation: 'Formation',
            location: 'Location',
            autre: 'Autre'
        };
        return labels[category] || category;
    }

    viewPhoto(photoUrl) {
        const modal = window.open('', '_blank');
        modal.document.write(`
            <html>
                <head>
                    <title>Photo de dépense</title>
                    <style>
                        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #000; }
                        img { max-width: 100%; max-height: 100vh; }
                    </style>
                </head>
                <body>
                    <img src="${photoUrl}" alt="Photo de dépense">
                </body>
            </html>
        `);
    }

    async deleteExpense(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette dépense?')) {
            await Storage.deleteExpense(id);
            await this.renderList();
            await this.updateTotal();
        }
    }

    async updateTotal() {
        const expenses = await Storage.getExpenses();
        const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        this.totalElement.textContent = total.toFixed(2) + ' $';
    }

    async exportToExcel() {
        const expenses = await Storage.getExpenses();

        if (expenses.length === 0) {
            alert('Aucune dépense à exporter');
            return;
        }

        const data = expenses.map(expense => ({
            'Date': expense.date,
            'Description': expense.description,
            'Catégorie': this.getCategoryLabel(expense.category),
            'Montant': expense.amount.toFixed(2),
            'Photo': expense.photo ? 'Oui' : 'Non'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Dépenses');

        // Ajouter une ligne de total
        const totalRow = {
            'Date': '',
            'Description': '',
            'Catégorie': 'TOTAL',
            'Montant': expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2),
            'Photo': ''
        };
        XLSX.utils.sheet_add_json(ws, [totalRow], { skipHeader: true, origin: -1 });

        XLSX.writeFile(wb, `Depenses_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
}

// ==================== GESTION DES ONGLETS ====================
class TabManager {
    constructor() {
        this.tabs = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');

        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
    }

    switchTab(tabName) {
        // Mettre à jour les boutons
        this.tabs.forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Mettre à jour le contenu
        this.tabContents.forEach(content => {
            if (content.id === `${tabName}-tab`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }
}

// ==================== GESTION DES CLIENTS ====================
class ClientManager {
    constructor() {
        this.clients = [];
        this.listContainer = document.getElementById('clients-list');
        this.addButton = document.getElementById('add-client-btn');
        this.formContainer = document.getElementById('client-form-container');
        this.form = document.getElementById('client-form');
        this.cancelButton = document.getElementById('cancel-client-btn');

        this.addButton.addEventListener('click', () => this.showForm());
        this.cancelButton.addEventListener('click', () => this.hideForm());
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        this.loadClients();
    }

    async loadClients() {
        try {
            this.clients = await Storage.getClients();
            this.renderList();
            this.updateInvoiceClientSelect();
        } catch (error) {
            console.error('Erreur lors du chargement des clients:', error);
        }
    }

    showForm() {
        this.formContainer.style.display = 'block';
        this.form.reset();
    }

    hideForm() {
        this.formContainer.style.display = 'none';
        this.form.reset();
    }

    async handleSubmit(e) {
        e.preventDefault();

        const client = {
            name: document.getElementById('new-client-name').value,
            email: document.getElementById('new-client-email').value
        };

        try {
            await Storage.addClient(client);
            this.hideForm();
            await this.loadClients();
            alert('Client ajouté avec succès!');
        } catch (error) {
            alert('Erreur lors de l\'ajout du client.');
        }
    }

    renderList() {
        if (this.clients.length === 0) {
            this.listContainer.innerHTML = '<p class="empty-state">Aucun client enregistré</p>';
            return;
        }

        this.listContainer.innerHTML = this.clients.map(client => `
            <div class="invoice-item">
                <div class="item-header">
                    <div class="item-title">${client.name}</div>
                </div>
                <div class="item-details">
                    Email: ${client.email}
                </div>
                <div class="item-actions">
                    <button class="btn-small btn-delete" onclick="clientManager.deleteClient('${client.id}')">🗑 Supprimer</button>
                </div>
            </div>
        `).join('');
    }

    async deleteClient(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce client?')) {
            try {
                await Storage.deleteClient(id);
                await this.loadClients();
            } catch (error) {
                alert('Erreur lors de la suppression du client.');
            }
        }
    }

    updateInvoiceClientSelect() {
        const select = document.getElementById('client-select');
        if (!select) return;

        select.innerHTML = `
            <option value="">-- Sélectionner un client --</option>
            ${this.clients.map(client => `
                <option value="${client.id}" data-name="${client.name}" data-email="${client.email}">
                    ${client.name}
                </option>
            `).join('')}
            <option value="new">+ Nouveau client</option>
        `;
    }

    getClients() {
        return this.clients;
    }
}

// ==================== GESTION DU PROFIL ====================
class ProfileManager {
    constructor() {
        this.form = document.getElementById('profile-form');
        this.statusDiv = document.getElementById('profile-status');
        this.enableTaxesCheckbox = document.getElementById('profile-enable-taxes');
        this.taxFields = document.getElementById('tax-fields');

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.enableTaxesCheckbox.addEventListener('change', () => this.toggleTaxFields());

        this.loadProfile();
    }

    toggleTaxFields() {
        if (this.enableTaxesCheckbox.checked) {
            this.taxFields.style.display = 'block';
        } else {
            this.taxFields.style.display = 'none';
        }
    }

    async loadProfile() {
        try {
            const profile = await Storage.getProfile();

            if (profile) {
                // Remplir le formulaire avec les données existantes
                document.getElementById('profile-name').value = profile.name || '';
                document.getElementById('profile-business-type').value = profile.businessType || '';
                document.getElementById('profile-service-label').value = profile.serviceLabel || '';
                document.getElementById('profile-address').value = profile.address || '';
                document.getElementById('profile-phone').value = profile.phone || '';
                document.getElementById('profile-email').value = profile.email || '';
                document.getElementById('profile-payment-method').value = profile.paymentMethod || '';

                // Charger les paramètres de taxes
                this.enableTaxesCheckbox.checked = profile.enableTaxes || false;
                document.getElementById('profile-tps-number').value = profile.tpsNumber || '';
                document.getElementById('profile-tvq-number').value = profile.tvqNumber || '';
                document.getElementById('profile-tps-rate').value = profile.tpsRate || 5;
                document.getElementById('profile-tvq-rate').value = profile.tvqRate || 9.975;

                // Afficher/masquer les champs de taxes
                this.toggleTaxFields();

                // Mettre à jour la variable globale
                userProfile = profile;

                // Afficher le nom de l'entreprise dans le header
                this.updateHeaderDisplay();
            } else {
                // Nouveau utilisateur - afficher un message d'aide
                this.showStatus('Bienvenue! Veuillez configurer votre profil pour commencer à créer des factures.', 'info');
            }
        } catch (error) {
            console.error('Erreur lors du chargement du profil:', error);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const profile = {
            name: document.getElementById('profile-name').value,
            businessType: document.getElementById('profile-business-type').value,
            serviceLabel: document.getElementById('profile-service-label').value,
            address: document.getElementById('profile-address').value,
            phone: document.getElementById('profile-phone').value,
            email: document.getElementById('profile-email').value,
            paymentMethod: document.getElementById('profile-payment-method').value,
            enableTaxes: this.enableTaxesCheckbox.checked,
            tpsNumber: document.getElementById('profile-tps-number').value,
            tvqNumber: document.getElementById('profile-tvq-number').value,
            tpsRate: parseFloat(document.getElementById('profile-tps-rate').value) || 5,
            tvqRate: parseFloat(document.getElementById('profile-tvq-rate').value) || 9.975
        };

        try {
            await Storage.saveProfile(profile);
            userProfile = profile;
            this.updateHeaderDisplay();
            this.showStatus('Profil sauvegardé avec succès!', 'success');
        } catch (error) {
            this.showStatus('Erreur lors de la sauvegarde du profil.', 'error');
        }
    }

    updateHeaderDisplay() {
        if (userProfile && userProfile.businessType) {
            const businessNameElement = document.getElementById('user-business-name');
            businessNameElement.textContent = `${userProfile.name} - ${userProfile.businessType}`;
            businessNameElement.style.display = 'block';
        }
    }

    showStatus(message, type) {
        this.statusDiv.textContent = message;
        this.statusDiv.style.display = 'block';

        // Couleurs selon le type
        if (type === 'success') {
            this.statusDiv.style.backgroundColor = '#d4edda';
            this.statusDiv.style.color = '#155724';
            this.statusDiv.style.border = '1px solid #c3e6cb';
        } else if (type === 'error') {
            this.statusDiv.style.backgroundColor = '#f8d7da';
            this.statusDiv.style.color = '#721c24';
            this.statusDiv.style.border = '1px solid #f5c6cb';
        } else if (type === 'info') {
            this.statusDiv.style.backgroundColor = '#d1ecf1';
            this.statusDiv.style.color = '#0c5460';
            this.statusDiv.style.border = '1px solid #bee5eb';
        }

        // Masquer après 5 secondes
        setTimeout(() => {
            this.statusDiv.style.display = 'none';
        }, 5000);
    }
}

// ==================== GESTION GMAIL ====================
class GmailUIManager {
    constructor() {
        this.connectBtn = document.getElementById('gmail-connect-btn');
        this.disconnectBtn = document.getElementById('gmail-disconnect-btn');
        this.statusText = document.getElementById('gmail-status-text');

        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.connectBtn) {
            this.connectBtn.addEventListener('click', async () => {
                if (window.gmailAuthManager) {
                    const success = await window.gmailAuthManager.connect();
                    if (success) {
                        this.updateUI(true);
                    }
                } else {
                    alert('Le module Gmail n\'est pas chargé. Vérifiez que gmail-auth.js est inclus.');
                }
            });
        }

        if (this.disconnectBtn) {
            this.disconnectBtn.addEventListener('click', async () => {
                if (window.gmailAuthManager) {
                    await window.gmailAuthManager.disconnect();
                    this.updateUI(false);
                }
            });
        }

        // Initialiser l'UI
        this.checkGmailStatus();
    }

    async checkGmailStatus() {
        // Vérifier si Gmail est déjà connecté dans Firestore
        try {
            const userId = authManager?.getUserId();
            if (!userId) return;

            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();

            if (userData && userData.gmailTokens) {
                this.updateUI(true);
            }
        } catch (error) {
            console.error('Erreur lors de la vérification du statut Gmail:', error);
        }
    }

    updateUI(isConnected) {
        if (isConnected) {
            this.connectBtn.style.display = 'none';
            this.disconnectBtn.style.display = 'inline-block';
            this.statusText.textContent = '✓ Gmail Connecté';
            this.statusText.style.color = '#27ae60';

            // Informer le gestionnaire Gmail
            if (window.gmailAuthManager) {
                window.gmailAuthManager.isAuthorized = true;
                window.gmailAuthManager.setUIElements(this.connectBtn, this.statusText);
            }
        } else {
            this.connectBtn.style.display = 'inline-block';
            this.disconnectBtn.style.display = 'none';
            this.statusText.textContent = 'Gmail non connecté';
            this.statusText.style.color = '#e74c3c';

            if (window.gmailAuthManager) {
                window.gmailAuthManager.isAuthorized = false;
                window.gmailAuthManager.setUIElements(this.connectBtn, this.statusText);
            }
        }
    }
}

// ==================== INITIALISATION ====================
let sessionManager;
let invoiceManager;
let expenseManager;
let tabManager;
let profileManager;
let clientManager;
let gmailUIManager;

// Rendre les gestionnaires globaux pour l'accès depuis les onclick
window.invoiceManager = null;
window.expenseManager = null;
window.clientManager = null;
window.tabManager = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initialiser la date par défaut
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoice-date').value = today;
    document.getElementById('expense-date').value = today;

    // Initialiser les gestionnaires
    sessionManager = new SessionManager();
    clientManager = new ClientManager();
    invoiceManager = new InvoiceManager();
    expenseManager = new ExpenseManager();
    tabManager = new TabManager();
    profileManager = new ProfileManager();
    gmailUIManager = new GmailUIManager();

    // Rendre globaux
    window.invoiceManager = invoiceManager;
    window.expenseManager = expenseManager;
    window.clientManager = clientManager;
    window.tabManager = tabManager;

    console.log('Application de facturation initialisée ✓');
});
