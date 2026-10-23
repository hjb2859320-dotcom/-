import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ResourceAttachment, UserProfile } from '../types';

/* -------------------------------------------------------------
 * FILE STORAGE CONSTANTS & VALIDATIONS
 * ------------------------------------------------------------- */
export const ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'hwp',
  'hwpx',
  'jpg',
  'jpeg',
  'png',
  'zip',
];

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB per file
export const MAX_ATTACHMENTS_PER_POST = 5;

// Firestore document size limit is ~1MB; we chunk base64 data into 500KB safe segments
const CHUNK_SIZE_CHARS = 500 * 1024;

/* -------------------------------------------------------------
 * INDEXED DB CLIENT-SIDE CACHE (Fast & persistent across reloads)
 * ------------------------------------------------------------- */
const IDB_NAME = 'leedo_works_storage_cache';
const IDB_STORE = 'files_cache';

function openIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const idb = request.result;
        if (!idb.objectStoreNames.contains(IDB_STORE)) {
          idb.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function getCachedDataUrl(fileId: string): Promise<string | null> {
  const idb = await openIDB();
  if (!idb) return null;
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(fileId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function setCachedDataUrl(fileId: string, dataUrl: string): Promise<void> {
  const idb = await openIDB();
  if (!idb) return;
  try {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put(dataUrl, fileId);
  } catch (err) {
    console.warn('IndexedDB set failed:', err);
  }
}

async function removeCachedDataUrl(fileId: string): Promise<void> {
  const idb = await openIDB();
  if (!idb) return;
  try {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.delete(fileId);
  } catch {
    // ignore
  }
}

/* -------------------------------------------------------------
 * FILE UTILITIES
 * ------------------------------------------------------------- */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts.pop()?.toLowerCase() || '';
}

export function validateSelectedFile(file: File): { valid: boolean; error?: string } {
  const ext = getFileExtension(file.name);
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `지원하지 않는 파일 형식입니다 (.${ext || '확장자없음'}).\n[허용 형식: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, HWP, HWPX, JPG, PNG, ZIP]`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `파일 용량이 15MB 제한을 초과했습니다. (현재 크기: ${formatBytes(file.size)})`,
    };
  }

  return { valid: true };
}

// Convert browser File to base64 Data URL
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
}

// Convert base64 data URL to Blob
export function dataURLToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/* -------------------------------------------------------------
 * FILE UPLOAD SERVICE (Separated Binary Chunks in Firestore)
 * ------------------------------------------------------------- */
export interface UploadProgressCallback {
  (progress: {
    fileName: string;
    percent: number;
    chunkCurrent: number;
    chunkTotal: number;
  }): void;
}

export async function uploadResourceFile(
  file: File,
  resourceId: string,
  user: UserProfile,
  onProgress?: UploadProgressCallback
): Promise<ResourceAttachment> {
  const validation = validateSelectedFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const ext = getFileExtension(file.name);
  const dataUrl = await readFileAsDataURL(file);

  // Split into chunks if needed
  const totalChunks = Math.ceil(dataUrl.length / CHUNK_SIZE_CHARS);
  const chunks: string[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE_CHARS;
    chunks.push(dataUrl.substring(start, start + CHUNK_SIZE_CHARS));
  }

  // Upload chunks to `resource_file_chunks`
  for (let idx = 0; idx < chunks.length; idx++) {
    const chunkDocId = `${fileId}_chunk_${idx}`;
    await setDoc(doc(db, 'resource_file_chunks', chunkDocId), {
      fileId,
      resourceId,
      chunkIndex: idx,
      totalChunks,
      data: chunks[idx],
      createdAt: new Date().toISOString(),
    });

    if (onProgress) {
      const pct = Math.round(((idx + 1) / totalChunks) * 100);
      onProgress({
        fileName: file.name,
        percent: pct,
        chunkCurrent: idx + 1,
        chunkTotal: totalChunks,
      });
    }
  }

  // Upload file metadata doc to `resource_files`
  const attachmentMeta: ResourceAttachment = {
    id: fileId,
    resourceId,
    fileName: file.name,
    fileSize: formatBytes(file.size),
    fileSizeBytes: file.size,
    fileType: ext,
    mimeType: file.type || 'application/octet-stream',
    storagePath: `resource_file_chunks/${fileId}`,
    totalChunks,
    uploadedAt: new Date().toISOString(),
    uploadedBy: user.uid,
    uploaderName: user.name,
  };

  await setDoc(doc(db, 'resource_files', fileId), attachmentMeta);

  // Cache in IndexedDB for instantaneous subsequent downloads
  await setCachedDataUrl(fileId, dataUrl);

  return attachmentMeta;
}

/* -------------------------------------------------------------
 * FILE RETRIEVAL & DOWNLOAD SERVICE
 * ------------------------------------------------------------- */
export async function getResourceFileDataUrl(attachment: ResourceAttachment): Promise<string> {
  // 1. Check local IndexedDB cache first
  const cached = await getCachedDataUrl(attachment.id);
  if (cached) {
    return cached;
  }

  // 2. Fetch all chunks from Firestore `resource_file_chunks`
  const chunksQuery = query(
    collection(db, 'resource_file_chunks'),
    where('fileId', '==', attachment.id),
    orderBy('chunkIndex', 'asc')
  );

  const snap = await getDocs(chunksQuery);
  if (snap.empty) {
    throw new Error('첨부파일의 저장 데이터를 서버에서 찾을 수 없습니다.');
  }

  const chunkDocs = snap.docs.map((d) => d.data());
  chunkDocs.sort((a, b) => a.chunkIndex - b.chunkIndex);

  const fullDataUrl = chunkDocs.map((c) => c.data).join('');

  // Cache in IndexedDB
  await setCachedDataUrl(attachment.id, fullDataUrl);

  return fullDataUrl;
}

export async function downloadResourceAttachment(
  attachment: ResourceAttachment
): Promise<void> {
  const dataUrl = await getResourceFileDataUrl(attachment);
  const blob = dataURLToBlob(dataUrl);
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = attachment.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 3000);
}

/* -------------------------------------------------------------
 * FILE DELETION SERVICE
 * ------------------------------------------------------------- */
export async function deleteResourceFileBinary(
  fileId: string,
  totalChunks: number = 1
): Promise<void> {
  try {
    // Delete file metadata
    await deleteDoc(doc(db, 'resource_files', fileId));

    // Delete chunks
    const chunkPromises: Promise<void>[] = [];
    const count = Math.max(totalChunks, 1);
    for (let i = 0; i < count; i++) {
      chunkPromises.push(deleteDoc(doc(db, 'resource_file_chunks', `${fileId}_chunk_${i}`)));
    }
    await Promise.allSettled(chunkPromises);

    // Remove from local cache
    await removeCachedDataUrl(fileId);
  } catch (err) {
    console.warn('Error deleting resource file chunks:', err);
  }
}
