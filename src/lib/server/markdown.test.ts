import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('returns empty string for null', () => {
    expect.assertions(1);
    expect(renderMarkdown(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect.assertions(1);
    expect(renderMarkdown(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect.assertions(1);
    expect(renderMarkdown('')).toBe('');
  });

  it('renders basic markdown', () => {
    expect.assertions(1);
    expect(renderMarkdown('**bold**')).toContain('<strong>bold</strong>');
  });

  it('adds target="_blank" to external links', () => {
    expect.assertions(2);
    const html = renderMarkdown('[link](https://example.com)');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('does not add target="_blank" to internal links', () => {
    expect.assertions(1);
    const html = renderMarkdown('[link](/about)');
    expect(html).not.toContain('target="_blank"');
  });

  it('sanitizes XSS payloads', () => {
    expect.assertions(2);
    const html = renderMarkdown('<script>alert("xss")</script>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('alert');
  });

  it('sanitizes event handler attributes', () => {
    expect.assertions(1);
    const html = renderMarkdown('<img src=x onerror="alert(1)">');
    expect(html).not.toContain('onerror');
  });
});
