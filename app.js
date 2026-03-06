// ===== Month Names =====
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ===== Default Saved Companies =====
const DEFAULT_COMPANIES = [
  {
    id: 'reviero',
    name: 'REVIERO TECHNOLOGIES LTD',
    address: '167-169 Great Portland Street\nFifth Floor\nLondon\nW1W 5PF',
    regNo: '14673847',
    regLabel: 'COMPANY REGISTRATION NO'
  },
  {
    id: 'navian',
    name: 'Navian Consulting AB',
    address: 'c/o KG10 I STOCKHOLM AB,\nKungsgatan 8,\n1143 Stockholm',
    regNo: 'SE559083017901',
    regLabel: 'VAT'
  },
  {
    id: 'ssk',
    name: 'SSK Venture holdings AB',
    address: 'Kungsgatan 8,\n111 43 Stockholm',
    regNo: '559397-4123',
    regLabel: 'Org.nr'
  }
];

// ===== App State =====
const state = {
  invoiceNumber: 5,
  invoiceMonth: new Date().getMonth(),
  invoiceYear: new Date().getFullYear(),
  clientName: 'REVIERO TECHNOLOGIES LTD',
  clientAddress: '167-169 Great Portland Street\nFifth Floor\nLondon\nW1W 5PF',
  clientRegNo: '14673847',
  clientRegLabel: 'COMPANY REGISTRATION NO',
  selectedCompanyId: 'reviero',
  services: [
    { desc: 'Management of development of Technical platform', hours: '', rate: '', amount: 4500 }
  ]
};

// ===== Saved Companies =====
let savedCompanies = [...DEFAULT_COMPANIES];

// ===== Invoice History =====
let invoiceHistory = [];
let calendarYear = new Date().getFullYear();

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  loadCompanies();
  loadInvoiceHistory();
  loadState();
  bindInputs();
  rebuildCompanyDropdown();
  recalcDates();
  render();
});

// ===== State Persistence =====
function saveState() {
  localStorage.setItem('invoice_state', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('invoice_state');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(state, parsed);
    } catch (e) { /* ignore */ }
  }
  // Restore form values
  document.getElementById('invoiceNumber').value = state.invoiceNumber;
  document.getElementById('invoiceMonth').value = state.invoiceMonth;
  document.getElementById('invoiceYear').value = state.invoiceYear;
  rebuildServicesForm();
}

// ===== Company Persistence =====
function saveCompanies() {
  localStorage.setItem('invoice_companies', JSON.stringify(savedCompanies));
}

function loadCompanies() {
  const saved = localStorage.getItem('invoice_companies');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Merge: keep defaults + add any user-created companies
      const defaultIds = DEFAULT_COMPANIES.map(c => c.id);
      const userCompanies = parsed.filter(c => !defaultIds.includes(c.id));
      savedCompanies = [...DEFAULT_COMPANIES, ...userCompanies];
    } catch (e) { /* ignore */ }
  }
}

// ===== Date Calculation =====
function recalcDates() {
  const year = state.invoiceYear;
  const month = state.invoiceMonth;

  // Last day of the selected month
  const lastDay = new Date(year, month + 1, 0);
  // Due date = last day of the NEXT month
  const dueDate = new Date(year, month + 2, 0);

  // Store as formatted strings
  state.invoiceDate = formatDateObj(lastDay);
  state.dueDate = formatDateObj(dueDate);
  state.invoicePeriod = MONTHS[month];

  // Update readonly previews
  document.getElementById('invoiceDatePreview').value = state.invoiceDate;
  document.getElementById('dueDatePreview').value = state.dueDate;
}

