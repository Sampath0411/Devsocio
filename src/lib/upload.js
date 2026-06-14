// Image upload via Cloudinary unsigned upload (PRD §8.1, free tier).
// Configure in .env / Vercel:
//   VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
//   VITE_CLOUDINARY_PRESET=your-unsigned-preset
// If not configured, the UI falls back to pasting an image URL.
const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ''
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET || ''

export const cloudinaryConfigured = () => Boolean(CLOUD && PRESET)

export async function uploadImage(file) {
  if (!cloudinaryConfigured()) throw new Error('Image uploads not configured (set VITE_CLOUDINARY_* )')
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error('Upload failed')
  const data = await res.json()
  return data.secure_url
}
