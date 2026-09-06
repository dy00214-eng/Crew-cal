import { Route, Routes } from 'react-router-dom';
import OfflineBar from './components/OfflineBar.tsx';
import ComparePage from './routes/ComparePage.tsx';
import DetailPage from './routes/DetailPage.tsx';
import ListPage from './routes/ListPage.tsx';
import MapPage from './routes/MapPage.tsx';
import NewPage from './routes/NewPage.tsx';
import SettingsPage from './routes/SettingsPage.tsx';
import SharePage from './routes/SharePage.tsx';

export default function App() {
  return (
    <div className="app">
      <OfflineBar />
      <Routes>
        <Route path="/" element={<ListPage />} />
        <Route path="/new" element={<NewPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/share" element={<SharePage />} />
        <Route path="/p/:id" element={<DetailPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<ListPage />} />
      </Routes>
    </div>
  );
}
