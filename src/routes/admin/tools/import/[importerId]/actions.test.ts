import { describe, expect, it, vi, beforeEach } from 'vitest';

// Stub everything the route module pulls in transitively. The action under
// test is the small `cancel` handler — we only care that it forwards the
// posted planId to deleteImportTemp and tolerates failures.
vi.mock('$env/dynamic/private', () => ({ env: { DATA_PATH: '/tmp/test' } }));
vi.mock('$lib/server/db', () => ({ db: {} }));
vi.mock('$lib/server/db/schema', () => ({
  categoryTable: { id: 'id', slug: 'slug', name: 'name', deletedAt: 'deletedAt' }
}));
vi.mock('$lib/server/import/registry', () => ({ getImporter: () => undefined }));
vi.mock('$lib/server/import/validate', () => ({ MAX_JSON_BYTES: 0 }));

const { deleteSpy } = vi.hoisted(() => ({ deleteSpy: vi.fn() }));
vi.mock('$lib/server/import/temp-storage', () => ({
  deleteImportTemp: (id: string) => deleteSpy(id)
}));

import { actions } from './+page.server';

type CancelHandler = (event: { request: { formData(): Promise<FormData> } }) => Promise<unknown>;

function makeEvent(planId?: string) {
  const fd = new FormData();
  if (planId !== undefined) fd.set('planId', planId);
  return { request: { formData: async () => fd } };
}

describe('cancel form action', () => {
  beforeEach(() => deleteSpy.mockReset());

  it('forwards a posted planId to deleteImportTemp', async () => {
    const cancel = actions.cancel as CancelHandler;
    const result = await cancel(makeEvent('00000000-0000-4000-8000-000000000000'));
    expect(deleteSpy).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000000');
    expect(result).toEqual({ cancelled: true });
  });

  it('skips deleteImportTemp when no planId is posted', async () => {
    const cancel = actions.cancel as CancelHandler;
    await cancel(makeEvent());
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('swallows deleteImportTemp errors so the user always returns to the upload form', async () => {
    deleteSpy.mockImplementationOnce(() => {
      throw new Error('Invalid plan id');
    });
    const cancel = actions.cancel as CancelHandler;
    const result = await cancel(makeEvent('not-a-real-id'));
    expect(result).toEqual({ cancelled: true });
  });
});
