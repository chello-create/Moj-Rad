const fileInput = document.querySelector('#txt-file');
const fileName = document.querySelector('#file-name');
const importError = document.querySelector('#import-error');
const previewCard = document.querySelector('#preview-card');
const previewBody = document.querySelector('#preview-body');
const previewCount = document.querySelector('#preview-count');
const previewWarning = document.querySelector('#preview-warning');
const smartSummary = document.querySelector('#smart-summary');
const uncertainPanel = document.querySelector('#uncertain-panel');
const confirmImportButton = document.querySelector('#confirm-import');
const cancelImportButton = document.querySelector('#cancel-import');

const currentYear = new Date().getFullYear();
const monthNames = ['januar', 'februar', 'mart', 'april', 'maj', 'juni', 'juli', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'];
const shiftTypes = {
  first: { type: 'Dnevna', time: '07:00–19:00' },
  second: { type: 'Noćna', time: '19:00–07:00' }
};
let parsedShifts = [];
let uncertainCandidates = [];

function readFileText(file) {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function normalize(value) {
  return value.toLocaleLowerCase('bs-BA').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
}

function formatDate(dateValue) {
  const [year, month, day] = dateValue.split('-');
  return `${day}.${month}.${year}`;
}

function dateFromMatch(match) {
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = match[3] ? Number(match[3]) : currentYear;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return { date, dateValue: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
}

function findShift(text) {
  if (/(?:1\.?\s*smjena|i\.?\s*smjena|prva\s+smjena|dnevna\b|07\s*(?::\s*00)?\s*[-–]\s*19\s*(?::\s*00)?)/i.test(text)) return shiftTypes.first;
  if (/(?:2\.?\s*smjena|ii\.?\s*smjena|druga\s+smjena|noćna\b|19\s*(?::\s*00)?\s*[-–]\s*07\s*(?::\s*00)?)/i.test(text)) return shiftTypes.second;
  return null;
}

function aliasesFor(profile) {
  const full = normalize(profile.ime);
  const words = full.split(' ').filter(Boolean);
  const aliases = [...(profile.aliasi || []).map(normalize).filter(Boolean)];
  if (words.length >= 2) aliases.push(full, `${words[1]} ${words[0]}`, `${words[0][0]} ${words[1]}`);
  return { strong: [...new Set(aliases)], weak: words.length >= 2 ? [words[0], words[words.length - 1]] : [] };
}

function parseLine(line) {
  const dateMatch = line.match(/(\d{1,2})[./-](\d{1,2})(?:[./-](\d{4}))?/);
  const shift = findShift(line);
  if (!dateMatch || !shift) return null;
  const parsedDate = dateFromMatch(dateMatch);
  if (!parsedDate) return null;
  const shiftStart = line.search(/(?:1\.?\s*smjena|i\.?\s*smjena|prva\s+smjena|dnevna\b|07\s*(?::\s*00)?|2\.?\s*smjena|ii\.?\s*smjena|druga\s+smjena|noćna\b|19\s*(?::\s*00)?)/i);
  const beforeShift = line.slice(dateMatch.index + dateMatch[0].length, shiftStart);
  const person = beforeShift.replace(/[|,:;.]+/g, ' ').replace(/[-+]+/g, ' ').trim();
  const details = MojRadData.describeDate(parsedDate.dateValue);
  return { date: parsedDate.dateValue, type: shift.type, time: shift.time, person, ...details };
}

function filterByProfile(rows) {
  const profile = MojRadConfig.load().profil;
  const namedRows = rows.filter((row) => row.person);
  if (!namedRows.length) return { rows, uncertain: [], named: false, profileName: profile.ime || 'Nije odabran' };
  if (!profile.ime.trim()) return { rows: [], uncertain: [...new Set(namedRows.map((row) => row.person))], named: true, profileName: 'Nije odabran' };
  const aliases = aliasesFor(profile);
  const people = [...new Set(namedRows.map((row) => row.person))];
  const matches = namedRows.filter((row) => aliases.strong.some((alias) => normalize(row.person).includes(alias)));
  const weakMatches = namedRows.filter((row) => aliases.weak.some((alias) => normalize(row.person).split(' ').includes(alias)));
  const candidates = people.filter((person) => weakMatches.some((row) => row.person === person) && !matches.some((row) => row.person === person));
  if (matches.length) return { rows: matches, uncertain: candidates, named: true, profileName: profile.ime };
  return { rows: [], uncertain: candidates.length ? candidates : people, named: true, profileName: profile.ime };
}

function statusFor(shift) {
  if (shift.holidayName) return `Praznik: ${shift.holidayName}`;
  if (shift.weekdayType === 'subota') return 'Subota';
  if (shift.weekdayType === 'nedjelja') return 'Nedjelja';
  return shift.type === 'Noćna' ? 'Noćni rad' : 'Radni dan';
}

function rememberFormat(lines, rows) {
  const sample = lines.find((line) => line.trim()) || '';
  const dateStyle = sample.includes('/') ? 'kosa crta' : sample.includes('-') ? 'crtica' : 'tačka';
  const shiftStyle = /\d{1,2}\s*[-–]\s*\d{1,2}/.test(sample) ? 'vrijeme' : 'naziv smjene';
  localStorage.setItem('mojRad.txtFormat', JSON.stringify({ delimiter: sample.includes('|') ? '|' : 'razmak', hasNames: rows.some((row) => row.person), dateStyle, shiftStyle, lastUsedAt: new Date().toISOString() }));
}

function renderUncertain(candidates) {
  uncertainCandidates = candidates;
  uncertainPanel.replaceChildren();
  if (!candidates.length) { uncertainPanel.hidden = true; return; }
  uncertainPanel.hidden = false;
  uncertainPanel.innerHTML = `<strong>⚠️ Potrebna potvrda</strong><p>Pronađeni su mogući zapisi za druge ili nepoznate osobe. Izaberite osobu samo ako pripada vašem profilu.</p>`;
  candidates.forEach((candidate) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = `Da, koristi "${candidate}"`; button.addEventListener('click', () => {
      const config = MojRadConfig.load();
      config.profil.aliasi = [...new Set([...(config.profil.aliasi || []), candidate])];
      MojRadConfig.save({ profil: config.profil, satnica: config.satnica, putniTrosak: config.putniTrosak });
      parsedShifts = parsedShifts.length ? parsedShifts : [];
      const allRows = window.lastParsedRows || [];
      parsedShifts = allRows.filter((row) => row.person === candidate);
      renderPreview();
    });
    uncertainPanel.append(button);
  });
}

function renderPreview() {
  previewBody.replaceChildren();
  parsedShifts.forEach((shift) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${formatDate(shift.date)}</td><td>${shift.weekdayName}</td><td>${shift.type}</td><td>${shift.time}</td><td>${statusFor(shift)}</td>`;
    previewBody.append(row);
  });
  const daily = parsedShifts.filter((shift) => shift.type === 'Dnevna').length;
  const night = parsedShifts.filter((shift) => shift.type === 'Noćna').length;
  const dates = parsedShifts.map((shift) => shift.date).sort();
  previewCount.textContent = `${parsedShifts.length} smjena`;
  confirmImportButton.disabled = parsedShifts.length === 0;
  smartSummary.innerHTML = `<span><b>Prepoznat korisnik:</b> ${MojRadConfig.load().profil.ime || 'nije određen'}</span><span><b>Prepoznato smjena:</b> ${parsedShifts.length}</span><span><b>Dnevnih:</b> ${daily}</span><span><b>Noćnih:</b> ${night}</span>${dates.length ? `<span><b>Period:</b> ${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}</span>` : ''}`;
  const existingDates = parsedShifts.filter((shift) => MojRadData.load().some((saved) => saved.date === shift.date));
  previewWarning.hidden = existingDates.length === 0;
  if (existingDates.length > 0) previewWarning.textContent = `${existingDates.length} datuma već ima sačuvanu smjenu. Potvrdom će biti zamijenjena.`;
  previewCard.hidden = false;
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return;
  fileName.textContent = file.name;
  importError.hidden = true;
  try {
    const text = await readFileText(file);
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const rows = lines.map(parseLine).filter(Boolean);
    window.lastParsedRows = rows;
    rememberFormat(lines, rows);
    const filtered = filterByProfile(rows);
    parsedShifts = filtered.rows;
    if (filtered.named && !parsedShifts.length) {
      showError(filtered.uncertain.length ? `Pronađen je mogući zapis "${filtered.uncertain[0]}". Potvrdite osobu prije uvoza.` : '⚠️ Nisam siguran kako je ovaj raspored organizovan.', false);
      renderUncertain(filtered.uncertain);
      renderPreview();
      return;
    }
    if (!parsedShifts.length) { showError('Nije pronađena nijedna važeća smjena.'); return; }
    renderUncertain(filtered.uncertain);
    renderPreview();
  } catch (error) { showError('Datoteku nije moguće pročitati.'); }
});

function showError(message, hidePreview = true) { importError.textContent = message; importError.hidden = false; previewCard.hidden = hidePreview; }

confirmImportButton.addEventListener('click', () => {
  parsedShifts.forEach((shift) => MojRadData.upsert({ date: shift.date, type: shift.type }));
  previewCard.hidden = true; importError.textContent = `Uspješno je sačuvano ${parsedShifts.length} smjena.`; importError.hidden = false; importError.style.background = '#e2f1e5'; importError.style.color = '#176b52'; parsedShifts = []; fileInput.value = ''; fileName.textContent = 'Nije odabrana datoteka';
});

cancelImportButton.addEventListener('click', () => { parsedShifts = []; previewCard.hidden = true; uncertainPanel.hidden = true; fileInput.value = ''; fileName.textContent = 'Nije odabrana datoteka'; importError.hidden = true; });
