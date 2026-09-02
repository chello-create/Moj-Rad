(function () {
  const storageKey = 'mojRad.smjene';

  function getWeekdayType(dateValue) {
    const day = new Date(`${dateValue}T12:00:00`).getDay();
    if (day === 0) return 'nedjelja';
    if (day === 6) return 'subota';
    return 'radni dan';
  }

  function getWeekdayName(dateValue) {
    const names = ['nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota'];
    return names[new Date(`${dateValue}T12:00:00`).getDay()];
  }

  function describeDate(dateValue) {
    const holiday = window.MojRadHolidays ? window.MojRadHolidays.getHoliday(dateValue) : null;
    const weekdayType = getWeekdayType(dateValue);
    return {
      weekdayName: getWeekdayName(dateValue),
      weekdayType,
      holidayName: holiday ? holiday.name : null,
      isHoliday: Boolean(holiday),
      status: holiday ? 'praznik' : weekdayType
    };
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(saved) ? saved.map((shift) => ({ ...shift, ...describeDate(shift.date) })) : [];
    } catch (error) {
      return [];
    }
  }

  function save(shifts) {
    localStorage.setItem(storageKey, JSON.stringify(shifts));
  }

  function upsert(shift) {
    const shifts = load();
    const shiftWithWeekday = { ...shift, ...describeDate(shift.date) };
    const existingIndex = shifts.findIndex((item) => item.date === shift.date);

    if (existingIndex >= 0) {
      shifts[existingIndex] = shiftWithWeekday;
    } else {
      shifts.push(shiftWithWeekday);
    }

    shifts.sort((first, second) => first.date.localeCompare(second.date));
    save(shifts);
    return shiftWithWeekday;
  }

  function remove(date) {
    save(load().filter((shift) => shift.date !== date));
  }

  function clear() {
    save([]);
  }

  window.MojRadData = { clear, describeDate, getWeekdayName, getWeekdayType, load, upsert, remove };
}());
