/** Pomožne funkcije za čas – vsi intervali so v korakih po 15 minut. */

/** Zaokroži čas na 15 minut ('up' = navzgor, 'nearest' = najbližje). */
export function roundToQuarter(date: Date, mode: 'up' | 'nearest' = 'nearest'): Date {
  const result = new Date(date);
  result.setSeconds(0, 0);
  const minutes = result.getMinutes();
  const quarters = mode === 'up' ? Math.ceil(minutes / 15) : Math.round(minutes / 15);
  result.setMinutes(quarters * 15); // 60 min se samodejno prelije v naslednjo uro
  return result;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Pretvori Date v format za <input type="datetime-local"> (lokalni čas). */
export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