function formatDateObj(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

// ===== Input Binding =====
function bindInputs() {
  // Invoice number
  document.getElementById('invoiceNumber').addEventListener('input', function () {
    state.invoiceNumber = parseInt(this.value) || 0;
    render();
    saveState();
  });

  // Month select
  document.getElementById('invoiceMonth').addEventListener('change', function () {
    state.invoiceMonth = parseInt(this.value);
    recalcDates();
    render();
    saveState();
  });

  // Year
  document.getElementById('invoiceYear').addEventListener('input', function () {
    state.invoiceYear = parseInt(this.value) || 2025;
    recalcDates();
    render();
    saveState();
  });

  // Company select
  document.getElementById('companySelect').addEventListener('change', function () {
    const id = this.value;
    state.selectedCompanyId = id;
    if (id) {
      const company = savedCompanies.find(c => c.id === id);
      if (company) {
        state.clientName = company.name;
        state.clientAddress = company.address;
        state.clientRegNo = company.regNo;
        state.clientRegLabel = company.regLabel || 'COMPANY REGISTRATION NO';
      }
    }
    render();
    saveState();
  });
}

function bindServiceInputs() {
  document.querySelectorAll('.service-item').forEach((item, i) => {
    const desc = item.querySelector('.svc-desc');
    const hours = item.querySelector('.svc-hours');
    const rate = item.querySelector('.svc-rate');
    const amount = item.querySelector('.svc-amount');

    function recalcAmount() {
      const h = parseFloat(hours.value) || 0;
      const r = parseFloat(rate.value) || 0;
      const calc = h * r;
      if (h && r) {
        amount.value = calc;
        state.services[i].amount = calc;
      }
    }

    [desc, hours, rate].forEach(el => {
      el.addEventListener('input', () => {
        state.services[i].desc = desc.value;
        state.services[i].hours = hours.value;
        state.services[i].rate = rate.value;
        recalcAmount();
        render();
        saveState();
      });
    });

    // Allow manual amount override only if hours/rate are empty
    amount.addEventListener('input', () => {
      state.services[i].amount = parseFloat(amount.value) || 0;
      render();
      saveState();
    });
  });
}

// ===== Company Management =====
function rebuildCompanyDropdown() {
  const select = document.getElementById('companySelect');
  select.innerHTML = '<option value="">— Custom —</option>' +
    savedCompanies.map(c =>
      `<option value="${escapeAttr(c.id)}" ${c.id === state.selectedCompanyId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
    ).join('');
}

function openCompanyManager() {
  document.getElementById('companyModal').classList.add('active');
  renderCompanyList();
}

function closeCompanyManager() {
  document.getElementById('companyModal').classList.remove('active');
}

function renderCompanyList() {
  const list = document.getElementById('companyList');
  if (savedCompanies.length === 0) {
    list.innerHTML = '<p class="empty-state">No saved companies yet</p>';
    return;
  }
  list.innerHTML = savedCompanies.map((c, i) => `
    <div class="company-card">
      <div class="company-card-info">
        <strong>${escapeHtml(c.name)}</strong>
        <span class="company-card-detail">${escapeHtml(c.address.replace(/\n/g, ', '))}</span>
        ${c.regNo ? `<span class="company-card-detail">Reg: ${escapeHtml(c.regNo)}</span>` : ''}
      </div>
      <button class="btn-remove-company" onclick="removeCompany(${i})" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
    </div>
  `).join('');
}

function addCompany() {
  const name = document.getElementById('newCompanyName').value.trim();
  const address = document.getElementById('newCompanyAddress').value.trim();
  const regNo = document.getElementById('newCompanyRegNo').value.trim();

  if (!name) {
    document.getElementById('newCompanyName').focus();
    return;
  }

  const id = 'company_' + Date.now();
  savedCompanies.push({ id, name, address, regNo });
  saveCompanies();
  rebuildCompanyDropdown();
  renderCompanyList();

  // Clear form
  document.getElementById('newCompanyName').value = '';
  document.getElementById('newCompanyAddress').value = '';
  document.getElementById('newCompanyRegNo').value = '';
}

function removeCompany(index) {
  const removed = savedCompanies[index];
  savedCompanies.splice(index, 1);
  saveCompanies();
  rebuildCompanyDropdown();
  renderCompanyList();

  // If the removed company was selected, reset to custom
  if (state.selectedCompanyId === removed.id) {
    state.selectedCompanyId = '';
    document.getElementById('companySelect').value = '';
    saveState();
  }
}

// ===== Service Management =====
function addService() {
  state.services.push({ desc: '', hours: '', rate: '', amount: 0 });
  rebuildServicesForm();
  render();
  saveState();
}

function removeService(btn) {
  const item = btn.closest('.service-item');
  const index = [...document.querySelectorAll('.service-item')].indexOf(item);
  if (state.services.length > 1) {
    state.services.splice(index, 1);
    rebuildServicesForm();
    render();
    saveState();
  }
}

function rebuildServicesForm() {
  const container = document.getElementById('servicesContainer');
  container.innerHTML = state.services.map((s, i) => `
    <div class="service-item" data-index="${i}">
      <div class="form-group">
        <label>Description</label>
        <input type="text" class="svc-desc" value="${escapeAttr(s.desc)}">
      </div>
      <div class="form-grid form-grid-3">
        <div class="form-group">
          <label>Hours</label>
          <input type="text" class="svc-hours" value="${escapeAttr(s.hours)}" placeholder="—">
        </div>
        <div class="form-group">
          <label>Rate</label>
          <input type="text" class="svc-rate" value="${escapeAttr(s.rate)}" placeholder="—">
        </div>
        <div class="form-group">
          <label>Amount (€)</label>
          <input type="number" class="svc-amount" value="${s.amount}" step="0.01">
        </div>
      </div>
      <button class="btn-remove-service" onclick="removeService(this)" title="Remove service"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
  `).join('');
  bindServiceInputs();
}

// ===== Render Preview =====
function render() {
  // Invoice number
  document.getElementById('invoiceNumberDisplay').textContent = '#' + state.invoiceNumber;

  // Dates
  document.getElementById('periodDisplay').textContent = state.invoicePeriod || MONTHS[state.invoiceMonth];
  document.getElementById('dateDisplay').textContent = state.invoiceDate;
  document.getElementById('dueDateDisplay').textContent = state.dueDate;

  // Client
  document.getElementById('clientNameDisplay').textContent = state.clientName;
  document.getElementById('clientAddressDisplay').innerHTML = state.clientAddress.replace(/\n/g, '<br>');
  const regLabel = state.clientRegLabel || 'COMPANY REGISTRATION NO';
  document.getElementById('clientRegDisplay').innerHTML = state.clientRegNo
    ? `<strong>${regLabel}: ${state.clientRegNo}</strong>`
    : '';

  // Services table
  const total = state.services.reduce((sum, s) => sum + (s.amount || 0), 0);
  const tbody = document.getElementById('servicesTableBody');
  tbody.innerHTML = state.services.map(s => `
    <div class="table-row">
      <span class="td-services">${escapeHtml(s.desc)}</span>
      <span class="td-hours">${escapeHtml(s.hours)}</span>
      <span class="td-rate">${escapeHtml(s.rate)}</span>
      <span class="td-amount">${formatEuro(s.amount)}</span>
    </div>
  `).join('');

  // Total
  document.getElementById('totalDisplay').textContent = formatEuro(total);

  // Balance
  document.getElementById('balanceDisplay').textContent = formatEuro(total);
}

// ===== Formatting =====
function formatEuro(n) {
  if (!n && n !== 0) return '';
  return n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ===== PDF Export (open in new tab) =====
function exportPDF() {
  const invoice = document.getElementById('invoice');
  const win = window.open('', '_blank');
  if (!win) { alert('Please allow popups for this page'); return; }

  // Auto-save invoice to history
  saveInvoiceToHistory();

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice #${state.invoiceNumber} \u2014 ${state.clientName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <style>
    html, body { margin: 0; padding: 0; background: #fff; }
    .invoice { width: 210mm; min-height: 297mm; margin: 0 auto; box-shadow: none !important; border-radius: 0 !important; }
    @media print {
      .invoice { width: 100%; }
      .no-print { display: none !important; }
    }
    .print-hint {
      text-align: center; padding: 12px; background: #1a1a1a; color: #f5f0ea;
      font-family: 'Inter', sans-serif; font-size: 13px; letter-spacing: .5px;
    }
    .print-hint kbd {
      background: rgba(255,255,255,.15); padding: 2px 8px; border-radius: 4px; font-family: inherit;
    }
  </style>
</head>
<body>
  <div class="no-print print-hint">Press <kbd>\u2318 Cmd + P</kbd> to save as PDF</div>
  ${invoice.outerHTML}
</body>
</html>`);
  win.document.close();
}

// ===== Sidebar Toggle =====
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

// ===== Tab Switching =====
function switchTab(tab) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Show/hide panels
  const previewArea = document.querySelector('.preview-area');
  const calendarArea = document.getElementById('calendarArea');
  const sidebarScroll = document.querySelector('.sidebar-scroll');
  const sidebarActions = document.querySelector('.sidebar-actions');

  if (tab === 'calendar') {
    previewArea.style.display = 'none';
    calendarArea.style.display = 'flex';
    if (sidebarScroll) sidebarScroll.style.display = 'none';
    if (sidebarActions) sidebarActions.style.display = 'none';
    renderCalendar();
  } else {
    previewArea.style.display = 'flex';
    calendarArea.style.display = 'none';
    if (sidebarScroll) sidebarScroll.style.display = '';
    if (sidebarActions) sidebarActions.style.display = '';
  }
}

