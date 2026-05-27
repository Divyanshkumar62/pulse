import md5 from 'blueimp-md5';

/**
 * Generates a Gravatar URL for a given email address.
 * @param email The email address to hash.
 * @param size The size of the image (default 200).
 * @returns A string containing the Gravatar URL.
 */
export function getGravatarUrl(email: string, size: number = 200): string {
  const cleanEmail = email.trim().toLowerCase();
  const hash = md5(cleanEmail);
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
}
