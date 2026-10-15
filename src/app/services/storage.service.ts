import { Injectable } from '@angular/core';
import { auth } from '../firebase';
import { environment } from '../../environments/environment';

/**
 * Secure avatar storage using backend-issued signed R2 URLs.
 *
 * IMPORTANT: Requires an authenticated API and avatarUploadApiBaseUrl
 * before this branch can be merged. Never embed R2 secrets in a client.
 */
interface UploadTicket {
  uploadUrl: string;
  publicUrl: string;
  headers?: Record<string, string>;
}
interface ReadTicket { url: string; }

@Injectable({ providedIn: 'root' })
export class StorageService {
  private get baseUrl(): string {
    const url = (environment as typeof environment & {
      avatarUploadApiBaseUrl?: string;
    }).avatarUploadApiBaseUrl;
    if (!url || !url.startsWith('https://')) {
      throw new Error('Avatar upload backend is not configured.');
    }
    return url.replace(/\/$/, '');
  }

  private async request<T>(path: string, body: object): Promise<T> {
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication is required.');
    const token = await user.getIdToken();
    const res = await fetch(this.baseUrl + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Avatar API request failed (' + res.status + ').');
    return await res.json() as T;
  }

  async uploadAvatar(file: File, userId: string): Promise<string> {
    if (!file.type.startsWith('image/') || file.size === 0) {
      throw new Error('Choose a non-empty image file.');
    }
    if (auth.currentUser?.uid !== userId) {
      throw new Error('Cannot upload avatars for another user.');
    }

    // The backend validates the Firebase token, UID, type and file size;
    // it chooses the object key and issues a short-lived signed PUT URL.
    const ticket = await this.request<UploadTicket>('/avatar-upload-request', {
      fileName: file.name, contentType: file.type, size: file.size
    });
    if (!ticket.uploadUrl?.startsWith('https://') ||
        !ticket.publicUrl?.startsWith('https://')) {
      throw new Error('Invalid avatar upload response.');
    }
    const headers = new Headers(ticket.headers || {});
    if (!headers.has('Content-Type')) headers.set('Content-Type', file.type);
    const upload = await fetch(ticket.uploadUrl, {
      method: 'PUT', body: file, headers
    });
    if (!upload.ok) throw new Error('Avatar upload failed (' + upload.status + ').');
    return ticket.publicUrl;
  }

  async getAvatarUrl(key: string): Promise<string> {
    const ticket = await this.request<ReadTicket>('/avatar-read-request', { key });
    if (!ticket.url?.startsWith('https://')) throw new Error('Invalid avatar URL.');
    return ticket.url;
  }
}
