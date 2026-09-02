const monthSelect = document.querySelector('#month-select');
const summaryGrid = document.querySelector('#summary-grid');
const detailsBody = document.querySelector('#details-body');
const emptyMonth = document.querySelector('#empty-month');
const shiftCount = document.querySelector('#shift-count');
const workTotal = document.querySelector('#work-total');
const travelTotal = document.querySelector('#travel-total');
const paymentTotal = document.querySelector('#payment-total');
const saveCalculation = document.querySelector('#save-calculation');
const updateDialog = document.querySelector('#update-dialog');
const confirmUpdate = document.querySelector('#confirm-update');
const cancelUpdate = document.querySelector('#cancel-update');
const pdfCalculation = document.querySelector('#pdf-calculation');
let currentSummary = null;

function renderSummary(summary, config) {
  const items = [
    ['Broj smjena', `${summary.shiftCount}`], ['Ukupno radnih sati', `${summary.hours} h`], ['Ukupno dnevnih sati', `${summary.dailyHours} h`], ['Ukupno noćnih sati', `${summary.nightHours} h`], ['Ukupno sati subotom', `${summary.saturdayHours} h`], ['Ukupno sati nedjeljom', `${summary.sundayHours} h`], ['Ukupno sati praznikom', `${summary.holidayHours} h`], ['Osnovna satnica', MojRadCalculation.formatMoney(config.satnica)], ['Putni trošak', MojRadCalculation.formatMoney(config.putniTrosak)]
  ];
  summaryGrid.replaceChildren();
  items.forEach(([label, value]) => { const item = document.createElement('div'); item.className = 'summary-item'; item.innerHTML = `<span>${label}</span><strong>${value}</strong>`; summaryGrid.append(item); });
  workTotal.textContent = MojRadCalculation.formatMoney(summary.amount);
  travelTotal.textContent = MojRadCalculation.formatMoney(config.putniTrosak);
  paymentTotal.textContent = MojRadCalculation.formatMoney(summary.amount + config.putniTrosak);
}

function statusFor(shift) {
  if (shift.holidayName) return `Praznik: ${shift.holidayName}`;
  if (shift.weekdayType === 'subota') return 'Subota';
  if (shift.weekdayType === 'nedjelja') return 'Nedjelja';
  if (shift.type === 'Noćna') return 'Noćni rad';
  return 'Redovan rad';
}

function renderDetails(shifts) {
  detailsBody.replaceChildren();
  shifts.forEach((shift) => {
    const row = document.createElement('tr');
    const status = statusFor(shift);
    if (shift.isHoliday) row.className = 'holiday-row';
    const statusClass = shift.isHoliday || shift.weekdayType === 'subota' || shift.weekdayType === 'nedjelja' ? 'status weekend' : 'status';
    row.innerHTML = `<td>${shift.date.slice(8, 10)}.${shift.date.slice(5, 7)}.${shift.date.slice(0, 4)}.</td><td>${shift.weekdayName}</td><td>${shift.type}</td><td>${shift.type === 'Slobodan dan' ? '0' : '12'} h</td><td class="${statusClass}">${status}</td>`;
    detailsBody.append(row);
  });
}

function renderMonthlyReview() {
  const config = MojRadConfig.load();
  const shifts = MojRadData.load().filter((shift) => shift.date.startsWith(`${monthSelect.value}-`));
  const summary = { ...MojRadCalculation.calculateMonth(shifts, config), shiftCount: shifts.length };
  currentSummary = { summary, config, shifts };
  shiftCount.textContent = `${shifts.length} ${shifts.length === 1 ? 'smjena' : 'smjena'}`;
  emptyMonth.hidden = shifts.length > 0;
  renderSummary(summary, config);
  renderDetails(shifts);
}

