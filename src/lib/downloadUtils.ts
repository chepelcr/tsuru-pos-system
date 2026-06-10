/**
 * URL/blob file download helpers — ported verbatim from the dashboard
 * (`lib/downloadUtils.ts`). Pure DOM; the live Orders flow downloads
 * server-generated PDF/Excel via attachment URLs (no client-side PDF gen).
 */

/** Downloads a file from a URL by fetching it to a blob and triggering an anchor. */
export async function downloadFile(url: string, fileName: string, extension: string = 'pdf') {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = `${fileName}.${extension}`;
    anchor.click();

    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
  }
}

/** Downloads a blob directly. */
export function downloadBlob(blob: Blob, fileName: string) {
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = fileName;
  anchor.click();

  window.URL.revokeObjectURL(downloadUrl);
}

/** Derives a filename from a URL's pathname (last segment), defaulting to `download`. */
export function getFileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path.split('/').pop() || 'download';
  } catch {
    return 'download';
  }
}

/** Fetches a server URL and triggers a download using its derived filename. */
export async function downloadFromUrl(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  downloadBlob(blob, getFileNameFromUrl(url));
}

/** Reads a File to a base64 string, stripping the `data:…;base64,` prefix. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
  });
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
