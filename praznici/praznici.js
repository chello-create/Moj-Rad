(function () {
  // Lista je namjerno odvojena kako bi se datumi i nazivi lako mijenjali.
  const holidays = [
    { monthDay: '01-01', name: 'Nova godina' },
    { monthDay: '01-02', name: 'Nova godina' },
    { monthDay: '05-01', name: 'Praznik rada' },
    { monthDay: '05-02', name: 'Praznik rada' },
    { monthDay: '11-25', name: 'Dan državnosti Bosne i Hercegovine' }
  ];

  function getHoliday(dateValue) {
    const monthDay = dateValue.slice(5, 10);
    return holidays.find((holiday) => holiday.monthDay === monthDay) || null;
  }

  window.MojRadHolidays = { getHoliday, holidays };
}());
