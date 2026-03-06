// ===== Supabase Client =====
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== Month Names =====
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ===== Invoice Statuses =====
const STATUSES = ['processing', 'pending', 'done', 'error'];
const STATUS_LABELS = {
  processing: 'Processing',
  pending: 'Pending',
  done: 'Done',
  error: 'Error'
};
const STATUS_NEXT = {
  processing: 'pending',
  pending: 'done',
  done: 'error',
  error: 'processing'
};

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

// ===== Auth =====
async function checkAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    showApp();
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  btn.disabled = true;
  btn.textContent = 'Signing in...';
  errorEl.textContent = '';

  const { error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    errorEl.textContent = error.message;
    btn.disabled = false;
    btn.textContent = 'Sign In';
  } else {
    showApp();
  }
}

async function handleLogout() {
  await db.auth.signOut();
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appContainer').style.display = 'none';
}

async function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = 'flex';
  await loadCompanies();
  await loadState();
  await loadInvoiceHistory();
  bindInputs();
  rebuildCompanyDropdown();
  recalcDates();
  render();
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

// ===== State Persistence (Supabase) =====
async function saveState() {
  await db.from('app_state').upsert({ id: 1, state, updated_at: new Date().toISOString() });
}

async function loadState() {
  const { data } = await db.from('app_state').select('state').eq('id', 1).single();
  if (data && data.state) {
    Object.assign(state, data.state);
  }
  // Restore form values
  document.getElementById('invoiceNumber').value = state.invoiceNumber;
  document.getElementById('invoiceYear').value = state.invoiceYear;
  document.getElementById('invoiceMonth').value = state.invoiceMonth;
  if (state.selectedCompanyId) {
    document.getElementById('companySelect').value = state.selectedCompanyId;
  }
  rebuildServicesForm();
}

// ===== Company Persistence (Supabase) =====
async function saveCompanies() {
  // Upsert all companies
  for (const c of savedCompanies) {
    await db.from('companies').upsert({
      id: c.id,
      name: c.name,
      address: c.address,
      reg_no: c.regNo,
      reg_label: c.regLabel || 'COMPANY REGISTRATION NO'
    });
  }
}

async function loadCompanies() {
  const { data } = await db.from('companies').select('*').order('created_at');
  if (data && data.length > 0) {
    savedCompanies = data.map(c => ({
      id: c.id,
      name: c.name,
      address: c.address,
      regNo: c.reg_no,
      regLabel: c.reg_label
    }));
  } else {
    savedCompanies = [...DEFAULT_COMPANIES];
    await saveCompanies();
  }
}

// ===== Invoice History (Supabase) =====
async function loadInvoiceHistory() {
  const { data } = await db.from('invoices').select('*').order('created_at', { ascending: false });
  if (data) {
    invoiceHistory = data.map(inv => ({
      id: inv.id,
      number: inv.number,
      month: inv.month,
      year: inv.year,
      clientName: inv.client_name,
      companyId: inv.company_id,
      amount: parseFloat(inv.amount),
      status: inv.status || 'pending',
      invoiceDate: inv.invoice_date,
      dueDate: inv.due_date,
      services: inv.services || [],
      notes: inv.notes,
      createdAt: inv.created_at
    }));
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
  document.getElementById('invoiceNumber').addEventListener('input', e => {
    state.invoiceNumber = parseInt(e.target.value) || 1;
    saveState();
    render();
  });

  document.getElementById('invoiceYear').addEventListener('input', e => {
    state.invoiceYear = parseInt(e.target.value) || 2025;
    recalcDates();
    saveState();
    render();
  });

  document.getElementById('invoiceMonth').addEventListener('change', e => {
    state.invoiceMonth = parseInt(e.target.value);
    recalcDates();
    saveState();
    render();
  });

  // Company select
  document.getElementById('companySelect').addEventListener('change', e => {
    const companyId = e.target.value;
    state.selectedCompanyId = companyId;
    const company = savedCompanies.find(c => c.id === companyId);
    if (company) {
      state.clientName = company.name;
      state.clientAddress = company.address;
      state.clientRegNo = company.regNo;
      state.clientRegLabel = company.regLabel || 'COMPANY REGISTRATION NO';
    }
    saveState();
    render();
  });

  bindServiceInputs();
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
      if (h > 0 && r > 0) {
        const calc = h * r;
        amount.value = calc;
        state.services[i].amount = calc;
        amount.readOnly = true;
      } else {
        amount.readOnly = false;
      }
    }

    desc.addEventListener('input', () => { state.services[i].desc = desc.value; saveState(); render(); });
    hours.addEventListener('input', () => { state.services[i].hours = hours.value; recalcAmount(); saveState(); render(); });
    rate.addEventListener('input', () => { state.services[i].rate = rate.value; recalcAmount(); saveState(); render(); });
    amount.addEventListener('input', () => { state.services[i].amount = parseFloat(amount.value) || 0; saveState(); render(); });

    recalcAmount();
  });
}