// ===== Invoice History Persistence =====
function saveInvoiceHistory() {
  localStorage.setItem('invoice_history', JSON.stringify(invoiceHistory));
}

function loadInvoiceHistory() {
  const saved = localStorage.getItem('invoice_history');
  if (saved) {
    try {
      invoiceHistory = JSON.parse(saved);
    } catch (e) { invoiceHistory = []; }
  }
}

function saveInvoiceToHistory() {
  const total = state.services.reduce((sum, s) => sum + (s.amount || 0), 0);

  // Check if invoice with same number + year already exists, update it
  const existingIdx = invoiceHistory.findIndex(
    inv => inv.number === state.invoiceNumber && inv.year === state.invoiceYear
  );

  const entry = {
    id: existingIdx >= 0 ? invoiceHistory[existingIdx].id : crypto.randomUUID(),
    number: state.invoiceNumber,
    month: state.invoiceMonth,
    year: state.invoiceYear,
    clientName: state.clientName,
    companyId: state.selectedCompanyId,
    amount: total,
    paid: existingIdx >= 0 ? invoiceHistory[existingIdx].paid : false,
    createdAt: new Date().toISOString().slice(0, 10)
  };

  if (existingIdx >= 0) {
    invoiceHistory[existingIdx] = entry;
  } else {
    invoiceHistory.push(entry);
  }

  saveInvoiceHistory();
}

