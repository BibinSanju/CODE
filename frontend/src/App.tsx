import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProblemsList from './pages/ProblemsList';
import Workspace from './pages/Workspace';
import Profile from './pages/Profile';
import { useAuthStore } from './store/useAuthStore';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/problems" replace />} />
            <Route 
              path="/login" 
              element={isAuthenticated ? <Navigate to="/problems" replace /> : <Login />} 
            />
            <Route 
              path="/signup" 
              element={isAuthenticated ? <Navigate to="/problems" replace /> : <Signup />} 
            />
            <Route path="/problems" element={<ProblemsList />} />
            <Route path="/problems/:id" element={<Workspace />} />
            <Route 
              path="/profile" 
              element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
