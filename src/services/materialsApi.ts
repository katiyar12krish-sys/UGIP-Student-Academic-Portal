// Server calls for study materials and file upload (Step 9). The server decides who may publish, see and download what.
// Upload is two steps: (1) send the file -> a file id, (2) publish the material that uses it. The file never goes into JSON or localStorage.
import { call, type ApiResult } from './academicApi';
import type { DocumentMaterialItem } from '../types';

// Data shape: uploaded file.
export interface UploadedFile { fileId: string; name: string; size: number; mime: string; kind: 'pdf' | 'image' | 'doc' }
// Data shape: material input.
export interface MaterialInput {
  kind: 'file' | 'link'; title: string; description: string; category: DocumentMaterialItem['category']; tags: string[];
  subjectId?: string; branch?: string; semester?: number | 'All';      // branch / semester only count for the admin without a subject
  fileId?: string; linkUrl?: string;
}
// Data shape: material patch.
export interface MaterialPatch { title?: string; description?: string; category?: DocumentMaterialItem['category']; tags?: string[]; linkUrl?: string }

/** Step 1: the file itself with fallback to base64 dataUrl for offline/Netlify static preview */
export async function uploadFile(file: File): Promise<ApiResult<UploadedFile>> {
  try {
    let dataUrl = '';
    try {
      dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    } catch {}

    const payload = JSON.stringify({
      name: file.name,
      size: file.size,
      mime: file.type || 'application/pdf',
      dataUrl,
    });

    const res = await fetch('/api/files', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-File-Name': encodeURIComponent(file.name) },
      body: payload,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: json?.error || `Upload failed (${res.status})` };
    return { ok: true, data: json as UploadedFile };
  } catch {
    return { ok: false, status: 0, error: 'Cannot reach the server. Check your connection and try again.' };
  }
}

export const materialsApi = {
  list: () => call<DocumentMaterialItem[]>('GET', '/api/materials'),
  create: (m: MaterialInput) => call<DocumentMaterialItem>('POST', '/api/materials', m),
  update: (id: string, m: MaterialPatch) => call<DocumentMaterialItem>('PATCH', `/api/materials/${encodeURIComponent(id)}`, m),
  remove: (id: string) => call<{ ok: true }>('DELETE', `/api/materials/${encodeURIComponent(id)}`),
};
