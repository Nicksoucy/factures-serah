// ==================== CONFIGURATION ====================
const INSTRUCTOR_INFO = {
    name: 'Serah Kong',
    address: '1709 rue des Pommiers, Pincourt QC J7W 0A5',
    phone: '514-947-2561',
    email: 'serah_k@hotmail.com',
    paymentMethod: 'Virement Interac'
};

const MAX_SESSIONS = 6;

// ==================== STOCKAGE LOCAL ====================
class Storage {
    static getInvoices() {
        const data = localStorage.getItem('invoices');
        return data ? JSON.parse(data) : [];
    }

    static saveInvoices(invoices) {
        localStorage.setItem('invoices', JSON.stringify(invoices));
    }

    static addInvoice(invoice) {
        const invoices = this.getInvoices();
        invoices.push(invoice);
        this.saveInvoices(invoices);
    }

    static deleteInvoice(id) {
        let invoices = this.getInvoices();
        invoices = invoices.filter(inv => inv.id !== id);
        this.saveInvoices(invoices);
    }

    static getExpenses() {
        const data = localStorage.getItem('expenses');
        return data ? JSON.parse(data) : [];
    }

    static saveExpenses(expenses) {
        localStorage.setItem('expenses', JSON.stringify(expenses));
    }

    static addExpense(expense) {
        const expenses = this.getExpenses();
        expenses.push(expense);
        this.saveExpenses(expenses);
    }

    static deleteExpense(id) {
        let expenses = this.getExpenses();
        expenses = expenses.filter(exp => exp.id !== id);
        this.saveExpenses(expenses);
    }

    static getInvoiceNumber() {
        const num = localStorage.getItem('invoiceNumber');
        return num ? parseInt(num) : 1000;
    }

    static incrementInvoiceNumber() {
        const current = this.getInvoiceNumber();
        localStorage.setItem('invoiceNumber', (current + 1).toString());
        return current;
    }
}

// ==================== GESTION DES SESSIONS ====================
class SessionManager {
    constructor() {
        this.sessions = [];
        this.container = document.getElementById('sessions-container');
        this.addButton = document.getElementById('add-session-btn');
        this.totalElement = document.getElementById('invoice-total');

        this.addButton.addEventListener('click', () => this.addSession());
        this.addSession(); // Ajouter une première session par défaut
    }

    addSession() {
        if (this.sessions.length >= MAX_SESSIONS) {
            alert(`Maximum ${MAX_SESSIONS} sessions autorisées`);
            return;
        }

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

        this.updateAddButtonState();
    }

    removeSession(sessionId) {
        const sessionDiv = this.container.querySelector(`[data-id="${sessionId}"]`);
        if (sessionDiv) {
            sessionDiv.remove();
            this.sessions = this.sessions.filter(id => id !== sessionId);
            this.updateTotal();
            this.updateAddButtonState();
        }
    }

    updateTotal() {
        const amounts = Array.from(this.container.querySelectorAll('.session-amount'))
            .map(input => parseFloat(input.value) || 0);
        const total = amounts.reduce((sum, amount) => sum + amount, 0);
        this.totalElement.textContent = total.toFixed(2) + ' $';
        return total;
    }

    updateAddButtonState() {
        this.addButton.disabled = this.sessions.length >= MAX_SESSIONS;
        if (this.sessions.length >= MAX_SESSIONS) {
            this.addButton.style.opacity = '0.5';
            this.addButton.style.cursor = 'not-allowed';
        } else {
            this.addButton.style.opacity = '1';
            this.addButton.style.cursor = 'pointer';
        }
    }

