const historyList = document.querySelector('#history-list');
const emptyHistory = document.querySelector('#empty-history');
const detailsDialog = document.querySelector('#details-dialog');
const dialogContent = document.querySelector('#dialog-content');
const closeDialog = document.querySelector('#close-dialog');
const deleteDialog = document.querySelector('#delete-dialog');
const deleteQuestion = document.querySelector('#delete-question');
const confirmDelete = document.querySelector('#confirm-delete');
const cancelDelete = document.querySelector('#cancel-delete');
const pdfHistory = document.querySelector('#pdf-history');
let snapshotToDelete = null;
let snapshotInView = null;

function formatSnapshotDate(dateValue) {
  return `${dateValue.slice(8, 10)}.${dateValue.slice(5, 7)}.${dateValue.slice(0, 4)}.`;
}

function money(value) { return `${Number(value).toFixed(2).replace('.', ',')} KM`; }
function monthTitle(snapshot) { return `${snapshot.monthName.charAt(0).toUpperCase()}${snapshot.monthName.slice(1)} ${snapshot.year}`; }
function value(label, text) { return `<div class="snapshot-value"><span>${label}</span><strong>${text}</strong></div>`; }

function renderHistory() {
  const snapshots = MojRadHistory.load();
  historyList.replaceChildren();
  emptyHistory.hidden = snapshots.length > 0;
  snapshots.forEach((snapshot) => {
    const item = document.createElement('article');
    item.className = 'history-item';
    item.innerHTML = `<div><h2>${monthTitle(snapshot)}</h2><p class="history-meta"><span>${snapshot.summary.shiftCount} smjena</span><span>${snapshot.summary.hours} h</span><span>Spremljeno: ${new Date(snapshot.savedAt).toLocaleDateString('bs-BA')}</span></p><div class="history-finance"><div><span>Rad</span><strong>${money(snapshot.summary.amount)}</strong></div><div><span>Putni</span><strong>${money(snapshot.putniTrosak)}</strong></div><div class="total"><span>Ukupno</span><strong>${money(snapshot.total)}</strong></div></div></div>`;
    const actions = document.createElement('div');
    actions.className = 'history-actions';
    const viewButton = document.createElement('button');
    viewButton.className = 'history-action'; viewButton.type = 'button'; viewButton.textContent = '👁️ Pregled'; viewButton.addEventListener('click', () => showDetails(snapshot));
    const deleteButton = document.createElement('button');
    deleteButton.className = 'history-action delete-history'; deleteButton.type = 'button'; deleteButton.textContent = '🗑️ Obriši'; deleteButton.addEventListener('click', () => {
      snapshotToDelete = snapshot;
      deleteQuestion.textContent = `Da li sigurno želiš obrisati spremljeni obračun za ${monthTitle(snapshot)}?`;
      deleteDialog.showModal();
    });
    actions.append(viewButton, deleteButton); item.append(actions); historyList.append(item);
  });
}

function showDetails(snapshot) {
  snapshotInView = snapshot;
  const factorLabels = [['Redovan rad', snapshot.faktori.redovanRad], ['Noćni rad', snapshot.faktori.nocniRad], ['Dnevni rad subotom', snapshot.faktori.dnevniSubotom], ['Dnevni rad nedjeljom', snapshot.faktori.dnevniNedjeljom], ['Noćni rad nedjeljom', snapshot.faktori.nocniNedjeljom]];
  const rows = snapshot.shifts.map((shift) => `<tr><td>${shift.date.slice(8, 10)}.${shift.date.slice(5, 7)}.${shift.date.slice(0, 4)}.</td><td>${shift.weekdayName}</td><td>${shift.type}</td><td>${shift.hours} h</td><td>${shift.status}</td><td>${shift.start}–${shift.end}</td></tr>`).join('');
  dialogContent.innerHTML = `<div class="dialog-body"><div class="snapshot-summary">${value('Broj smjena', snapshot.summary.shiftCount)}${value('Ukupno sati', `${snapshot.summary.hours} h`)}${value('Dnevni sati', `${snapshot.summary.dailyHours} h`)}${value('Noćni sati', `${snapshot.summary.nightHours} h`)}${value('Subota', `${snapshot.summary.saturdayHours} h`)}${value('Nedjelja', `${snapshot.summary.sundayHours} h`)}${value('Praznici', `${snapshot.summary.holidayHours} h`)}${value('Satnica', money(snapshot.satnica))}${value('Putni', money(snapshot.putniTrosak))}${value('Rad', money(snapshot.summary.amount))}${value('Ukupno', money(snapshot.total))}</div><section class="snapshot-section"><h3>Faktori korišteni u obračunu</h3><div class="snapshot-factors">${factorLabels.map(([label, factor]) => value(label, Number(factor).toFixed(3).replace('.', ','))).join('')}</div></section><section class="snapshot-section"><h3>Detaljne smjene</h3><div class="table-wrap"><table class="snapshot-table"><thead><tr><th>Datum</th><th>Dan</th><th>Smjena</th><th>Sati</th><th>Status</th><th>Vrijeme</th></tr></thead><tbody>${rows}</tbody></table></div></section></div>`;
  detailsDialog.showModal();
}

pdfHistory.addEventListener('click', () => {
  if (!snapshotInView) return;
  MojRadCalculation.createPdf({
    title: `Izvjestaj rada - ${snapshotInView.monthName} ${snapshotInView.year}`,
    filename: `Moj_Rad_${snapshotInView.monthName.charAt(0).toUpperCase()}${snapshotInView.monthName.slice(1)}_${snapshotInView.year}.pdf`,
    summary: snapshotInView.summary,
    satnica: snapshotInView.satnica,
    putniTrosak: snapshotInView.putniTrosak,
    total: snapshotInView.total,
    faktori: snapshotInView.faktori,
    shifts: snapshotInView.shifts.map((shift) => ({ ...shift, date: formatSnapshotDate(shift.date), amountText: shift.amountText || (typeof shift.amount === 'number' ? money(shift.amount) : 'Nije spremljen') }))
  });
});

closeDialog.addEventListener('click', () => detailsDialog.close());
confirmDelete.addEventListener('click', () => { MojRadHistory.remove(snapshotToDelete.id); snapshotToDelete = null; deleteDialog.close(); renderHistory(); });
cancelDelete.addEventListener('click', () => { snapshotToDelete = null; deleteDialog.close(); });
detailsDialog.addEventListener('click', (event) => { if (event.target === detailsDialog) detailsDialog.close(); });
renderHistory();
