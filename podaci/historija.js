(function () {
  const storageKey = 'mojRad.historijaObracuna';

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      return [];
    }
  }

  function save(items) {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }

  function upsert(snapshot) {
    const items = load();
    const existingIndex = items.findIndex((item) => item.year === snapshot.year && item.month === snapshot.month);
    if (existingIndex >= 0) items[existingIndex] = snapshot;
    else items.push(snapshot);
    items.sort((first, second) => `${second.year}-${String(second.month).padStart(2, '0')}`.localeCompare(`${first.year}-${String(first.month).padStart(2, '0')}`));
    save(items);
    return { snapshot, wasUpdate: existingIndex >= 0 };
  }

  function remove(id) {
    save(load().filter((item) => item.id !== id));
  }

  function find(year, month) {
    return load().find((item) => item.year === Number(year) && item.month === Number(month)) || null;
  }

  window.MojRadHistory = { load, upsert, remove, find };
}());
