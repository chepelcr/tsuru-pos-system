/**
 * PUT a file to a presigned S3 URL with upload progress (TSR-335).
 *
 * `fetch` cannot report upload progress, so this is the one place the app uses
 * `XMLHttpRequest`. The URL is presigned by sales-api, so no auth header is
 * sent — only the headers S3 signed (`Content-Type`), exactly as given, or S3
 * rejects the signature.
 */

import { ApiError } from '@/lib/api';

export interface UploadProgress {
  loaded: number;
  total: number;
}

export interface UploadHandle {
  promise: Promise<void>;
  abort: () => void;
}

export function uploadWithProgress(
  url: string,
  file: Blob,
  headers: Record<string, string>,
  onProgress: (progress: UploadProgress) => void,
): UploadHandle {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<void>((resolve, reject) => {
    xhr.open('PUT', url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      onProgress({ loaded: event.loaded, total: event.lengthComputable ? event.total : file.size });
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress({ loaded: file.size, total: file.size });
        resolve();
      } else {
        reject(new ApiError(`Upload failed (HTTP ${xhr.status})`, xhr.status, xhr.status >= 500));
      }
    };
    xhr.onerror = () => reject(new ApiError('Upload failed (network)', undefined, true));
    xhr.onabort = () => reject(new ApiError('Upload aborted'));
    xhr.send(file);
  });
  return { promise, abort: () => xhr.abort() };
}