function createSnapshot() {
  const { summary, config, shifts } = currentSummary;
  const [year, month] = monthSelect.value.split('-').map(Number);
  return {
    id: `${year}-${String(month).padStart(2, '0')}`,
    year,
    month,
    monthName: ['januar', 'februar', 'mart', 'april', 'maj', 'juni', 'juli', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'][month - 1],
    savedAt: new Date().toISOString(),
    satnica: config.satnica,
    putniTrosak: config.putniTrosak,
    total: summary.amount + config.putniTrosak,
    summary: JSON.parse(JSON.stringify(summary)),
    faktori: JSON.parse(JSON.stringify(config.faktori)),
    shifts: shifts.map((shift) => ({
      date: shift.date,
      weekdayName: shift.weekdayName,
      type: shift.type,
      start: shift.type === 'Noćna' ? config.standardneSmjene.nocna.pocetak : shift.type === 'Dnevna' ? config.standardneSmjene.dnevna.pocetak : '-',
      end: shift.type === 'Noćna' ? config.standardneSmjene.nocna.kraj : shift.type === 'Dnevna' ? config.standardneSmjene.dnevna.kraj : '-',
      hours: shift.type === 'Slobodan dan' ? 0 : 12,
      status: shift.holidayName ? `Praznik: ${shift.holidayName}` : shift.type === 'Noćna' ? 'Noćni rad' : shift.weekdayType === 'subota' ? 'Subota' : shift.weekdayType === 'nedjelja' ? 'Nedjelja' : 'Redovan rad',
      amount: MojRadCalculation.calculateShift(shift, config).amount,
      amountText: MojRadCalculation.formatMoney(MojRadCalculation.calculateShift(shift, config).amount)
    }))
  };
}

function createCurrentPdfReport() {
  const { summary, config, shifts } = currentSummary;
  const [year, month] = monthSelect.value.split('-').map(Number);
  const monthName = ['januar', 'februar', 'mart', 'april', 'maj', 'juni', 'juli', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'][month - 1];
  return {
    title: `Izvjestaj rada - ${monthName} ${year}`,
    filename: `Moj_Rad_${monthName.charAt(0).toUpperCase()}${monthName.slice(1)}_${year}.pdf`,
    summary,
    satnica: config.satnica,
    putniTrosak: config.putniTrosak,
    total: summary.amount + config.putniTrosak,
    faktori: config.faktori,
    shifts: shifts.map((shift) => {
      const breakdown = MojRadCalculation.calculateShift(shift, config);
      return { date: `${shift.date.slice(8, 10)}.${shift.date.slice(5, 7)}.${shift.date.slice(0, 4)}.`, weekdayName: shift.weekdayName, type: shift.type, hours: breakdown.hours, start: shift.type === 'Noćna' ? config.standardneSmjene.nocna.pocetak : shift.type === 'Dnevna' ? config.standardneSmjene.dnevna.pocetak : '-', end: shift.type === 'Noćna' ? config.standardneSmjene.nocna.kraj : shift.type === 'Dnevna' ? config.standardneSmjene.dnevna.kraj : '-', status: statusFor(shift), amountText: MojRadCalculation.formatMoney(breakdown.amount) };
    })
  };
}

function saveCurrentSnapshot() {
  const result = MojRadHistory.upsert(createSnapshot());
  window.alert(result.wasUpdate ? 'Obračun je ažuriran u Historiji.' : 'Obračun je spremljen u Historiju.');
}

saveCalculation.addEventListener('click', () => {
  if (!currentSummary || currentSummary.shifts.length === 0) {
    window.alert('Nema smjena za spremanje u izabranom mjesecu.');
    return;
  }
  const [year, month] = monthSelect.value.split('-').map(Number);
  const existing = MojRadHistory.find(year, month);
  if (existing) { updateDialog.showModal(); return; }
  saveCurrentSnapshot();
});

confirmUpdate.addEventListener('click', () => { updateDialog.close(); saveCurrentSnapshot(); });
cancelUpdate.addEventListener('click', () => updateDialog.close());
pdfCalculation.addEventListener('click', () => {
  if (currentSummary && currentSummary.shifts.length > 0) MojRadCalculation.createPdf(createCurrentPdfReport());
});

const now = new Date();
monthSelect.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
monthSelect.addEventListener('change', renderMonthlyReview);
renderMonthlyReview();
