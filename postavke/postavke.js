const settingsForm = document.querySelector('#settings-form');
const saveMessage = document.querySelector('#save-message');
const resetButton = document.querySelector('#reset-settings');
const profileName = document.querySelector('#profile-name');
const aliasInput = document.querySelector('#alias-input');
const aliasList = document.querySelector('#alias-list');
const aliasEmpty = document.querySelector('#alias-empty');
let aliases = [];
const fields = {
  hourlyRate: document.querySelector('#hourly-rate'),
  travelCost: document.querySelector('#travel-cost'),
  regular: document.querySelector('#factor-regular'),
  night: document.querySelector('#factor-night'),
  saturday: document.querySelector('#factor-saturday'),
  sunday: document.querySelector('#factor-sunday'),
  sundayNight: document.querySelector('#factor-sunday-night')
};
const timeLabels = {
  dayStart: document.querySelector('#day-start'), dayEnd: document.querySelector('#day-end'),
  nightStart: document.querySelector('#night-start'), nightEnd: document.querySelector('#night-end')
};

function renderSettings() {
  const config = MojRadConfig.load();
  profileName.value = config.profil.ime;
  aliases = [...config.profil.aliasi];
  fields.hourlyRate.value = config.satnica;
  fields.travelCost.value = config.putniTrosak;
  fields.regular.value = config.faktori.redovanRad;
  fields.night.value = config.faktori.nocniRad;
  fields.saturday.value = config.faktori.dnevniSubotom;
  fields.sunday.value = config.faktori.dnevniNedjeljom;
  fields.sundayNight.value = config.faktori.nocniNedjeljom;
  timeLabels.dayStart.textContent = config.standardneSmjene.dnevna.pocetak;
  timeLabels.dayEnd.textContent = config.standardneSmjene.dnevna.kraj;
  timeLabels.nightStart.textContent = config.standardneSmjene.nocna.pocetak;
  timeLabels.nightEnd.textContent = config.standardneSmjene.nocna.kraj;
  renderAliasList();
}

function renderAliasList() {
  aliasList.replaceChildren();
  aliasEmpty.hidden = aliases.length > 0;
  aliases.forEach((alias, index) => {
    const item = document.createElement('li');
    item.textContent = alias;
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'alias-remove'; remove.textContent = 'Ukloni';
    remove.addEventListener('click', () => { aliases.splice(index, 1); renderAliasList(); });
    item.append(remove); aliasList.append(item);
  });
}

function readNumber(input) { return Number(input.value); }

settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!settingsForm.reportValidity()) return;
  const values = {
    satnica: readNumber(fields.hourlyRate),
    putniTrosak: readNumber(fields.travelCost),
    faktori: {
      redovanRad: readNumber(fields.regular), nocniRad: readNumber(fields.night),
      dnevniSubotom: readNumber(fields.saturday), dnevniNedjeljom: readNumber(fields.sunday),
      nocniNedjeljom: readNumber(fields.sundayNight)
    },
    profil: { ime: profileName.value.trim(), aliasi: aliases }
  };
  MojRadConfig.save(values);
  saveMessage.hidden = false;
});

document.querySelector('#add-alias').addEventListener('click', () => {
  const alias = aliasInput.value.trim();
  if (!alias || aliases.some((item) => item.toLocaleLowerCase() === alias.toLocaleLowerCase())) return;
  aliases.push(alias); aliasInput.value = ''; renderAliasList();
});

resetButton.addEventListener('click', () => {
  if (!window.confirm('Da li želiš vratiti zadane vrijednosti?')) return;
  localStorage.removeItem('mojRad.obracunKonfiguracija');
  renderSettings();
  saveMessage.hidden = false;
  saveMessage.textContent = '✅ Vraćene su zadane vrijednosti.';
});

renderSettings();
