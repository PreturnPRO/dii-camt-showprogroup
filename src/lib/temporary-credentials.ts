import type { TemporaryCredential } from '@/components/common/TemporaryPasswordsDialog';

type ImportResultLike = { status?: string; email?: string; identifier?: string; temporaryPassword?: string };

export const credentialsFromImport = (results: unknown[]): TemporaryCredential[] =>
  (results as ImportResultLike[])
    .filter((row) => row.status === 'created' && row.temporaryPassword && row.email)
    .map((row) => ({ label: row.identifier ?? row.email!, email: row.email!, temporaryPassword: row.temporaryPassword! }));

// Same shape as the backend's generateTemporaryPassword(): 9 random bytes, base64url → 12 characters.
export const generateTemporaryPassword = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
