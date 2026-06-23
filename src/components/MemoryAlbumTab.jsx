import { useState, useRef } from 'react'
import { addMemoryPhoto, deleteMemoryPhoto } from '../firebase/firestore'

// ⚙️ Replace these with your Cloudinary credentials
const CLOUDINARY_CLOUD_NAME = 'dkzipz4kv'
const CLOUDINARY_UPLOAD_PRESET = 'qmnyuxmx'

async function uploadToCloudinary(file) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: fd
  })
  if (!res.ok) throw new Error('Upload failed')
  const data = await res.json()
  return data.secure_url
}

export default function MemoryAlbumTab({ currentUser, memories }) {
  const [caption, setCaption] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const fileInputRef = useRef()

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    try {
      const url = await uploadToCloudinary(selectedFile)
      await addMemoryPhoto({
        url,
        caption: caption.trim() || '',
        author: currentUser,
        date: new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdAt: Date.now()
      })
      setSelectedFile(null)
      setPreview(null)
      setCaption('')
      fileInputRef.current.value = ''
    } catch {
      alert('Upload failed. Make sure your Cloudinary cloud name and upload preset are correct.')
    }
    setUploading(false)
  }

  const handleDelete = async (id) => {
    await deleteMemoryPhoto(id)
    setConfirmDelete(null)
    if (lightbox?.id === id) setLightbox(null)
  }

  // Sort by newest first
  const sorted = [...(memories || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  return (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>

      {/* Upload card */}
      <div className="card">
        <div className="card-title">📸 Add a memory</div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {preview ? (
          <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
            <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
            <button
              onClick={() => { setSelectedFile(null); setPreview(null); fileInputRef.current.value = '' }}
              style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
              ✕ Remove
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current.click()}
            style={{
              width: '100%', padding: '20px 0',
              background: 'var(--card2)', border: '1.5px dashed var(--border)',
              borderRadius: 10, color: 'var(--muted)', cursor: 'pointer',
              fontSize: 13, marginBottom: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
            }}>
            <span style={{ fontSize: 28 }}>🖼️</span>
            <span>Tap to choose a photo</span>
          </button>
        )}

        <input
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Add a caption... (optional)"
          style={{ width: '100%', background: 'var(--card2)', border: '0.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '8px 10px', fontSize: 14, marginBottom: 8 }}
        />

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          style={{
            padding: '10px 20px',
            background: !selectedFile || uploading ? 'var(--card2)' : 'var(--pink)',
            color: !selectedFile || uploading ? 'var(--muted)' : '#fff',
            border: 'none', borderRadius: 8,
            cursor: !selectedFile || uploading ? 'default' : 'pointer',
            fontSize: 14, fontWeight: 500
          }}>
          {uploading ? 'Uploading... ⏳' : '💾 Save to album'}
        </button>
      </div>

      {/* Gallery */}
      <div className="card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🫶 Our memories</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{sorted.length} photos</span>
        </div>

        {sorted.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No memories yet. Upload your first one! 💕</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {sorted.map(m => (
              <div
                key={m.id}
                style={{ borderRadius: 10, overflow: 'hidden', position: 'relative', cursor: 'pointer', border: '0.5px solid var(--border)' }}
                onClick={() => setLightbox(m)}
              >
                <img src={m.url} alt={m.caption || 'Memory'} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                {m.caption && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,.75) 0%, transparent 100%)', padding: '18px 8px 6px' }}>
                    <p style={{ fontSize: 10, color: '#fff', margin: 0, lineHeight: 1.3, WebkitLineClamp: 2, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>{m.caption}</p>
                  </div>
                )}
                <div style={{ position: 'absolute', top: 5, left: 5, background: 'rgba(0,0,0,.5)', borderRadius: 4, padding: '1px 5px', fontSize: 9, color: 'rgba(255,255,255,.8)' }}>
                  {m.author}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => { setLightbox(null); setConfirmDelete(null) }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400 }}>
            <img src={lightbox.url} alt={lightbox.caption || 'Memory'} style={{ width: '100%', borderRadius: 12, maxHeight: '60vh', objectFit: 'contain', display: 'block' }} />
            <div style={{ marginTop: 12, padding: '0 4px' }}>
              {lightbox.caption && <p style={{ fontSize: 15, color: '#fff', margin: '0 0 6px', lineHeight: 1.5 }}>{lightbox.caption}</p>}
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', margin: 0 }}>{lightbox.author} · {lightbox.date}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <button onClick={() => { setLightbox(null); setConfirmDelete(null) }}
                style={{ padding: '10px 20px', background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 14 }}>
                Close
              </button>
              {lightbox.author === currentUser && (
                confirmDelete === lightbox.id ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setConfirmDelete(null)}
                      style={{ padding: '10px 16px', background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13 }}>No</button>
                    <button onClick={() => handleDelete(lightbox.id)}
                      style={{ padding: '10px 16px', background: '#a32d2d', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Delete</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(lightbox.id)}
                    style={{ padding: '10px 16px', background: 'rgba(163,45,45,.3)', border: '0.5px solid #a32d2d', borderRadius: 8, color: '#f09595', cursor: 'pointer', fontSize: 13 }}>
                    🗑 Delete
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
