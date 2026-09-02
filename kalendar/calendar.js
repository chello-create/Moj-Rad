const monthLabel = document.querySelector('#month-label');
const monthGrid = document.querySelector('#month-grid');
const previousMonthButton = document.querySelector('#previous-month');
const nextMonthButton = document.querySelector('#next-month');
const todayButton = document.querySelector('#today-button');

const today = new Date();
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const monthNames = [
  'januar', 'februar', 'mart', 'april', 'maj', 'juni',
  'juli', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'
];
const weekdayNames = ['nedjelja', 'ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota'];

function sameDate(firstDate, secondDate) {
  return firstDate.getFullYear() === secondDate.getFullYear()
    && firstDate.getMonth() === secondDate.getMonth()
    && firstDate.getDate() === secondDate.getDate();
}

function createDayCell(date, isOutsideMonth) {
  const cell = document.createElement('div');
  const dayName = weekdayNames[date.getDay()];
  const classes = ['day-cell'];

  if (date.getDay() === 0 || date.getDay() === 6) classes.push('weekend');
  if (isOutsideMonth) classes.push('outside-month');
  if (sameDate(date, today)) classes.push('today');

  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const shift = MojRadData.load().find((item) => item.date === dateKey);
  const holiday = window.MojRadHolidays.getHoliday(dateKey);
  if (holiday) {
    classes.push('holiday');
    cell.setAttribute('aria-label', `${date.getDate()}. ${dayName}, praznik: ${holiday.name}`);
  }

  cell.className = classes.join(' ');
  cell.setAttribute('role', 'gridcell');
  if (!holiday) cell.setAttribute('aria-label', `${date.getDate()}. ${dayName}`);
  if (sameDate(date, today)) cell.setAttribute('aria-current', 'date');

  const dayNumber = document.createElement('span');
  dayNumber.className = 'day-number';
  dayNumber.textContent = date.getDate();
  cell.append(dayNumber);

  if (shift) {
    const shiftLabel = document.createElement('span');
    shiftLabel.className = `calendar-shift shift-${shift.type.toLowerCase().replace(' ', '-')}`;
    shiftLabel.textContent = shift.type;
    cell.append(shiftLabel);
    if (shift.holidayName) cell.setAttribute('aria-label', `${date.getDate()}. ${dayName}, ${shift.type}, praznik: ${shift.holidayName}`);
  }
  return cell;
}

function renderCalendar() {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;

  monthLabel.textContent = `${monthNames[month]} ${year}`;
  monthGrid.replaceChildren();

  for (let index = firstDayOffset - 1; index >= 0; index -= 1) {
    monthGrid.append(createDayCell(new Date(year, month - 1, previousMonthDays - index), true));
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    monthGrid.append(createDayCell(new Date(year, month, day), false));
  }

  for (let day = 1; monthGrid.children.length < totalCells; day += 1) {
    monthGrid.append(createDayCell(new Date(year, month + 1, day), true));
  }
}

previousMonthButton.addEventListener('click', () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthButton.addEventListener('click', () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  renderCalendar();
});

todayButton.addEventListener('click', () => {
  visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  renderCalendar();
});

renderCalendar();