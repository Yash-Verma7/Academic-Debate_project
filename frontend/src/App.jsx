import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import DebateList from './pages/DebateList';
import DebateRoom from './pages/DebateRoom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <div className="app-shell">
      <h1 className="page-title">Academic Debate Platform</h1>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/debates"
          element={
            <ProtectedRoute>
              <DebateList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/debates/:debateId"
          element={
            <ProtectedRoute>
              <DebateRoom />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/debates" replace />} />
      </Routes>
    </div>
  );
}

export default App;
