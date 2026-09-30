/** Local time of day for an ISO timestamp, e.g. "8:15 AM". */
export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
