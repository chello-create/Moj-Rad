(function () {
  const storageKey = 'mojRad.obracunKonfiguracija';
  const defaults = {
    satnica: 8,
    putniTrosak: 150,
    faktori: {
      redovanRad: 1,
      nocniRad: 1.7,
      dnevniSubotom: 1.2,
      dnevniNedjeljom: 1.5,
      nocniNedjeljom: 2.2,
      praznik: null
    },
    standardneSmjene: {
      dnevna: { pocetak: '07:00', kraj: '19:00' },
      nocna: { pocetak: '19:00', kraj: '07:00' }
    },
    profil: { ime: '', aliasi: [] }
  };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return {
        ...defaults,
        ...saved,
        faktori: { ...defaults.faktori, ...(saved.faktori || {}) },
        standardneSmjene: {
          dnevna: { ...defaults.standardneSmjene.dnevna, ...(saved.standardneSmjene?.dnevna || {}) },
          nocna: { ...defaults.standardneSmjene.nocna, ...(saved.standardneSmjene?.nocna || {}) }
        },
        profil: { ...defaults.profil, ...(saved.profil || {}), aliasi: Array.isArray(saved.profil?.aliasi) ? saved.profil.aliasi : [] }
      };
    } catch (error) {
      return JSON.parse(JSON.stringify(defaults));
    }
  }

  function save(values) {
    const current = load();
    const next = {
      ...current,
      satnica: Number(values.satnica),
      putniTrosak: Number(values.putniTrosak),
      faktori: { ...current.faktori, ...(values.faktori || {}) },
      standardneSmjene: {
        dnevna: { ...current.standardneSmjene.dnevna, ...(values.standardneSmjene?.dnevna || {}) },
        nocna: { ...current.standardneSmjene.nocna, ...(values.standardneSmjene?.nocna || {}) }
      },
      profil: { ...current.profil, ...(values.profil || {}), aliasi: Array.isArray(values.profil?.aliasi) ? values.profil.aliasi : current.profil.aliasi }
    };
    localStorage.setItem(storageKey, JSON.stringify(next));
    return next;
  }

  window.MojRadConfig = { defaults, load, save };
}());
