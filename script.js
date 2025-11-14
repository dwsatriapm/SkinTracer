
        // ---------- Config ----------
        const startDate = new Date(2025, 10, 14); const daysTotal = 28; const STORAGE_KEY = 'skintracker_2025_14nov_v2';

        // ---------- Clock & Theme ----------
        function updateClock() { const now = new Date(); document.getElementById('time').textContent = now.toLocaleTimeString('id-ID'); document.getElementById('date').textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
        setInterval(updateClock, 1000); updateClock();
        const themeSel = document.getElementById('themeSel'); const root = document.body; themeSel.addEventListener('change', () => { root.setAttribute('data-theme', themeSel.value); localStorage.setItem('skin_theme', themeSel.value); }); const savedTheme = localStorage.getItem('skin_theme') || 'light'; themeSel.value = savedTheme; root.setAttribute('data-theme', savedTheme);


        // ---------- Table init ----------
        const tbody = document.querySelector(`#trackerTable tbody`);
        function fmtDate(d) { return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
        function scheduleForDay(i) { const d = new Date(startDate); d.setDate(startDate.getDate() + i); let products = ''; if (i <= 6) products = 'Facewash'; else if (i <= 13) products = 'Facewash + Micellar Water'; else if (i <= 20) products = 'Facewash + Micellar Water + Moisturizer'; else products = 'Facewash + Micellar Water + Moisturizer + Sunscreen (pagi)'; return { date: fmtDate(d), dayNo: i + 1, products }; }

        function createRow(i, data) { const tr = document.createElement('tr'); tr.dataset.index = i; const s = scheduleForDay(i); tr.innerHTML = `<td>${s.date}</td><td>${s.dayNo}</td><td>${s.products}</td><td contenteditable="true" class="cell-pagi"></td><td contenteditable="true" class="cell-malam"></td><td><select class="select reaction-select"><option value="aman">✅ Aman</option><option value="ringan">⚠ Ringan</option><option value="iritasi">❌ Iritasi</option><option value="kering">💧 Kering</option><option value="breakout">🔴 Breakout</option></select></td><td contenteditable="true" class="cell-area"></td><td class="cell-photo"></td>`; if (data) { tr.querySelector('.cell-pagi').textContent = data.pagi || ''; tr.querySelector('.cell-malam').textContent = data.malam || ''; tr.querySelector('.cell-area').textContent = data.area || ''; tr.querySelector('.reaction-select').value = data.reaction || 'aman'; if (data.photo) insertPhoto(tr, data.photo); } tbody.appendChild(tr); }

        function initRows(saved) { tbody.innerHTML = ''; for (let i = 0; i < daysTotal; i++) createRow(i, saved ? saved[i] : null); }

        // photos
        function insertPhoto(tr, dataUrl) { const td = tr.querySelector('.cell-photo'); td.innerHTML = ''; const img = document.createElement('img'); img.src = dataUrl; img.className = 'photo-thumb'; img.style.cursor = 'pointer'; img.addEventListener('click', () => { openLightbox(dataUrl); }); const del = document.createElement('button'); del.textContent = '🗑'; del.style.border = 'none'; del.style.background = 'transparent'; del.style.cursor = 'pointer'; del.addEventListener('click', () => { td.innerHTML = ''; saveAll(); renderTimeline(); }); td.appendChild(img); td.appendChild(del); }

        function openLightbox(src) { const w = window.open(''); w.document.write(`<img src="${src}" style="max-width:100%;height:auto">`); }

        tbody.addEventListener('dblclick', (e) => { const td = e.target.closest('td'); if (!td) return; if (!td.classList.contains('cell-photo')) return; const tr = td.closest('tr'); const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = async (ev) => { const f = ev.target.files[0]; if (!f) return; const url = await toBase64(f); insertPhoto(tr, url); saveAll(); renderTimeline(); }; inp.click(); });
        function toBase64(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); }

        // storage
        function saveAll() { const rows = []; document.querySelectorAll('#trackerTable tbody tr').forEach(tr => { rows.push({ pagi: tr.querySelector('.cell-pagi').textContent.trim(), malam: tr.querySelector('.cell-malam').textContent.trim(), area: tr.querySelector('.cell-area').textContent.trim(), reaction: tr.querySelector('.reaction-select').value, photo: tr.querySelector('.cell-photo img') ? tr.querySelector('.cell-photo img').src : '' }); }); localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), rows })); showToast('Data tersimpan lokal'); updateAll(); }
        function loadAll() { try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return null; const parsed = JSON.parse(raw); return parsed.rows; } catch (e) { return null } }
        function resetAll() { if (!confirm('Reset semua data?')) return; localStorage.removeItem(STORAGE_KEY); initRows(); updateAll(); }

        // summary & AI local analysis
        const ctx = document.getElementById('trendChart').getContext('2d'); let chart = null;
        function updateAll() { updateSummary(); renderChart(); renderTimeline(); }
        function updateSummary() {
            const rows = document.querySelectorAll('#trackerTable tbody tr'); let safe = 0, ringan = 0, irit = 0, kering = 0, breakout = 0; rows.forEach(tr => { const v = tr.querySelector('.reaction-select').value; if (v === 'aman') safe++; if (v === 'ringan') ringan++; if (v === 'iritasi') irit++; if (v === 'kering') kering++; if (v === 'breakout') breakout++; }); // AI simple inference
            const total = rows.length; const bad = irit + breakout; const score = Math.max(0, 100 - Math.round((bad / total) * 200)); let summary = 'Kondisi stabil.'; if (breakout > 3) summary = 'Perhatian: breakout berulang. Pertimbangkan hentikan produk terakhir.'; else if (irit > 2) summary = 'Iritasi berulang. Coba hentikan produk paling baru.'; else if (ringan > 4) summary = 'Beberapa reaksi ringan, amati lebih lanjut.'; document.getElementById('aiSummary').textContent = summary; document.getElementById('safeDays').textContent = safe || 0; document.getElementById('reactDays').textContent = bad || 0; document.getElementById('totalDays').textContent = total;
        }

        function renderChart() {
            const labels = []; const data = []; document.querySelectorAll('#trackerTable tbody tr').forEach(tr => { labels.push(tr.cells[0].textContent); const v = tr.querySelector('.reaction-select').value; let val = 0; if (v === 'aman') val = 0; if (v === 'ringan') val = 1; if (v === 'kering') val = 1; if (v === 'iritasi') val = 2; if (v === 'breakout') val = 3; data.push(val); }); if (chart) chart.destroy(); chart = new Chart(ctx, { type: 'line', data: { labels, datasets: [{ label: 'Skor Reaksi (0=aman,3=breakout)', data, tension: 0.3, fill: true, backgroundColor: 'rgba(96,165,250,0.12)', borderColor: 'rgba(96,165,250,0.9)', pointRadius: 4 }] }, options: { scales: { y: { beginAtZero: true, suggestedMax: 3, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } } });
        }

        // timeline
        function renderTimeline() { const container = document.getElementById('timeline'); container.innerHTML = ''; document.querySelectorAll('#trackerTable tbody tr').forEach(tr => { const img = tr.querySelector('.cell-photo img'); if (img) { const item = document.createElement('div'); item.className = 'tl-item'; item.innerHTML = `<div style='font-size:12px;color:var(--muted)'>${tr.cells[0].textContent}</div><div style='margin-top:6px'><img src='${img.src}' style='width:100%;height:90px;object-fit:cover;border-radius:6px;cursor:pointer' onclick='window.open("${img.src}")'></div>`; container.appendChild(item); } }); }

        // quick editor
        function fillToday() { const today = new Date(); const s = fmtDate(today); let found = false; document.querySelectorAll('#trackerTable tbody tr').forEach(tr => { if (tr.cells[0].textContent === s) { found = true; openQuick(tr); } }); if (!found) alert('Tidak ada entry untuk tanggal hari ini dalam periode tracker'); }
        function openQuick(tr) { const pagi = prompt('Ringkasan pagi', tr.querySelector('.cell-pagi').textContent) || ''; tr.querySelector('.cell-pagi').textContent = pagi; const malam = prompt('Ringkasan malam', tr.querySelector('.cell-malam').textContent) || ''; tr.querySelector('.cell-malam').textContent = malam; const area = prompt('Area yang terdampak (pisah koma)', tr.querySelector('.cell-area').textContent) || ''; tr.querySelector('.cell-area').textContent = area; const sel = prompt('Pilih reaksi: 1.Aman 2.Ringan 3.Iritasi 4.Kering 5.Breakout', '1'); const map = ['aman', 'ringan', 'iritasi', 'kering', 'breakout']; const idx = parseInt(sel) || 1; tr.querySelector('.reaction-select').value = map[Math.max(0, idx - 1)]; saveAll(); }

        // search & filter
        document.getElementById('filterSelect').addEventListener('change', (e) => { applyFilters(); }); document.getElementById('searchBox').addEventListener('input', () => { applyFilters(); });
        function applyFilters() { const f = document.getElementById('filterSelect').value; const q = document.getElementById('searchBox').value.toLowerCase(); document.querySelectorAll('#trackerTable tbody tr').forEach(tr => { const val = tr.querySelector('.reaction-select').value; const text = (tr.cells[0].textContent + ' ' + tr.cells[2].textContent + ' ' + tr.querySelector('.cell-area').textContent + ' ' + tr.querySelector('.cell-pagi').textContent + ' ' + tr.querySelector('.cell-malam').textContent).toLowerCase(); let show = true; if (f === 'aman' && val !== 'aman') show = false; if (f === 'react' && val === 'aman') show = false; if (q && !text.includes(q)) show = false; tr.style.display = show ? '' : 'none'; }); }

        // export/import
        function exportCSV() { const arr = collectRows(); const csv = toCSV(arr); downloadFile(csv, 'skintracker.csv', 'text/csv'); }
        function exportJSON() { const arr = collectRows(); downloadFile(JSON.stringify({ meta: { start: '2025-11-14', end: '2025-12-11' }, data: arr }), 'skintracker.json', 'application/json'); }
        function collectRows() { return Array.from(document.querySelectorAll('#trackerTable tbody tr')).map(tr => ({ tanggal: tr.cells[0].textContent, hari: tr.cells[1].textContent, produk: tr.cells[2].textContent, pagi: tr.querySelector('.cell-pagi').textContent, malam: tr.querySelector('.cell-malam').textContent, reaction: tr.querySelector('.reaction-select').value, area: tr.querySelector('.cell-area').textContent, photo: tr.querySelector('.cell-photo img' ? '.cell-photo img' : '') ? (tr.querySelector('.cell-photo img') ? tr.querySelector('.cell-photo img').src : '') : '' })); }
        function toCSV(arr) {
            if (!arr.length) return ''; const keys = Object.keys(arr[0]); const lines = [keys.join(',')]; arr.forEach(r => { lines.push(keys.map(k => `${String(r[k] || '').replace(/"/g, '""')}`).join(',')); }); return lines.join(`
`);
        }
        function downloadFile(content, name, type) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url); }

        function importJSON() { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json'; inp.onchange = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const parsed = JSON.parse(r.result); if (parsed && parsed.data) { parsed.data.forEach((it, i) => { const tr = document.querySelector(`#trackerTable tbody tr[data-index="${i}"]`); if (!tr) return; tr.querySelector('.cell-pagi').textContent = it.pagi || ''; tr.querySelector('.cell-malam').textContent = it.malam || ''; tr.querySelector('.cell-area').textContent = it.area || ''; tr.querySelector('.reaction-select').value = it.reaction || 'aman'; if (it.photo) insertPhoto(tr, it.photo); }); saveAll(); alert('Diimpor'); } } catch (err) { alert('Error file'); } }; r.readAsText(f); }; inp.click(); }

        // reminders
        let remTimers = [];
        function askNotif() { if (Notification.permission === 'default') Notification.requestPermission(); }
        function setReminder(timeStr, label) { // timeStr HH:MM
            const [hh, mm] = timeStr.split(':').map(Number); // clear previous same label
            remTimers = remTimers.filter(t => t.label !== label);
            const id = setInterval(() => { const n = new Date(); if (n.getHours() === hh && n.getMinutes() === mm) { showNotification(label + ' — Waktunya skincare!'); } }, 1000 * 30); remTimers.push({ id, label }); localStorage.setItem('skin_reminders', JSON.stringify(remTimers.map(r => r.label))); showToast('Reminder diset: ' + label);
        }
        function clearReminders() { remTimers.forEach(r => clearInterval(r.id)); remTimers = []; localStorage.removeItem('skin_reminders'); showToast('Reminder dihapus'); }
        function showNotification(text) { if (Notification.permission === 'granted') { new Notification('Skin Tracker', { body: text }); } else { alert(text); } }

        // light init and wiring
        document.getElementById('addToday').addEventListener('click', fillToday);
        document.getElementById('saveAll').addEventListener('click', saveAll);
        document.getElementById('exportCSV').addEventListener('click', exportCSV);
        document.getElementById('exportJSON').addEventListener('click', exportJSON);
        document.getElementById('setRem').addEventListener('click', () => { askNotif(); setReminder(document.getElementById('remTime').value, 'Skincare Pagi'); });
        document.getElementById('setRem2').addEventListener('click', () => { askNotif(); setReminder(document.getElementById('remTime2').value, 'Skincare Malam'); });
        document.getElementById('clearRem').addEventListener('click', clearReminders);

        // load saved
        const saved = loadAll(); initRows(saved); // attach change listeners
        tbody.addEventListener('change', () => { saveAll(); }); tbody.addEventListener('input', () => { });
        document.querySelectorAll('.reaction-select').forEach(el => el.addEventListener('change', saveAll));
        updateAll(); renderTimeline();

        // allow ctrl+s
        window.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveAll(); showToast('Saved'); } });

        // toast
        function showToast(msg) { const el = document.createElement('div'); el.textContent = msg; el.style.position = 'fixed'; el.style.right = '18px'; el.style.bottom = '18px'; el.style.background = 'rgba(16,185,129,0.12)'; el.style.padding = '10px 12px'; el.style.borderRadius = '10px'; el.style.boxShadow = '0 8px 24px rgba(16,24,40,0.06)'; document.body.appendChild(el); setTimeout(() => el.remove(), 1800); }

        // quick bind export/import for UI
        // small UI stats placeholders
        const statWrap = document.createElement('div'); statWrap.style.display = 'none'; document.body.appendChild(statWrap);