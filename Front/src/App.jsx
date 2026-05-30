import { Routes, Route } from 'react-router-dom';
import { StudentsList } from './components/StudentsList';
import './App.css'
import { NavBar } from './components/NavBar';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Companies from './pages/Companies';
import CompanyProfile from './pages/CompanyProfile';
import Schools from './pages/Schools';
import SchoolProfile from './pages/SchoolProfile';
import Jobs from './pages/Jobs';
import { ToastProvider } from './components/ToastProvider';

function App(){
  return (
    <ToastProvider>
      <div>
        <NavBar />
        <Routes>
          <Route path="/" element={<StudentsList />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/:id" element={<CompanyProfile />} />
          <Route path="/schools" element={<Schools />} />
          <Route path="/schools/:id" element={<SchoolProfile />} />
          <Route path="/jobs" element={<Jobs />} />
        </Routes>
      </div>
    </ToastProvider>
  );
}

export default App;
