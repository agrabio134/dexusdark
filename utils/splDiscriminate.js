// src/utils/splDiscriminate.js
export const splDiscriminate = async (discriminator, length = 8) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(discriminator);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash).slice(0, length);
};