function toggleInvoicePaid(id) {
  const inv = invoiceHistory.find(i => i.id === id);
  if (inv) {
    inv.paid = !inv.paid;
    saveInvoiceHistory();
    renderCalendar();
  }
}

function deleteInvoice(id, event) {
  event.stopPropagation();
  const inv = invoiceHistory.find(i => i.id === id);
  if (inv && confirm(`Delete Invoice #${inv.number} (${inv.clientName})?`)) {
    invoiceHistory = invoiceHistory.filter(i => i.id !== id);
    saveInvoiceHistory();
    renderCalendar();
  }
}

// ===== Calendar Year Navigation =====
function changeCalendarYear(delta) {
  calendarYear += delta;
  renderCalendar();
}

// ===== Calendar Rendering =====
function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Filter invoices for selected year
  const yearInvoices = invoiceHistory.filter(inv => inv.year === calendarYear);
  const totalAmount = yearInvoices.reduce((s, i) => s + i.amount, 0);
  const paidAmount = yearInvoices.filter(i => i.paid).reduce((s, i) => s + i.amount, 0);
  const pendingAmount = totalAmount - paidAmount;

  // Update year title & summary
  document.getElementById('calendarYearTitle').textContent = calendarYear;
  document.getElementById('summaryTotal').textContent = formatEuro(totalAmount);
  document.getElementById('summaryPaid').textContent = formatEuro(paidAmount);
  document.getElementById('summaryPending').textContent = formatEuro(pendingAmount);

  // Render 12 months
  grid.innerHTML = MONTHS.map((monthName, monthIdx) => {
    const monthInvoices = yearInvoices.filter(inv => inv.month === monthIdx);
    const monthTotal = monthInvoices.reduce((s, i) => s + i.amount, 0);
    const isCurrent = calendarYear === currentYear && monthIdx === currentMonth;

    const invoicesHtml = monthInvoices.length > 0
      ? monthInvoices.map(inv => `
          <div class="cal-invoice ${inv.paid ? 'paid' : ''}" onclick="toggleInvoicePaid('${inv.id}')">
            <div class="cal-invoice-status"></div>
            <div class="cal-invoice-info">
              <div class="cal-invoice-client">${escapeHtml(inv.clientName)}</div>
              <div class="cal-invoice-meta">#${inv.number} · ${inv.paid ? 'Paid' : 'Pending'}</div>
            </div>
            <span class="cal-invoice-amount">${formatEuro(inv.amount)}</span>
            <button class="cal-invoice-delete" onclick="deleteInvoice('${inv.id}', event)" title="Delete">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        `).join('')
      : '<div class="month-empty">No invoices</div>';

    return `
      <div class="month-card ${isCurrent ? 'current-month' : ''}">
        <div class="month-card-header">
          <span class="month-name">${monthName}</span>
          ${monthTotal > 0 ? `<span class="month-total">${formatEuro(monthTotal)}</span>` : ''}
        </div>
        <div class="month-invoices">
          ${invoicesHtml}
        </div>
      </div>
    `;
  }).join('');
}
