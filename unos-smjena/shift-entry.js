const form = document.querySelector('#shift-form');
const dateInput = document.querySelector('#shift-date');
const typeInput = document.querySelector('#shift-type');
const editingDateInput = document.querySelector('#editing-date');
const weekdayNote = document.querySelector('#weekday-note');
const duplicateWarning = document.querySelector('#duplicate-warning');
const cancelEditButton = document.querySelector('#cancel-edit');
const formStatus = document.querySelector('#form-status');
const shiftList = document.querySelector('#shift-list');
const emptyState = document.querySelector('#empty-state');
const shiftCount = document.querySelector('#shift-count');
const clearShiftsButton = document.querySelector('#clear-shifts');
const clearDialog = document.querySelector('#clear-dialog');
const cancelClear = document.querySelector('#cancel-clear');
const confirmClear = document.querySelector('#confirm-clear');
const bulkMessage = document.querySelector('#bulk-message');
const pasteMonth = document.querySelector('#paste-month');
const pasteInput = document.querySelector('#paste-input');
const recognizePaste = document.querySelector('#recognize-paste');
const pastePreview = document.querySelector('#paste-preview');
const pastePreviewBody = document.querySelector('#paste-preview-body');
const pasteCount = document.querySelector('#paste-count');
const pasteSummary = document.querySelector('#paste-summary');
const pasteWarning = document.querySelector('#paste-warning');
const addPasteShifts = document.querySelector('#add-paste-shifts');
const cancelPaste = document.querySelector('#cancel-paste');
const pasteMessage = document.querySelector('#paste-message');
const imageInput = document.querySelector('#schedule-image');
const imageName = document.querySelector('#image-name');
const imagePreview = document.querySelector('#image-preview');
const analyzeImage = document.querySelector('#analyze-image');
const imageMessage = document.querySelector('#image-message');

const typeTimes = { Dnevna: '07:00–19:00', Noćna: '19:00–07:00', 'Slobodan dan': 'Bez radnog vremena' };
const weekdayNames = { 'radni dan': 'ponedjeljak–petak', subota: 'subota', nedjelja: 'nedjelja' };
const dateFormatter = new Intl.DateTimeFormat('bs-BA', { day: '2-digit', month: '2-digit', year: 'numeric' });
let recognizedPasteShifts = [];
let uncertainPasteRows = [];
let imageObjectUrl = null;

function currentPasteMonth() {
  const now = new Date();
  return pasteMonth.value || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function parsePastedLine(line) {
  const cleaned = line.trim().replace(/^\s*(?:[-*•]\s*|\d+\s*[.)]\s+(?=\d{1,2}[./-]))/, '');
  const dateMatch = cleaned.match(/(\d{1,2})\s*[./-]\s*(\d{1,2})(?:\s*[./-]\s*(\d{4}))?/);
  if (!dateMatch) return { line, reason: 'Datum nije prepoznat' };
  const [defaultYear] = currentPasteMonth().split('-').map(Number);
  const year = dateMatch[3] ? Number(dateMatch[3]) : defaultYear;
  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return { line, reason: 'Datum nije važeći' };
  const remainder = cleaned.slice(dateMatch.index + dateMatch[0].length);
  const firstShift = /(?:1\.?\s*smjena|i\.?\s*smjena|prva(?:\s+smjena)?\b|dnevna\b|07\s*(?::\s*00)?\s*[-–]\s*19\s*(?::\s*00)?)/i;
  const secondShift = /(?:2\.?\s*smjena|ii\.?\s*smjena|druga(?:\s+smjena)?\b|noćna\b|19\s*(?::\s*00)?\s*[-–]\s*07\s*(?::\s*00)?)/i;
  const shift = firstShift.test(remainder) ? { type: 'Dnevna', time: '07:00–19:00' } : secondShift.test(remainder) ? { type: 'Noćna', time: '19:00–07:00' } : null;
  if (!shift) return { line, reason: 'Vrsta smjene nije prepoznata' };
  const dateValue = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { date: dateValue, ...shift, ...MojRadData.describeDate(dateValue) };
}

function pasteStatus(shift) {
  if (shift.holidayName) return `Praznik: ${shift.holidayName}`;
  if (shift.weekdayType === 'subota') return 'Subota';
  if (shift.weekdayType === 'nedjelja') return 'Nedjelja';
  return shift.type === 'Noćna' ? 'Noćni rad' : 'Radni dan';
}

