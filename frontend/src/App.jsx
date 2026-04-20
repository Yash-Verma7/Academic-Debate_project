import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import DebateList from './pages/DebateList';
import DebateRoom from './pages/DebateRoom';
import DebateDetails from './pages/DebateDetails';
import CreateDebate from './pages/CreateDebate';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const ModeratorRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user?.role !== 'moderator') {
    return <Navigate to="/debate-rooms" replace />;
  }

  return children;
};

function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/debates" element={<Navigate to="/debate-rooms" replace />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/debate-rooms"
          element={
            <ProtectedRoute>
              <DebateList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-debate"
          element={
            <ModeratorRoute>
              <CreateDebate />
            </ModeratorRoute>
          }
        />
        <Route
          path="/debate/:id"
          element={
            <ProtectedRoute>
              <DebateDetails />
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
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  );
}

export default App;
