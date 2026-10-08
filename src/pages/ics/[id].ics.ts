// One .ics calendar file per performance, generated at build.
import type { APIRoute, GetStaticPaths } from 'astro';
import site from '../../data/site.json';
import { allShows, doorsTime, FORMAT_LABEL, longDate, pacificToDate, ticketUrl, type Performance, type Show } from '../../lib/shows';
import { fullAddress } from '../../lib/site';

export const getStaticPaths: GetStaticPaths = () =>
  allShows.flatMap((show) => show.performances.map((perf) => ({ params: { id: String(perf.id) }, props: { show, perf } })));

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
// RFC 5545: lines longer than 75 octets are folded.
const fold = (line: string) => line.match(/.{1,73}/g)!.join('\r\n ');

export const GET: APIRoute = ({ props }) => {
  const { show, perf } = props as { show: Show; perf: Performance };
  const start = pacificToDate(perf.start);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${site.name}//Shows//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:performance-${perf.id}@offbroadwaylive.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `SUMMARY:${esc(`${show.title} at ${site.name}`)}`,
    `LOCATION:${esc(`${site.name}, ${fullAddress}`)}`,
    `DESCRIPTION:${esc(
      `${FORMAT_LABEL[perf.format]}, ${longDate(perf)}. Doors open ${doorsTime(perf)}.\nTickets: ${ticketUrl(perf.id)}\nBox office: ${site.phone.display}`,
    )}`,
    `URL:${ticketUrl(perf.id)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
