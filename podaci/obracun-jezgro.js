(function () {
  const typeTimes = { Dnevna: '07:00–19:00', Noćna: '19:00–07:00', 'Slobodan dan': '0' };

  function formatMoney(value) {
    return `${new Intl.NumberFormat('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} KM`;
  }

  function formatFactor(value) {
    return value === null ? 'Nije definisan' : value.toFixed(3).replace('.', ',');
  }

  function calculateShift(shift, config) {
    const factors = config.faktori;
    if (shift.isHoliday) return { hours: 12, dailyHours: 0, nightHours: 0, saturdayHours: 0, sundayHours: 0, holidayHours: 12, amount: 0, formula: '12 h praznikom × faktor nije definisan', note: `Faktor za praznik nije definisan (${shift.holidayName})` };
    if (shift.type === 'Slobodan dan') return { hours: 0, dailyHours: 0, nightHours: 0, saturdayHours: 0, sundayHours: 0, holidayHours: 0, amount: 0, formula: 'Slobodan dan · 0 h', note: '' };

    const isSunday = shift.weekdayType === 'nedjelja';
    const isSaturday = shift.weekdayType === 'subota';
    if (shift.type === 'Dnevna') {
      const selectedFactor = isSunday ? factors.dnevniNedjeljom : isSaturday ? factors.dnevniSubotom : factors.redovanRad;
      return { hours: 12, dailyHours: 12, nightHours: 0, saturdayHours: isSaturday ? 12 : 0, sundayHours: isSunday ? 12 : 0, holidayHours: 0, amount: 12 * config.satnica * selectedFactor, formula: `12 h × ${config.satnica.toFixed(2)} × ${formatFactor(selectedFactor)}`, note: '' };
    }

    const nightFactor = isSunday ? factors.nocniNedjeljom : factors.nocniRad;
    const dayFactor = isSunday ? factors.dnevniNedjeljom : factors.redovanRad;
    return { hours: 12, dailyHours: 4, nightHours: 8, saturdayHours: isSaturday ? 12 : 0, sundayHours: isSunday ? 12 : 0, holidayHours: 0, amount: 8 * config.satnica * nightFactor + 4 * config.satnica * dayFactor, formula: `8 h × ${config.satnica.toFixed(2)} × ${formatFactor(nightFactor)} + 4 h × ${config.satnica.toFixed(2)} × ${formatFactor(dayFactor)}`, note: isSunday ? '8 h noćni nedjeljom + 4 h dnevni nedjeljom' : '8 h noćni rad + 4 h redovan rad' };
  }

  function calculateMonth(shifts, config) {
    return shifts.reduce((result, shift) => {
      const breakdown = calculateShift(shift, config);
      Object.keys(result).forEach((key) => { result[key] += breakdown[key] || 0; });
      return result;
    }, { hours: 0, dailyHours: 0, nightHours: 0, saturdayHours: 0, sundayHours: 0, holidayHours: 0, amount: 0 });
  }

  function ascii(value) {
    return String(value)
      .replace(/[čć]/g, 'c').replace(/[ČĆ]/g, 'C').replace(/[ž]/g, 'z').replace(/[Ž]/g, 'Z')
      .replace(/[š]/g, 's').replace(/[Š]/g, 'S').replace(/[đ]/g, 'dj').replace(/[Đ]/g, 'Dj')
      .replace(/[–—]/g, '-').replace(/×/g, 'x').replace(/€/g, 'EUR');
  }

  function pdfEscape(value) {
    return ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  function createPdf(report) {
    const lines = [
      'MOJ RAD', report.title, '',
      'SAZETAK',
      `Broj smjena: ${report.summary.shiftCount}`, `Ukupno radnih sati: ${report.summary.hours} h`,
      `Ukupno dnevnih sati: ${report.summary.dailyHours} h`, `Ukupno nocnih sati: ${report.summary.nightHours} h`,
      `Ukupno sati subotom: ${report.summary.saturdayHours} h`, `Ukupno sati nedjeljom: ${report.summary.sundayHours} h`,
      `Ukupno sati praznikom: ${report.summary.holidayHours} h`, '',
      'FINANSIJSKI OBRACUN', `Satnica: ${formatMoney(report.satnica)}`,
      `Rad: ${formatMoney(report.summary.amount)}`, `Putni trosak: ${formatMoney(report.putniTrosak)}`,
      `UKUPNO: ${formatMoney(report.total)}`, '', 'KORISTENI FAKTORI',
      `Redovan rad: ${formatFactor(report.faktori.redovanRad)}`, `Nocni rad: ${formatFactor(report.faktori.nocniRad)}`,
      `Subota: ${formatFactor(report.faktori.dnevniSubotom)}`, `Nedjelja: ${formatFactor(report.faktori.dnevniNedjeljom)}`,
      `Nocna nedjelja: ${formatFactor(report.faktori.nocniNedjeljom)}`, '', 'DETALJNE SMJENE'
    ];
    report.shifts.forEach((shift) => {
      lines.push(`${shift.date} | ${shift.weekdayName} | ${shift.type} | ${shift.hours} h | ${shift.start}-${shift.end} | ${shift.status} | ${shift.amountText || formatMoney(shift.amount || 0)}`);
    });

    const pageLines = 43;
    const pages = [];
    for (let index = 0; index < lines.length; index += pageLines) pages.push(lines.slice(index, index + pageLines));
    const objects = [];
    const pageIds = [];
    const contentIds = [];
    const fontId = 3;
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = '<< /Type /Pages /Kids [PAGE_IDS] /Count PAGE_COUNT >>';
    objects[fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
    pages.forEach((page, pageIndex) => {
      const content = ['BT', '/F1 16 Tf', '50 800 Td', `(${pdfEscape(pageIndex === 0 ? page[0] : report.title)}) Tj`, '/F1 9 Tf', '0 -28 Td'];
      page.slice(pageIndex === 0 ? 1 : 0).forEach((line) => { content.push(`(${pdfEscape(line)}) Tj`, '0 -16 Td'); });
      content.push('ET');
      contentIds.push(objects.length);
      objects.push(`<< /Length ${content.join('\n').length} >>\nstream\n${content.join('\n')}\nendstream`);
      pageIds.push(objects.length);
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[contentIds.length - 1]} 0 R >>`);
    });
    objects[2] = objects[2].replace('PAGE_IDS', pageIds.map((id) => `${id} 0 R`).join(' ')).replace('PAGE_COUNT', pages.length);
    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [0];
    objects.forEach((object, index) => { offsets[index] = pdf.length; pdf += `${index} 0 obj\n${object}\nendobj\n`; });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let index = 1; index < objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    const blob = new Blob([pdf], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = report.filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  window.MojRadCalculation = { typeTimes, formatMoney, formatFactor, calculateShift, calculateMonth, createPdf };
}());
