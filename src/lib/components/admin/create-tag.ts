import { deserialize } from '$app/forms';

export async function createTag(label: string): Promise<{ slug: string; label: string }> {
  const body = new FormData();
  body.set('label', label);
  const response = await fetch('?/createTag', { method: 'POST', body });
  const result = deserialize(await response.text());
  if (result.type === 'success' && result.data) {
    return result.data.tag as { slug: string; label: string };
  }
  throw new Error('Failed to create tag');
}
