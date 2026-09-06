import { Navigate, Route, Routes } from 'react-router-dom';
import OfflineBar from './components/OfflineBar.tsx';
import ComparePage from './routes/ComparePage.tsx';
import DetailPage from './routes/DetailPage.tsx';
import ListPage from './routes/ListPage.tsx';
import { loadStart } from './lib/mapView.ts';
import MapPage from './routes/MapPage.tsx';
import NewPage from './routes/NewPage.tsx';
import SettingsPage from './routes/SettingsPage.tsx';
import SharePage from './routes/SharePage.tsx';

export default function App() {
  return (
    <div className="app">
      <OfflineBar />
      <Routes>
        {/* 앱을 열면 곧바로 지도. 설정에서 목록으로 바꿀 수 있다. */}
        <Route path="/" element={<Navigate to={loadStart() === 'list' ? '/list' : '/map'} replace />} />
        <Route path="/list" element={<ListPage />} />
        <Route path="/new" element={<NewPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/share" element={<SharePage />} />
        <Route path="/p/:id" element={<DetailPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
