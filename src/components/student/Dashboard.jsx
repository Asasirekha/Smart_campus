import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box, Container, Tabs, Tab, Paper } from '@mui/material';
import { Room, Dashboard, CalendarToday, Person } from '@mui/icons-material';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { label: 'Room Finder', icon: <Room />, path: '/student/rooms' },
    { label: 'Electives', icon: <Dashboard />, path: '/student/electives' },
    { label: 'My Schedule', icon: <CalendarToday />, path: '/student/schedule' },
    { label: 'Profile', icon: <Person />, path: '/student/profile' },
  ];

  const currentTab = tabs.findIndex(tab => location.pathname === tab.path);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Paper sx={{ mb: 3, borderRadius: 2 }}>
          <Tabs
            value={currentTab}
            onChange={(e, newValue) => navigate(tabs[newValue].path)}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            {tabs.map((tab, index) => (
              <Tab 
                key={index} 
                icon={tab.icon} 
                label={tab.label} 
                sx={{ py: 2 }}
              />
            ))}
          </Tabs>
        </Paper>
        
        <Outlet />
      </Container>
    </Box>
  );
};

export default StudentDashboard;