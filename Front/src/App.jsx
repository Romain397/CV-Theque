import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { StudentsList } from './components/StudentsList';
import './App.css'
import { NavBar } from './components/NavBar';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Companies from './pages/Companies';
import CompanyProfile from './pages/CompanyProfile';
import CompanyRequests from './pages/CompanyRequests';
import Schools from './pages/Schools';
import SchoolProfile from './pages/SchoolProfile';
import SchoolRequests from './pages/SchoolRequests';
import Jobs from './pages/Jobs';
import { ToastProvider } from './components/ToastProvider';

function App(){
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <ToastProvider>
      <div style={{ minHeight: '100vh', background: 'var(--page-bg)', color: 'var(--text-primary)' }}>
        <NavBar />
        <main key={location.key || location.pathname} style={{ position: 'relative', zIndex: 0, isolation: 'isolate' }}>
          <Routes location={location} key={location.key || location.pathname}>
            <Route path="/" element={<StudentsList />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/companies/:id" element={<CompanyProfile />} />
            <Route path="/company-requests" element={<CompanyRequests />} />
            <Route path="/schools" element={<Schools />} />
            <Route path="/schools/:id" element={<SchoolProfile />} />
            <Route path="/school-requests" element={<SchoolRequests />} />
            <Route path="/jobs" element={<Jobs />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}

export default App;
