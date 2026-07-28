import { ImageIcon, ReplaceIcon } from './icons.jsx';

export default function ImageUploadField({ id, imageURL, uploading, onUpload, height = 100, radius = 10 }) {
  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <input type="file" accept="image/*" id={id} style={{ display: 'none' }} onChange={onUpload} />
      {imageURL ? (
        <>
          <img src={imageURL} alt="" style={{ width: '100%', height, objectFit: 'cover', borderRadius: radius, display: 'block' }} />
          <label
            htmlFor={id}
            title="החלפת תמונה"
            style={{
              position: 'absolute', top: 8, left: 8, width: 36, height: 36, borderRadius: '50%',
              background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: uploading ? 'default' : 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              opacity: uploading ? 0.6 : 1, pointerEvents: uploading ? 'none' : 'auto',
            }}
          >
            <ReplaceIcon size={21} />
          </label>
        </>
      ) : (
        <label
          htmlFor={id}
          style={{
            width: '100%', height, borderRadius: radius, background: 'var(--surface-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'default' : 'pointer',
            opacity: uploading ? 0.6 : 1, pointerEvents: uploading ? 'none' : 'auto',
          }}
        >
          <ImageIcon size={26} />
        </label>
      )}
    </div>
  );
}
