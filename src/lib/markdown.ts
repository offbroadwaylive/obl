// Just enough markdown for FAQ answers: paragraphs, **bold**, [links](...)
// and "#### " sub-headings. Relative links go through the base path.
import { url } from './url';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s: string): string {
  return escape(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => `<a href="${url(href)}">${text}</a>`);
}

export function markdown(src: string): string {
  return src
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const h = block.match(/^####\s+(.*)$/);
      return h ? `<h4>${inline(h[1])}</h4>` : `<p>${inline(block).replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
}
