// A standalone, permanent-link copy of what was slide 12 in the "50 שנה" quiz — kept
// independent of that quiz so the slide itself can be removed from the question list without
// losing access to the image via its own link.
const IMAGE_URL = 'https://firebasestorage.googleapis.com/v0/b/quiz-live-9f18c.firebasestorage.app/o/questions%2F6d8l8w8tmtj5f40t%2F9imwnzr9mtl8t1x8.jpg?alt=media&token=4a6646ac-eccc-4952-b678-79acefd4e7d6';

export default function Slide12() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <img src={IMAGE_URL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  );
}
