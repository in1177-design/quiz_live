import { useRef, useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase.js';
import { AVATAR_EMOJIS, AVATAR_COLORS } from '../utils/avatars.js';
import { compressImage } from '../utils/compressImage.js';
import { generateId } from '../utils/ids.js';

export default function AvatarPicker({ value, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleSelfie(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const blob = await compressImage(file, { maxDim: 400, quality: 0.75 });
      const path = `selfies/${generateId()}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(storageRef);
      onChange({ type: 'photo', value: url });
    } catch (err) {
      console.error(err);
      alert('העלאת התמונה נכשלה, נסו שוב או בחרו אבטר');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8, marginBottom: 14 }}>
        {AVATAR_EMOJIS.map((emoji, i) => {
          const selected = value?.type === 'emoji' && value.value === emoji;
          return (
            <button
              type="button"
              key={emoji}
              onClick={() => onChange({ type: 'emoji', value: emoji })}
              style={{
                aspectRatio: '1', borderRadius: 12, fontSize: 22, border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: selected ? AVATAR_COLORS[i % AVATAR_COLORS.length] + '33' : 'rgba(255,255,255,0.06)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {emoji}
            </button>
          );
        })}
      </div>
      <input type="file" accept="image/*" capture="user" ref={fileRef} onChange={handleSelfie} style={{ display: 'none' }} />
      <button
        type="button"
        className="btn-secondary btn"
        style={{ width: '100%' }}
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'מעלה...' : value?.type === 'photo' ? '📷 סלפי נבחר — לחצו להחלפה' : '📷 צלמו סלפי במקום'}
      </button>
      {value?.type === 'photo' && (
        <img src={value.value} alt="selfie" style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover', marginTop: 10 }} />
      )}
    </div>
  );
}
