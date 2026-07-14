// Image upload via Cloudinary unsigned upload (PRD §8.1, free tier).
// Configure in .env / Vercel:
//   VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
//   VITE_CLOUDINARY_PRESET=your-unsigned-preset
// If not configured, the UI falls back to pasting an image URL.
const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ''
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET || ''

export const cloudinaryConfigured = () => Boolean(CLOUD && PRESET)

// Allowed MIME types for image uploads (security: prevent executable uploads)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function uploadImage(file) {
  if (!cloudinaryConfigured()) throw new Error('Image uploads not configured (set VITE_CLOUDINARY_* )')
  // Validate file type - reject potentially dangerous files
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.')
  }
  // Additional size check (Cloudinary free tier has 10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File too large. Maximum size is 10MB.')
  }
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
