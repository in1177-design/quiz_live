import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Admin from './pages/Admin.jsx';
import Presenter from './pages/Presenter.jsx';
import Player from './pages/Player.jsx';

function Home() {
  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <div className="card pop-in" style={{ textAlign: 'center', maxWidth: 420 }}>
        <div className="title" style={{ fontSize: 34, marginBottom: 8 }}>🎉 חידון חי</div>
        <div className="dim" style={{ marginBottom: 28 }}>בחרו מסך</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link to="/play" className="btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
            📱 הצטרפות כשחקן/ית
          </Link>
          <Link to="/present" className="btn btn-secondary" style={{ textDecoration: 'none', textAlign: 'center' }}>
            🖥️ מסך מנחה (מצגת)
          </Link>
          <Link to="/admin" className="btn btn-secondary" style={{ textDecoration: 'none', textAlign: 'center' }}>
            ⚙️ ניהול חידונים
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/present" element={<Presenter />} />
        <Route path="/play" element={<Player />} />
      </Routes>
    </HashRouter>
  );
}
