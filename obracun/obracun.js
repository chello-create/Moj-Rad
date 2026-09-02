const monthSelect = document.querySelector('#month-select');
const summaryGrid = document.querySelector('#summary-grid');
const detailsBody = document.querySelector('#details-body');
const emptyCalculation = document.querySelector('#empty-calculation');
const shiftCount = document.querySelector('#shift-count');
const workTotal = document.querySelector('#work-total');
const travelTotal = document.querySelector('#travel-total');
const paymentTotal = document.querySelector('#payment-total');

function renderSummary(summary, config) {
  const items = [
    ['Ukupno radnih sati', `${summary.hours} h`], ['Ukupno dnevnih sati', `${summary.dailyHours} h`], ['Ukupno noćnih sati', `${summary.nightHours} h`], ['Ukupno sati subotom', `${summary.saturdayHours} h`], ['Ukupno sati nedjeljom', `${summary.sundayHours} h`], ['Ukupno sati praznikom', `${summary.holidayHours} h`], ['Osnovna satnica', MojRadCalculation.formatMoney(config.satnica)], ['Putni trošak', MojRadCalculation.formatMoney(config.putniTrosak)]
  ];
  summaryGrid.replaceChildren();
  items.forEach(([label, value]) => { const item = document.createElement('div'); item.className = 'summary-item'; item.innerHTML = `<span>${label}</span><strong>${value}</strong>`; summaryGrid.append(item); });
  workTotal.textContent = MojRadCalculation.formatMoney(summary.amount);
  travelTotal.textContent = MojRadCalculation.formatMoney(config.putniTrosak);
  paymentTotal.textContent = MojRadCalculation.formatMoney(summary.amount + config.putniTrosak);
}

function renderDetails(shifts, config) {
  detailsBody.replaceChildren();
  shifts.forEach((shift) => {
    const breakdown = MojRadCalculation.calculateShift(shift, config);
    const row = document.createElement('tr');
    if (shift.isHoliday) row.className = 'holiday-row';
    const holidayNote = shift.isHoliday ? `<br><span class="holiday-note">Praznik: ${shift.holidayName}</span>` : '';
    const nightNote = shift.type === 'Noćna' && !shift.isHoliday ? '<br><small>8 noćnih + 4 dnevna</small>' : '';
    row.innerHTML = `<td>${shift.date.slice(8, 10)}.${shift.date.slice(5, 7)}.${shift.date.slice(0, 4)}.</td><td>${shift.weekdayName}</td><td>${shift.type}${holidayNote}</td><td>${breakdown.hours}${nightNote}</td><td><div class="formula">${breakdown.formula}<strong>${shift.isHoliday ? 'Iznos: nije obračunat' : `Ukupno: ${MojRadCalculation.formatMoney(breakdown.amount)}`}</strong></div></td><td class="amount">${shift.isHoliday ? 'Nije definisan' : MojRadCalculation.formatMoney(breakdown.amount)}</td>`;
    detailsBody.append(row);
  });
}

function renderCalculation() {
  const config = MojRadConfig.load();
  const shifts = MojRadData.load().filter((shift) => shift.date.startsWith(`${monthSelect.value}-`));
  const summary = MojRadCalculation.calculateMonth(shifts, config);
  shiftCount.textContent = `${shifts.length} ${shifts.length === 1 ? 'smjena' : 'smjena'}`;
  emptyCalculation.hidden = shifts.length > 0;
  renderSummary(summary, config);
  renderDetails(shifts, config);
}

const now = new Date();
monthSelect.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
monthSelect.addEventListener('change', renderCalculation);
renderCalculation();
