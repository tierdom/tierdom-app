import { marked, Renderer } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

const renderer = new Renderer();
const defaultLinkRenderer = renderer.link.bind(renderer);
renderer.link = function (token) {
  const html = defaultLinkRenderer(token);
  if (token.href.startsWith('http')) {
    return html.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
  }
  return html;
};

marked.setOptions({
  breaks: true,
  gfm: true,
  renderer
});

export function renderMarkdown(text: string | null | undefined): string {
  if (!text) return '';
  const raw = marked.parse(text, { async: false }) as string;
  return DOMPurify.sanitize(raw, { ADD_ATTR: ['target'] });
}
