# Whisper R2 credential remediation — review only

The previous Angular `StorageService` embedded privileged Cloudflare R2 S3-compatible access credentials in publicly accessible client source code. Treat those credentials as compromised.

**This is an unmerged review branch.** It does not change `master`, the deployed application, existing Firestore profile documents, or stored avatar URLs. **Do not merge until a secure backend has been deployed and tested.**

## Required remediation

1. **Immediately revoke and replace the exposed R2 key/secret** through Cloudflare. Review bucket permissions, usage logs, and unexpected objects or access. Removing source text does not remove previously published credentials from Git history or bundles.
2. Provide an HTTPS backend with Firebase ID-token verification and these endpoints:
   - `POST /avatar-upload-request`: accepts `fileName`, `contentType`, `size`; returns `{ "uploadUrl": "https://...", "publicUrl": "https://...", "headers": { "Content-Type": "image/..." } }`. Validate MIME, size, signed-in UID, and an owned object path. Server—not the browser—chooses the R2 key. Issue a short-lived presigned PUT URL.
   - `POST /avatar-read-request`: accepts `key`, verifies authorization, and returns `{ "url": "https://..." }` with a short-lived signed read URL if private.
3. Keep all new R2 secrets in server-side secret management. Do not put them in an Angular `environment.ts` file, public hosting environment variables, or responses.
4. Set the **non-secret** `avatarUploadApiBaseUrl` field on the Angular environment to the secure backend HTTPS origin; configure R2 CORS for the site's origin, PUT requests, and signed headers.
5. Test authentication, SMS verification, old avatars, new uploads, profile persistence, wrong-user access denial, invalid images, upload size limits, expired URLs, offline handling, and account deletion. Inspect built bundles to confirm R2 keys are not present.
6. Only then merge and deploy. If cleaning public Git history, coordinate with contributors; rewriting history may be disruptive and is not a substitute for rotation.

## Source changes

`src/app/services/storage.service.ts` now calls a server for short-lived signed URLs instead of importing `aws-sdk` and embedding privileged R2 secrets in the browser. It preserves the public `uploadAvatar(file, userId)` and `getAvatarUrl(key)` interfaces for existing callers.

**Functional caveat:** until the backend and `avatarUploadApiBaseUrl` are configured, *new avatar uploads cannot work using this branch*. That is why this is staged for review and not merged. Stored avatar URLs are not edited.
