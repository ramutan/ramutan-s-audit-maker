(function () {
  const STORAGE_KEY = 'audit_report_data_v1';

  const $ = (id) => document.getElementById(id);
  const totalFundsInput = $('totalFunds');
  const setFundsBtn = $('setFundsBtn');
  const statTotal = $('statTotal');
  const statSpent = $('statSpent');
  const statSaved = $('statSaved');
  const form = $('entryForm');
  const priceInput = $('price');
  const categoryInput = $('category');
  const noteInput = $('note');
  const tableBody = $('tableBody');
  const emptyState = $('emptyState');
  const exportBtn = $('exportBtn');
  const clearBtn = $('clearBtn');

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { console.warn(e); }
    return { totalFunds: 0, entries: [] };
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  function fmt(n) {
    return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function render() {
    totalFundsInput.value = state.totalFunds || '';
    const spent = state.entries.reduce((s, e) => s + Number(e.price), 0);
    const saved = Number(state.totalFunds) - spent;

    statTotal.textContent = fmt(state.totalFunds);
    statSpent.textContent = fmt(spent);
    statSaved.textContent = fmt(saved);
    statSaved.style.color = saved < 0 ? 'var(--red)' : 'var(--green)';

    tableBody.innerHTML = '';
    if (!state.entries.length) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
      let running = Number(state.totalFunds);
      state.entries.forEach((e, i) => {
        running -= Number(e.price);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${i + 1}</td>
          <td>${new Date(e.date).toLocaleString()}</td>
          <td><span class="cat-badge">${escapeHtml(e.category)}</span></td>
          <td>${escapeHtml(e.note || '')}</td>
          <td class="right price-cell">-${fmt(e.price)}</td>
          <td class="right remain-cell" style="color:${running < 0 ? 'var(--red)' : 'var(--green)'}">${fmt(running)}</td>
          <td class="right"><button class="del-btn" data-id="${e.id}" title="Delete">✕</button></td>
        `;
        tableBody.appendChild(tr);
      });
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  setFundsBtn.addEventListener('click', () => {
    const v = parseFloat(totalFundsInput.value);
    if (isNaN(v) || v < 0) { alert('Please enter a valid amount.'); return; }
    state.totalFunds = v;
    save(); render();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const price = parseFloat(priceInput.value);
    const category = categoryInput.value.trim();
    if (isNaN(price) || price <= 0 || !category) return;
    state.entries.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      price, category,
      note: noteInput.value.trim(),
      date: new Date().toISOString()
    });
    save(); render();
    form.reset();
    priceInput.focus();
  });

  tableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.del-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    state.entries = state.entries.filter((x) => x.id !== id);
    save(); render();
  });

  clearBtn.addEventListener('click', () => {
    if (confirm('Clear ALL entries and reset funds? This cannot be undone.')) {
      state = { totalFunds: 0, entries: [] };
      save(); render();
    }
  });

  exportBtn.addEventListener('click', () => {
    const rows = [['#', 'Date', 'Category', 'Note', 'Price', 'Remaining']];
    let running = Number(state.totalFunds);
    state.entries.forEach((e, i) => {
      running -= Number(e.price);
      rows.push([i + 1, new Date(e.date).toLocaleString(), e.category, e.note || '', e.price, running.toFixed(2)]);
    });
    rows.push([]);
    rows.push(['Total Funds', state.totalFunds]);
    rows.push(['Total Spent', state.entries.reduce((s, e) => s + Number(e.price), 0).toFixed(2)]);
    rows.push(['Saved/Remaining', running.toFixed(2)]);
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  render();
})();