// ===== Company Management =====
function rebuildCompanyDropdown() {
  const select = document.getElementById('companySelect');
  select.innerHTML = '<option value="">— Custom —</option>';
  savedCompanies.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
  if (state.selectedCompanyId) select.value = state.selectedCompanyId;
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
  list.innerHTML = savedCompanies.map((c, i) => `
    <div class="company-list-item">
      <div>
        <strong>${escapeHtml(c.name)}</strong>
        <small>${escapeHtml(c.regLabel || 'REG')}: ${escapeHtml(c.regNo)}</small>
      </div>
      <button class="btn-remove" onclick="removeCompany(${i})" title="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');
}

async function addCompany() {
  const name = document.getElementById('newCompanyName').value.trim();
  const address = document.getElementById('newCompanyAddress').value.trim();
  const regLabel = document.getElementById('newCompanyRegLabel')?.value.trim() || 'COMPANY REGISTRATION NO';
  const regNo = document.getElementById('newCompanyRegNo').value.trim();
  if (!name) return;

  const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const company = { id, name, address, regNo, regLabel };
  savedCompanies.push(company);
  await saveCompanies();
  rebuildCompanyDropdown();
  renderCompanyList();

  document.getElementById('newCompanyName').value = '';
  document.getElementById('newCompanyAddress').value = '';
  document.getElementById('newCompanyRegNo').value = '';
}

async function removeCompany(index) {
  const removed = savedCompanies.splice(index, 1)[0];
  if (removed) {
    await db.from('companies').delete().eq('id', removed.id);
  }
  rebuildCompanyDropdown();
  renderCompanyList();
  if (state.selectedCompanyId === removed.id) {
    state.selectedCompanyId = savedCompanies[0]?.id || '';
    const company = savedCompanies[0];
    if (company) {
      state.clientName = company.name;
      state.clientAddress = company.address;
      state.clientRegNo = company.regNo;
      state.clientRegLabel = company.regLabel;
    }
    saveState();
    render();
  }
}

// ===== Service Management =====
function addService() {
  state.services.push({ desc: '', hours: '', rate: '', amount: 0 });
  rebuildServicesForm();
  saveState();
  render();
}

function removeService(btn) {
  const item = btn.closest('.service-item');
  const index = parseInt(item.dataset.index);
  if (state.services.length <= 1) return;
  state.services.splice(index, 1);
  rebuildServicesForm();
  saveState();
  render();
}

function rebuildServicesForm() {
  const container = document.getElementById('servicesContainer');
  container.innerHTML = state.services.map((svc, i) => `
    <div class="service-item" data-index="${i}">
      <div class="form-group">
        <label>Description</label>
        <input type="text" class="svc-desc" value="${escapeAttr(svc.desc)}">
      </div>
      <div class="form-grid form-grid-3">
        <div class="form-group">
          <label>Hours</label>
          <input type="text" class="svc-hours" value="${escapeAttr(svc.hours || '')}" placeholder="—">
        </div>
        <div class="form-group">
          <label>Rate</label>
          <input type="text" class="svc-rate" value="${escapeAttr(svc.rate || '')}" placeholder="—">
        </div>
        <div class="form-group">
          <label>Amount (€)</label>
          <input type="number" class="svc-amount" value="${svc.amount}" step="0.01">
        </div>
      </div>
      <button class="btn-remove-service" onclick="removeService(this)" title="Remove service">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');
  bindServiceInputs();
}

// ===== Render Preview =====
function render() {
  document.getElementById('invoiceNumberDisplay').textContent = `#${state.invoiceNumber}`;
  document.getElementById('periodDisplay').textContent = state.invoicePeriod || MONTHS[state.invoiceMonth];
  document.getElementById('dateDisplay').textContent = state.invoiceDate || '';
  document.getElementById('dueDateDisplay').textContent = state.dueDate || '';

  // Client
  document.getElementById('clientNameDisplay').textContent = state.clientName;
  document.getElementById('clientAddressDisplay').innerHTML = (state.clientAddress || '').replace(/\n/g, '<br>');
  document.getElementById('clientRegDisplay').innerHTML =
    `<strong>${escapeHtml(state.clientRegLabel || 'COMPANY REGISTRATION NO')}: ${escapeHtml(state.clientRegNo)}</strong>`;

  // Services table
  const tbody = document.getElementById('servicesTableBody');
  let total = 0;
  tbody.innerHTML = state.services.map(svc => {
    const amt = svc.amount || 0;
    total += amt;
    return `
      <div class="table-row">
        <span class="td-services">${escapeHtml(svc.desc || '').toUpperCase()}</span>
        <span class="td-hours">${svc.hours || ''}</span>
        <span class="td-rate">${svc.rate || ''}</span>
        <span class="td-amount">${formatEuro(amt)}</span>
      </div>`;
  }).join('');

  document.getElementById('totalDisplay').textContent = formatEuro(total);
  document.getElementById('balanceDisplay').textContent = formatEuro(total);
}

// ===== Formatting =====
function formatEuro(n) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ===== Save Invoice (to Supabase) =====
async function saveInvoice() {
  recalcDates();
  const total = state.services.reduce((sum, s) => sum + (s.amount || 0), 0);

  const invoice = {
    number: state.invoiceNumber,
    month: state.invoiceMonth,
    year: state.invoiceYear,
    client_name: state.clientName,
    company_id: state.selectedCompanyId || null,
    amount: total,
    status: 'pending',
    invoice_date: state.invoiceDate,
    due_date: state.dueDate,
    services: state.services,
  };

  // Upsert by number+year
  const existing = invoiceHistory.find(
    inv => inv.number === state.invoiceNumber && inv.year === state.invoiceYear
  );

  if (existing) {
    await db.from('invoices').update({
      ...invoice,
      status: existing.status, // preserve status
      updated_at: new Date().toISOString()
    }).eq('id', existing.id);
  } else {
    await db.from('invoices').insert(invoice);
  }

  await loadInvoiceHistory();
  await saveState();

  // Visual feedback
  showToast('Invoice saved');
}

// ===== Toast =====
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// ===== PDF Export (open in new tab) =====
function exportPDF() {
  const invoice = document.getElementById('invoice');
  const win = window.open('', '_blank');
  if (!win) { alert('Please allow popups for this page'); return; }

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
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  const previewArea = document.getElementById('previewArea');
  const calendarArea = document.getElementById('calendarArea');
  const sidebarScroll = document.querySelector('.sidebar-scroll');

  if (tab === 'calendar') {
    previewArea.style.display = 'none';
    calendarArea.style.display = 'flex';
    if (sidebarScroll) sidebarScroll.style.display = 'none';
    renderCalendar();
  } else {
    previewArea.style.display = 'flex';
    calendarArea.style.display = 'none';
    if (sidebarScroll) sidebarScroll.style.display = '';
  }
}

// ===== Calendar: Toggle Status =====
async function cycleInvoiceStatus(id) {
  const inv = invoiceHistory.find(i => i.id === id);
  if (!inv) return;

  const newStatus = STATUS_NEXT[inv.status] || 'processing';
  await db.from('invoices').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
  inv.status = newStatus;
  renderCalendar();
}

// ===== Calendar: Delete =====
async function deleteInvoice(id, event) {
  event.stopPropagation();
  const inv = invoiceHistory.find(i => i.id === id);
  if (inv && confirm(`Delete Invoice #${inv.number} (${inv.clientName})?`)) {
    await db.from('invoices').delete().eq('id', id);
    invoiceHistory = invoiceHistory.filter(i => i.id !== id);
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

  const yearInvoices = invoiceHistory.filter(inv => inv.year === calendarYear);
  const totalAmount = yearInvoices.reduce((s, i) => s + i.amount, 0);
  const doneAmount = yearInvoices.filter(i => i.status === 'done').reduce((s, i) => s + i.amount, 0);
  const pendingAmount = totalAmount - doneAmount;

  document.getElementById('calendarYearTitle').textContent = calendarYear;
  document.getElementById('summaryTotal').textContent = formatEuro(totalAmount);
  document.getElementById('summaryPaid').textContent = formatEuro(doneAmount);
  document.getElementById('summaryPending').textContent = formatEuro(pendingAmount);

  grid.innerHTML = MONTHS.map((monthName, monthIdx) => {
    const monthInvoices = yearInvoices.filter(inv => inv.month === monthIdx);
    const monthTotal = monthInvoices.reduce((s, i) => s + i.amount, 0);
    const isCurrent = calendarYear === currentYear && monthIdx === currentMonth;

    const invoicesHtml = monthInvoices.length > 0
      ? monthInvoices.map(inv => `
          <div class="cal-invoice status-${inv.status}" onclick="cycleInvoiceStatus('${inv.id}')">
            <div class="cal-invoice-status"></div>
            <div class="cal-invoice-info">
              <div class="cal-invoice-client">${escapeHtml(inv.clientName)}</div>
              <div class="cal-invoice-meta">#${inv.number} · ${STATUS_LABELS[inv.status]}</div>
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
