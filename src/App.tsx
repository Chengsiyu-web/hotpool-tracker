import { Routes, Route } from 'react-router-dom';
import HotspotScanPage from './pages/HotspotScanPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HotspotScanPage />} />
    </Routes>
  );
}

export default App;
