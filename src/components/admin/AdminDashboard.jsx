import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  Stack
} from '@mui/material';
import {
  Upload,
  Room,
  Schedule,
  People,
  School,
  Dashboard as DashboardIcon,
  Assessment,
  Settings
} from '@mui/icons-material';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Upload Timetable',
      description: 'Upload CSV or manually schedule classes',
      icon: <Upload />,
      path: '/admin/upload',
      color: '#2ecc71'
    },
    {
      title: 'Room Availability',
      description: 'Check real-time room occupancy',
      icon: <Room />,
      path: '/admin/rooms',
      color: '#3498db'
    },
    {
      title: 'Manual Scheduling',
      description: 'Create individual class schedules',
      icon: <Schedule />,
      path: '/admin/manual',
      color: '#9b59b6'
    },
    {
      title: 'Department View',
      description: 'View department-wise schedules',
      icon: <School />,
      path: '/admin/departments',
      color: '#e74c3c'
    },
    {
      title: 'Analytics',
      description: 'Room utilization reports',
      icon: <Assessment />,
      path: '/admin/analytics',
      color: '#f39c12'
    },
    {
      title: 'Settings',
      description: 'College room configuration',
      icon: <Settings />,
      path: '/admin/settings',
      color: '#34495e'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              <DashboardIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
              Admin Dashboard
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Manage your college timetable and room allocations
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip label="Real-time" color="success" size="small" />
            <Chip label="46 Rooms" color="primary" size="small" />
            <Chip label="6 Departments" color="secondary" size="small" />
          </Stack>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                  borderLeft: `4px solid ${action.color}`
                }
              }}
            >
              <CardContent>
                <Box sx={{ color: action.color, mb: 2 }}>
                  {action.icon}
                </Box>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  {action.title}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                  {action.description}
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => navigate(action.path)}
                  sx={{ 
                    backgroundColor: action.color,
                    '&:hover': {
                      backgroundColor: action.color,
                      opacity: 0.9
                    }
                  }}
                >
                  Go to {action.title}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={2} sx={{ p: 3, mt: 3, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          System Status
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="textSecondary">Total Rooms</Typography>
                <Typography variant="h4">46</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="textSecondary">Active Schedules</Typography>
                <Typography variant="h4">0</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="textSecondary">Departments</Typography>
                <Typography variant="h4">6</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="textSecondary">Database</Typography>
                <Typography variant="h4" color="success.main">Online</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default AdminDashboard;