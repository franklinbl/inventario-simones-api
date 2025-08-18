import { parse, isValid, format } from 'date-fns';

export interface DateRangeOk {
  start: Date;
  end: Date;
  startStr: string;
  endStr: string;
}

export function parseAndValidateDateRange(
  start_date?: string,
  end_date?: string,
): { ok?: DateRangeOk; error?: string } {
  if (!start_date || !end_date) {
    return { error: 'Las fechas de inicio y fin son requeridas como cadenas.' };
  }

  const start = parse(start_date, 'yyyy-MM-dd', new Date());
  const end = parse(end_date, 'yyyy-MM-dd', new Date());

  if (!isValid(start) || !isValid(end)) {
    return { error: 'Formato de fecha inválido. Usa YYYY-MM-DD.' };
  }
  if (end < start) {
    return { error: 'La fecha de fin no puede ser anterior a la fecha de inicio.' };
  }

  return {
    ok: {
      start,
      end,
      startStr: format(start, 'yyyy-MM-dd'),
      endStr: format(end, 'yyyy-MM-dd'),
    },
  };
}
