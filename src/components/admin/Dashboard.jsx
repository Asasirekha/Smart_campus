import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Chip
} from '@mui/material';
import {
  CloudUpload,
  CalendarToday,
  School,
  Analytics,
  Cancel,
  Logout,
  Dashboard as DashboardIcon,
  People,
  Settings,
  Menu as MenuIcon,
  Notifications,
  Person,
  Search
} from '@mui/icons-material';

const drawerWidth = 280;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const menuItems = [
  { text: 'Import Rooms', icon: <CloudUpload />, path: '/admin/import' },
  { text: 'Timetable Management', icon: <CalendarToday />, path: '/admin/timetable' },
  { text: 'Cancel Class', icon: <Cancel />, path: '/admin/cancel' },
  { text: 'Analytics Dashboard', icon: <Analytics />, path: '/admin/analytics' }, // Add this
  { text: 'System Settings', icon: <Settings />, path: '/admin/settings' },
];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    navigate('/login');
  };

  const drawer = (
    <Box>
      <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#2c3e50', color: 'white' }}>
        <Typography variant="h5" fontWeight="bold">
          ADMIN PANEL
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          Smart Campus Management
        </Typography>
        <Chip 
          label="Administrator" 
          size="small" 
          sx={{ 
            mt: 1, 
            bgcolor: '#3498db', 
            color: 'white',
            fontWeight: 'bold'
          }} 
        />
      </Box>
      <Divider />
      <List sx={{ p: 2 }}>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              if (window.innerWidth < 768) setMobileOpen(false);
            }}
            selected={location.pathname === item.path}
            sx={{
              mb: 1,
              borderRadius: 2,
              '&.Mui-selected': {
                backgroundColor: '#3498db',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#2980b9',
                },
              },
              '&:hover': {
                backgroundColor: '#f0f7ff',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text} 
              primaryTypographyProps={{ fontWeight: location.pathname === item.path ? 'bold' : 'normal' }}
            />
          </ListItem>
        ))}
      </List>
      <Divider sx={{ my: 2 }} />
      <List sx={{ p: 2 }}>
        <ListItem
          button
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            color: '#e74c3c',
            '&:hover': {
              backgroundColor: '#ffebee',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'white',
          color: '#2c3e50',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <DashboardIcon sx={{ mr: 1, color: '#3498db' }} />
            <Typography variant="h6" noWrap component="div">
              Admin Dashboard
            </Typography>
            <Chip 
              label="System Active" 
              size="small" 
              color="success" 
              variant="outlined"
              sx={{ ml: 2 }}
            />
          </Box>
          
          <IconButton color="inherit">
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          
          <IconButton onClick={handleMenuOpen} sx={{ ml: 1 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: '#3498db' }}>
              A
            </Avatar>
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => navigate('/admin/profile')}>
              <ListItemIcon>
                <Person fontSize="small" />
              </ListItemIcon>
              Admin Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          backgroundColor: '#f8f9fa'
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default AdminDashboard;