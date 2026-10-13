import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadFile, downloadFromUrl } from './downloadUtils';

const url = 'https://uploads.example/organizations/org/orders/2900679464/9464-OC.pdf';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('regenerated report downloads', () => {
  it.each(['attachment', 'named'] as const)('fetches the current PDF for a %s download', async (kind) => {
    const fetchFile = vi.fn().mockResolvedValue({ blob: async () => new Blob(['current PDF']) });
    vi.stubGlobal('fetch', fetchFile);
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn().mockReturnValue('blob:current-pdf');
      static revokeObjectURL = vi.fn();
    });
    const downloadedNames: string[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedNames.push(this.download);
    });

    if (kind === 'attachment') await downloadFromUrl(url);
    else await downloadFile(url, '9464-OC');

    expect(fetchFile).toHaveBeenCalledWith(url, { cache: 'no-store' });
    expect(click).toHaveBeenCalledOnce();
    expect(downloadedNames).toEqual(['9464-OC.pdf']);
  });
});
