import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/auth/Login';
import StudentDashboard from './components/student/Dashboard';
import RoomAvailability from './components/student/RoomAvailability';
import ElectiveSelection from './components/student/ElectiveSelection';
import AdminLayout from './components/admin/Dashboard'; // This is the layout wrapper
import AdminDashboard from './components/admin/AdminDashboard'; // This is the content
import AdminRoomAvailability from './components/admin/AdminRoomAvailability'; // New component
import DataImport from './components/admin/DataImport';
import CreateTimetable from './components/admin/CreateTimetable';
import CancelClass from './components/admin/CancelClass';
import Analytics from './components/admin/Analytics';
import NavigationBar from './components/common/NavigationBar';
import './styles/global.css';

// Wrapper component to conditionally show NavigationBar
const Layout = ({ children }) => {
  const location = useLocation();
  const showNavBar = !location.pathname.includes('/login') && location.pathname !== '/';
  
  return (
    <>
      {showNavBar && <NavigationBar />}
      {children}
    </>
  );
};

function App() {
  return (
    <Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '10px',
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      
      <Layout>
        <Routes>
          {/* Public route - No NavigationBar */}
          <Route path="/login" element={<Login />} />
          
          {/* Student routes - With NavigationBar */}
          <Route path="/student" element={<StudentDashboard />}>
            <Route index element={<Navigate to="rooms" replace />} />
            <Route path="rooms" element={<RoomAvailability />} />
            <Route path="electives" element={<ElectiveSelection />} />
            <Route path="schedule" element={<div className="container"><h1>My Schedule</h1></div>} />
            <Route path="profile" element={<div className="container"><h1>My Profile</h1></div>} />
          </Route>
          
          {/* Admin routes - Nested inside AdminLayout */}
          <Route path="/admin" element={<AdminLayout />}> {/* This is the layout wrapper */}
            <Route index element={<AdminDashboard />} /> {/* This is the admin home page */}
            <Route path="rooms" element={<AdminRoomAvailability />} /> {/* Admin room view */}
            <Route path="import" element={<DataImport />} />
            <Route path="timetable" element={<CreateTimetable />} />
            <Route path="cancel" element={<CancelClass />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<div className="container"><h1>System Settings</h1></div>} />
          </Route>
          
          {/* Redirects */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/admin/upload" element={<Navigate to="/admin/import" replace />} />
          <Route path="/admin/create-timetable" element={<Navigate to="/admin/timetable" replace />} />
          <Route path="/admin/cancel-class" element={<Navigate to="/admin/cancel" replace />} />
          <Route path="/student/dashboard" element={<Navigate to="/student/rooms" replace />} />
          
          {/* 404 route */}
          <Route path="*" element={
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <h1>404 - Page Not Found</h1>
              <p>The page you're looking for doesn't exist.</p>
              <button 
                onClick={() => window.location.href = '/login'}
                style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#3f51b5', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
              >
                Go to Login
              </button>
            </div>
          } />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;