    getSessions() {
        return Array.from(this.container.querySelectorAll('.session-item')).map(div => ({
            date: div.querySelector('.session-date').value,
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

        // En-tête avec informations de l'instructrice
        doc.setFillColor(44, 62, 80);
        doc.rect(0, 0, 210, 45, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text(INSTRUCTOR_INFO.name, 15, 20);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(INSTRUCTOR_INFO.address, 15, 28);
        doc.text(`Tél: ${INSTRUCTOR_INFO.phone}`, 15, 34);
        doc.text(`Email: ${INSTRUCTOR_INFO.email}`, 15, 40);

        // Numéro de facture et date
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Facture #${invoiceData.invoiceNumber}`, 150, 20);
        doc.setFont(undefined, 'normal');
        doc.text(`Date: ${this.formatDate(invoiceData.date)}`, 150, 27);

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
        doc.text('Sessions de Jiu-Jitsu', 15, 90);

        // En-tête du tableau
        doc.setFillColor(52, 152, 219);
        doc.rect(15, 95, 180, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('Date', 20, 102);
        doc.text('Montant', 165, 102);

        // Lignes du tableau
        doc.setTextColor(0, 0, 0);
        let yPos = 112;
        invoiceData.sessions.forEach((session, index) => {
            const bgColor = index % 2 === 0 ? [245, 246, 250] : [255, 255, 255];
            doc.setFillColor(...bgColor);
            doc.rect(15, yPos - 7, 180, 10, 'F');

            doc.text(this.formatDate(session.date), 20, yPos);
            doc.text(`${session.amount.toFixed(2)} $`, 165, yPos);
            yPos += 10;
        });

        // Total
        yPos += 10;
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
        doc.text(`Paiement par: ${INSTRUCTOR_INFO.paymentMethod}`, 15, yPos + 7);
        doc.text(`Envoyer à: ${INSTRUCTOR_INFO.email}`, 15, yPos + 14);

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

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('save-draft-btn').addEventListener('click', () => this.saveDraft());
        document.getElementById('export-excel-invoices-btn').addEventListener('click', () => this.exportToExcel());

        this.renderList();
    }

    async handleSubmit(e) {
        e.preventDefault();

        const clientName = document.getElementById('client-name').value;
        const clientEmail = document.getElementById('client-email').value;
        const date = document.getElementById('invoice-date').value;
        const sessions = sessionManager.getSessions();

        if (sessions.length === 0) {
            alert('Veuillez ajouter au moins une session');
            return;
        }

        if (sessions.some(s => !s.date || s.amount <= 0)) {
            alert('Veuillez remplir toutes les sessions avec des valeurs valides');
            return;
        }

        const total = sessions.reduce((sum, s) => sum + s.amount, 0);
        const invoiceNumber = Storage.incrementInvoiceNumber();

        const invoice = {
            id: Date.now(),
            invoiceNumber,
            clientName,
            clientEmail,
            date,
            sessions,
            total,
            createdAt: new Date().toISOString()
        };

        Storage.addInvoice(invoice);
        await PDFGenerator.generateInvoice(invoice);

        this.form.reset();
        sessionManager.reset();
        this.renderList();

        alert(`Facture #${invoiceNumber} générée avec succès!`);
    }

    saveDraft() {
        const clientName = document.getElementById('client-name').value;
        const clientEmail = document.getElementById('client-email').value;
        const date = document.getElementById('invoice-date').value;
        const sessions = sessionManager.getSessions();

        if (!clientName || sessions.length === 0) {
            alert('Veuillez remplir au moins le nom du client et une session');
            return;
        }

        const total = sessions.reduce((sum, s) => sum + s.amount, 0);

        const invoice = {
            id: Date.now(),
            invoiceNumber: 'BROUILLON',
            clientName,
            clientEmail,
            date,
            sessions,
            total,
            createdAt: new Date().toISOString(),
            isDraft: true
        };

        Storage.addInvoice(invoice);
        this.form.reset();
        sessionManager.reset();
        this.renderList();

        alert('Brouillon sauvegardé!');
    }

    renderList() {
        const invoices = Storage.getInvoices();

        if (invoices.length === 0) {
            this.listContainer.innerHTML = '<p class="empty-state">Aucune facture sauvegardée</p>';
            return;
        }

        this.listContainer.innerHTML = invoices.map(invoice => `
            <div class="invoice-item">
                <div class="item-header">
                    <div class="item-title">
                        ${invoice.isDraft ? '📝 BROUILLON - ' : ''}${invoice.clientName}
                        ${invoice.isDraft ? '' : `<br><small>Facture #${invoice.invoiceNumber}</small>`}
                    </div>
                    <div class="item-amount">${invoice.total.toFixed(2)} $</div>
                </div>
                <div class="item-details">
                    Date: ${PDFGenerator.formatDate(invoice.date)} | ${invoice.sessions.length} session(s)
                    <br>Email: ${invoice.clientEmail}
                </div>
                <div class="item-actions">
                    ${!invoice.isDraft ? `<button class="btn-small btn-view" onclick="invoiceManager.regeneratePDF(${invoice.id})">📄 Télécharger PDF</button>` : ''}
                    <button class="btn-small btn-delete" onclick="invoiceManager.deleteInvoice(${invoice.id})">🗑 Supprimer</button>
                </div>
            </div>
        `).join('');
    }

    async regeneratePDF(id) {
        const invoices = Storage.getInvoices();
        const invoice = invoices.find(inv => inv.id === id);
        if (invoice) {
            await PDFGenerator.generateInvoice(invoice);
        }
    }

    deleteInvoice(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette facture?')) {
            Storage.deleteInvoice(id);
            this.renderList();
        }
    }

    exportToExcel() {
        const invoices = Storage.getInvoices();

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

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
        document.getElementById('export-excel-expenses-btn').addEventListener('click', () => this.exportToExcel());

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

    handleSubmit(e) {
        e.preventDefault();

        const date = document.getElementById('expense-date').value;
        const description = document.getElementById('expense-description').value;
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const category = document.getElementById('expense-category').value;

        const expense = {
            id: Date.now(),
            date,
            description,
            amount,
            category,
            photo: this.photoPreview.querySelector('img')?.src || null,
            createdAt: new Date().toISOString()
        };

        Storage.addExpense(expense);
        this.form.reset();
        this.photoPreview.innerHTML = '';
        this.renderList();
        this.updateTotal();

        alert('Dépense ajoutée avec succès!');
    }

    renderList() {
        const expenses = Storage.getExpenses();

        if (expenses.length === 0) {
            this.listContainer.innerHTML = '<p class="empty-state">Aucune dépense enregistrée</p>';
            return;
        }

        this.listContainer.innerHTML = expenses.map(expense => `
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
                    <button class="btn-small btn-delete" onclick="expenseManager.deleteExpense(${expense.id})">🗑 Supprimer</button>
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

    deleteExpense(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette dépense?')) {
            Storage.deleteExpense(id);
            this.renderList();
            this.updateTotal();
        }
    }

    updateTotal() {
        const expenses = Storage.getExpenses();
        const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        this.totalElement.textContent = total.toFixed(2) + ' $';
    }

    exportToExcel() {
        const expenses = Storage.getExpenses();

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

// ==================== INITIALISATION ====================
let sessionManager;
let invoiceManager;
let expenseManager;
let tabManager;

document.addEventListener('DOMContentLoaded', () => {
    // Initialiser la date par défaut
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoice-date').value = today;
    document.getElementById('expense-date').value = today;

    // Initialiser les gestionnaires
    sessionManager = new SessionManager();
    invoiceManager = new InvoiceManager();
    expenseManager = new ExpenseManager();
    tabManager = new TabManager();

    console.log('Application de facturation initialisée ✓');
});
