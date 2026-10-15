import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { emptyBlogDocument, type BlogDocument, type BlogPost } from '@/lib/blogTypes';
import BlogWriterPage from './BlogWriterPage';

const api = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), save: vi.fn(), submit: vi.fn(), upload: vi.fn(), completeUpload: vi.fn() }));
vi.mock('@/lib/blogApi', () => ({ blogApi: api }));
vi.mock('@/contexts/AuthContext', () => ({ useAuthContext: () => ({ user: { userId: 'author-1' } }) }));

function post(document = emptyBlogDocument(), status = 'draft', version = 1): BlogPost {
  return { id: 'post-1', slug: 'my-story', authorType: 'user', authorName: 'Author', status, publishedAt: null, media: {},
    revision: { id: 'revision-1', version, document, status, reason: null } };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function openPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><LanguageProvider><BlogWriterPage /></LanguageProvider></QueryClientProvider>);
}
async function newDraft() {
  openPage();
  fireEvent.click(screen.getByRole('button', { name: 'New article' }));
  return screen.findByRole('dialog', { name: 'New draft' });
}
function title(value: string) { fireEvent.change(screen.getByLabelText('Title (English)'), { target: { value } }); }

beforeEach(() => {
  localStorage.clear(); localStorage.setItem('language', 'en');
  Object.values(api).forEach((mock) => mock.mockReset());
  api.list.mockResolvedValue([]);
  api.completeUpload.mockResolvedValue({});
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('article editor drawer', () => {
  it('starts with just the article list and opens a fresh draft in the drawer', async () => {
    openPage();
    expect(await screen.findByText('You have no articles yet.')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByLabelText('Slug')).toBeNull();
    screen.getByRole('button', { name: 'New article' }).focus();
    fireEvent.click(screen.getByRole('button', { name: 'New article' }));
    const drawer = await screen.findByRole('dialog', { name: 'New draft' });
    expect(within(drawer).getByLabelText('Slug')).toBeTruthy();
    expect((within(drawer).getByRole('button', { name: 'Save draft' }) as HTMLButtonElement).disabled).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: 'Close editor' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'New article' }));
  });

  it('preserves edits when closing is canceled and starts clean after a confirmed discard', async () => {
    await newDraft(); title('Keep this story');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Discard changes?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect((screen.getByLabelText('Title (English)') as HTMLInputElement).value).toBe('Keep this story');
    fireEvent.click(screen.getByRole('button', { name: 'Close editor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'New article' }));
    expect((await screen.findByLabelText('Title (English)') as HTMLInputElement).value).toBe('');
  });

  it('creates, updates and submits from the drawer using the latest saved revision', async () => {
    await newDraft();
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'my-story' } });
    title('First draft');
    api.create.mockImplementation(async (_user: string, _slug: string, document: BlogDocument) => post(document));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await screen.findByText('Draft saved.');
    expect(api.create).toHaveBeenCalledWith('author-1', 'my-story', expect.objectContaining({ title: { es: '', en: 'First draft' } }));
    expect(screen.getByRole('dialog', { name: 'Article' })).toBeTruthy();
    title('Revised draft');
    expect((screen.getByRole('button', { name: 'Submit for review' }) as HTMLButtonElement).disabled).toBe(true);
    api.save.mockImplementation(async (_user: string, _id: string, _version: number, document: BlogDocument) => post(document, 'draft', 2));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Submit for review' }) as HTMLButtonElement).disabled).toBe(false));
    expect(api.save).toHaveBeenCalledWith('author-1', 'post-1', 1, expect.objectContaining({ title: { es: '', en: 'Revised draft' } }));
    api.submit.mockResolvedValue(post(api.save.mock.calls[0][3], 'in_review', 2));
    fireEvent.click(screen.getByRole('button', { name: 'Submit for review' }));
    await screen.findByText('Article submitted for review.');
    expect(api.submit).toHaveBeenCalledWith('author-1', 'post-1', 2);
    expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull();
    expect((screen.getByLabelText('Title (English)') as HTMLInputElement).disabled).toBe(true);
  });

  it('opens an existing article and keeps review-locked content read-only', async () => {
    const document = emptyBlogDocument(); document.title.en = 'Story in review';
    const article = post(document, 'in_review'); article.revision!.reason = 'Review feedback';
    api.list.mockResolvedValue([article]);
    openPage();
    fireEvent.click(await screen.findByRole('button', { name: /Story in review/ }));
    expect(await screen.findByRole('dialog', { name: 'Article' })).toBeTruthy();
    expect(screen.getByText('Team feedback: Review feedback')).toBeTruthy();
    expect((screen.getByLabelText('Slug') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('Title (English)') as HTMLInputElement).value).toBe('Story in review');
    expect((screen.getByLabelText('Title (English)') as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Submit for review' })).toBeNull();
  });

  it('retains edits and displays a failed save inside the drawer', async () => {
    await newDraft(); title('Unsaved story');
    api.create.mockRejectedValue(new Error('Draft could not be saved'));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Draft could not be saved');
    expect((screen.getByLabelText('Title (English)') as HTMLInputElement).value).toBe('Unsaved story');
    expect((screen.getByRole('button', { name: 'Save draft' }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Close editor' }));
    expect(screen.getByRole('dialog', { name: 'Discard changes?' })).toBeTruthy();
  });

  it('prevents edits, switching and dismissal while a save is pending', async () => {
    await newDraft(); title('Pending story');
    const saving = deferred<BlogPost>(); api.create.mockReturnValue(saving.promise);
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect((screen.getByLabelText('Slug') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('Title (English)') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'New article' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Close' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Discard changes?' })).toBeNull();
    await act(async () => saving.resolve(post()));
    await screen.findByText('Draft saved.');
  });

  it('uses styled layout options and consumes Escape before the drawer closes', async () => {
    await newDraft(); fireEvent.click(screen.getByRole('button', { name: 'Image' }));
    const alignment = screen.getByRole('combobox', { name: 'Alignment' });
    fireEvent.click(alignment);
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Full width', 'Wide', 'Left', 'Right']);
    fireEvent.keyDown(alignment, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Discard changes?' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'New draft' })).toBeTruthy();
    fireEvent.click(alignment); fireEvent.click(screen.getByRole('option', { name: 'Right' }));
    expect(alignment.textContent).toBe('Right');
    api.create.mockImplementation(async (_user: string, _slug: string, document: BlogDocument) => post(document));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await screen.findByText('Draft saved.');
    expect(api.create.mock.calls[0][2].blocks[1]).toMatchObject({ type: 'image', layout: 'right' });
  });

  it('only offers left and right layouts for an image with text', async () => {
    await newDraft(); fireEvent.click(screen.getByRole('button', { name: 'Image + text' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Alignment' }));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Left', 'Right']);
  });

  it('locks the draft during upload and attaches the completed image without losing text', async () => {
    await newDraft(); title('My image story');
    fireEvent.click(screen.getByRole('button', { name: 'Image' }));
    const uploading = deferred<{ ok: boolean }>();
    api.upload.mockResolvedValue({ id: 'media-1', uploadUrl: 'https://upload.test/image', headers: {}, publicUrl: 'https://media.test/image' });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(uploading.promise));
    fireEvent.change(screen.getByLabelText('Image', { selector: 'input' }), { target: { files: [new File(['image'], 'photo.png', { type: 'image/png' })] } });
    expect((screen.getByLabelText('Title (English)') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Remove block 2' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Save draft' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Discard changes?' })).toBeNull();
    await act(async () => uploading.resolve({ ok: true }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Save draft' }) as HTMLButtonElement).disabled).toBe(false));
    expect(api.completeUpload).toHaveBeenCalledWith('author-1', 'media-1');
    expect((screen.getByLabelText('Title (English)') as HTMLInputElement).value).toBe('My image story');
    api.create.mockImplementation(async (_user: string, _slug: string, document: BlogDocument) => post(document));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await screen.findByText('Draft saved.');
    expect(api.create.mock.calls[0][2].blocks[1]).toMatchObject({ mediaId: 'media-1' });
  });

  it('shows upload failure and re-enables the editor for a retry', async () => {
    await newDraft(); title('Still here'); fireEvent.click(screen.getByRole('button', { name: 'Image' }));
    api.upload.mockRejectedValue(new Error('Upload unavailable'));
    fireEvent.change(screen.getByLabelText('Image', { selector: 'input' }), { target: { files: [new File(['image'], 'photo.png', { type: 'image/png' })] } });
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Upload unavailable');
    expect((screen.getByLabelText('Title (English)') as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByLabelText('Title (English)') as HTMLInputElement).value).toBe('Still here');
    expect(api.completeUpload).not.toHaveBeenCalled();
  });

  it('warns before leaving the page with unsaved edits', async () => {
    await newDraft(); title('Unsaved story');
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