function renderPastePreview() {
  pastePreviewBody.replaceChildren();
  recognizedPasteShifts.forEach((shift) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${shift.date.slice(8, 10)}.${shift.date.slice(5, 7)}.${shift.date.slice(0, 4)}.</td><td>${shift.type}</td><td>${shift.time}</td><td>${pasteStatus(shift)}</td>`;
    pastePreviewBody.append(row);
  });
  uncertainPasteRows.forEach((item) => {
    const row = document.createElement('tr'); row.className = 'uncertain-paste-row';
    row.innerHTML = `<td colspan="3">${item.line}</td><td>⚠️ Nije sigurno prepoznato: ${item.reason}</td>`;
    pastePreviewBody.append(row);
  });
  const daily = recognizedPasteShifts.filter((shift) => shift.type === 'Dnevna').length;
  const night = recognizedPasteShifts.filter((shift) => shift.type === 'Noćna').length;
  pasteCount.textContent = `Pronađeno: ${recognizedPasteShifts.length} smjena`;
  pasteSummary.innerHTML = `<span><b>Dnevnih:</b> ${daily}</span><span><b>Noćnih:</b> ${night}</span>${uncertainPasteRows.length ? `<span><b>Nesigurnih:</b> ${uncertainPasteRows.length}</span>` : ''}`;
  pasteWarning.hidden = uncertainPasteRows.length === 0;
  pasteWarning.textContent = uncertainPasteRows.length ? `${uncertainPasteRows.length} redova nije sigurno prepoznato i neće biti dodano.` : '';
  const existingDates = recognizedPasteShifts.filter((shift) => MojRadData.load().some((saved) => saved.date === shift.date));
  if (existingDates.length) { pasteWarning.hidden = false; pasteWarning.textContent += ` ${existingDates.length} smjena već postoji i neće biti duplirano.`; }
  addPasteShifts.disabled = recognizedPasteShifts.length === 0;
  pastePreview.hidden = false;
}

function updateDateDetails() {
  if (!dateInput.value) {
    weekdayNote.textContent = 'Odaberite datum';
    duplicateWarning.hidden = true;
    return;
  }

  const weekdayType = MojRadData.getWeekdayType(dateInput.value);
  weekdayNote.textContent = `Dan u sedmici: ${MojRadData.getWeekdayName(dateInput.value)}`;
  const existing = MojRadData.load().some((shift) => shift.date === dateInput.value && shift.date !== editingDateInput.value);
  duplicateWarning.hidden = !existing;
}

function resetForm() {
  form.reset();
  editingDateInput.value = '';
  formStatus.textContent = 'Novi unos';
  cancelEditButton.hidden = true;
  updateDateDetails();
}

function editShift(shift) {
  dateInput.value = shift.date;
  editingDateInput.value = shift.date;
  typeInput.value = shift.type;
  formStatus.textContent = 'Izmjena unosa';
  cancelEditButton.hidden = false;
  updateDateDetails();
  dateInput.focus();
}

function renderShifts() {
  const shifts = MojRadData.load();
  shiftList.replaceChildren();
  emptyState.hidden = shifts.length > 0;
  shiftCount.textContent = `${shifts.length} ${shifts.length === 1 ? 'zapis' : 'zapisa'}`;

  shifts.forEach((shift) => {
    const item = document.createElement('article');
    item.className = 'shift-item';
    const status = shift.holidayName ? `Praznik: ${shift.holidayName}` : shift.weekdayType === 'subota' ? 'Subota' : shift.weekdayType === 'nedjelja' ? 'Nedjelja' : 'Radni dan';
    item.innerHTML = `<div><p class="shift-date">${dateFormatter.format(new Date(`${shift.date}T12:00:00`))}</p><p class="shift-detail"><span class="shift-kind">${shift.type}</span> · ${typeTimes[shift.type]} · ${shift.weekdayName || weekdayNames[shift.weekdayType]} · <span class="shift-status">${status}</span></p></div>`;

    const actions = document.createElement('div');
    actions.className = 'shift-actions';
    const editButton = document.createElement('button');
    editButton.className = 'shift-action';
    editButton.type = 'button';
    editButton.textContent = 'Uredi';
    editButton.addEventListener('click', () => editShift(shift));
    const deleteButton = document.createElement('button');
    deleteButton.className = 'shift-action delete-action';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Obriši';
    deleteButton.addEventListener('click', () => {
      if (window.confirm('Obrisati ovu smjenu?')) {
        MojRadData.remove(shift.date);
        if (editingDateInput.value === shift.date) resetForm();
        renderShifts();
      }
    });
    actions.append(editButton, deleteButton);
    item.append(actions);
    shiftList.append(item);
  });
}

clearShiftsButton.addEventListener('click', () => {
  clearDialog.showModal();
});

cancelClear.addEventListener('click', () => clearDialog.close());
confirmClear.addEventListener('click', () => {
  MojRadData.clear();
  clearDialog.close();
  resetForm();
  renderShifts();
  bulkMessage.hidden = false;
});

dateInput.addEventListener('change', updateDateDetails);
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const existing = MojRadData.load().find((shift) => shift.date === dateInput.value);
  if (existing && existing.date !== editingDateInput.value && !window.confirm('Za ovaj datum već postoji smjena. Zamijeniti postojeći unos?')) return;
  MojRadData.upsert({ date: dateInput.value, type: typeInput.value });
  resetForm();
  renderShifts();
});
cancelEditButton.addEventListener('click', resetForm);

renderShifts();
updateDateDetails();

const now = new Date();
pasteMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

recognizePaste.addEventListener('click', () => {
  const lines = pasteInput.value.split(/\r?\n/).filter((line) => line.trim());
  const parsed = lines.map(parsePastedLine);
  const seenDates = new Set();
  recognizedPasteShifts = [];
  uncertainPasteRows = [];
  parsed.forEach((item) => {
    if (item.reason) { uncertainPasteRows.push(item); return; }
    if (seenDates.has(item.date) || MojRadData.load().some((shift) => shift.date === item.date)) return;
    seenDates.add(item.date);
    recognizedPasteShifts.push(item);
  });
  if (!lines.length) {
    pasteMessage.textContent = 'Zalijepite listu smjena prije prepoznavanja.';
    pasteMessage.hidden = false;
    pastePreview.hidden = true;
    return;
  }
  pasteMessage.hidden = true;
  renderPastePreview();
});

addPasteShifts.addEventListener('click', () => {
  recognizedPasteShifts.forEach((shift) => MojRadData.upsert({ date: shift.date, type: shift.type }));
  pasteMessage.textContent = `✅ Dodano je ${recognizedPasteShifts.length} smjena.`;
  pasteMessage.hidden = false;
  pastePreview.hidden = true;
  pasteInput.value = '';
  recognizedPasteShifts = [];
  renderShifts();
});

cancelPaste.addEventListener('click', () => {
  pastePreview.hidden = true;
  pasteMessage.hidden = true;
  recognizedPasteShifts = [];
  uncertainPasteRows = [];
});

imageInput.addEventListener('change', () => {
  const image = imageInput.files[0];
  if (!image) return;
  if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
  imageObjectUrl = URL.createObjectURL(image);
  imagePreview.src = imageObjectUrl;
  imagePreview.hidden = false;
  imageName.textContent = image.name;
  analyzeImage.disabled = false;
  imageMessage.hidden = true;
});

analyzeImage.addEventListener('click', async () => {
  const image = imageInput.files[0];
  if (!image) return;
  if (!('TextDetector' in window)) {
    imageMessage.textContent = '⚠️ Lokalni OCR nije dostupan u ovom browseru. Slika nije automatski uvezena; možete prepisati ili zalijepiti tekst u polje iznad.';
    imageMessage.hidden = false;
    return;
  }

  analyzeImage.disabled = true;
  imageMessage.textContent = 'Analiziram sliku lokalno...';
  imageMessage.hidden = false;
  try {
    const detector = new TextDetector();
    const detected = await detector.detect(imagePreview);
    const text = detected.map((item) => item.rawValue).join('\n');
    if (!text.trim()) throw new Error('empty');
    pasteInput.value = text;
    recognizePaste.click();
    imageMessage.textContent = 'Tekst je proslijeđen u Smart pregled. Provjerite svaki red prije dodavanja.';
  } catch (error) {
    imageMessage.textContent = '⚠️ OCR nije dovoljno sigurno pročitao ovu sliku. Ništa nije dodano; koristite paste polje za provjeru.';
  } finally {
    analyzeImage.disabled = false;
  }
});
