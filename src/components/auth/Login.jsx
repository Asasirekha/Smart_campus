import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Container,
  Paper,
  TextField,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  Typography,
  Box,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import {
  School,
  AdminPanelSettings,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  Business, // Changed from Department to Business
  Apartment // Alternative icon
} from '@mui/icons-material';

// Department options
const DEPARTMENTS = [
  { code: 'CSE', name: 'Computer Science & Engineering' },
  { code: 'CSM', name: 'Computer Science & Management' },
  { code: 'ECE', name: 'Electronics & Communication' },
  { code: 'EEE', name: 'Electrical & Electronics' },
  { code: 'IT', name: 'Information Technology' },
  { code: 'ME', name: 'Mechanical Engineering' },
  { code: 'CE', name: 'Civil Engineering' },
];

const Login = () => {
  const [email, setEmail] = useState('cse_admin@campus.edu');
  const [password, setPassword] = useState('admin123');
  const [userType, setUserType] = useState('admin');
  const [department, setDepartment] = useState('CSE');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (!email || !password) {
      toast.error('Please enter email and password');
      setLoading(false);
      return;
    }
    
    if (userType === 'admin' && !department) {
      toast.error('Please select your department');
      setLoading(false);
      return;
    }

    toast.success('Login successful! Redirecting...');
    
    setTimeout(() => {
      if (userType === 'admin') {
        // Pass department to admin dashboard
        navigate('/admin', { state: { department } });
      } else {
        navigate('/student');
      }
      setLoading(false);
    }, 1000);
  };

  const handleDemoLogin = (type, dept = 'CSE') => {
    if (type === 'student') {
      setEmail('student@campus.edu');
      setPassword('student123');
      setUserType('student');
      setDepartment('');
    } else {
      setEmail(`${dept.toLowerCase()}_admin@campus.edu`);
      setPassword('admin123');
      setUserType('admin');
      setDepartment(dept);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={10}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <School sx={{ fontSize: 60, color: '#3f51b5', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              Smart Campus Login
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Multi-Department Classroom Management System
            </Typography>
          </Box>

          <form onSubmit={handleLogin}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Login as:
              </Typography>
              <RadioGroup
                row
                value={userType}
                onChange={(e) => {
                  setUserType(e.target.value);
                  if (e.target.value === 'student') {
                    setDepartment('');
                  }
                }}
                sx={{ justifyContent: 'center', gap: 3 }}
              >
                <FormControlLabel
                  value="student"
                  control={<Radio color="primary" />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <School fontSize="small" />
                      <span>Student</span>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="admin"
                  control={<Radio color="primary" />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AdminPanelSettings fontSize="small" />
                      <span>Department Admin</span>
                    </Box>
                  }
                />
              </RadioGroup>
            </Box>

            {userType === 'admin' && (
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="department-select-label">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Business fontSize="small" /> {/* Changed from Department to Business */}
                    Select Department
                  </Box>
                </InputLabel>
                <Select
                  labelId="department-select-label"
                  value={department}
                  label="Select Department"
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                >
                  {DEPARTMENTS.map((dept) => (
                    <MenuItem key={dept.code} value={dept.code}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>{dept.code}</span>
                        <Typography variant="caption" color="textSecondary">
                          {dept.name}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, ml: 1 }}>
                  Each department has separate timetable management
                </Typography>
              </FormControl>
            )}

            <TextField
              fullWidth
              label="Email Address"
              variant="outlined"
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 3 }}
            />

            <Alert severity="info" sx={{ mb: 3 }}>
              <strong>Department Conflict Detection:</strong> System automatically detects 
              room allocation conflicts across departments in real-time.
            </Alert>

            <Button
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              type="submit"
              disabled={loading}
              startIcon={<LoginIcon />}
              sx={{
                py: 1.5,
                fontSize: 16,
                fontWeight: 600,
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1976D2 30%, #1E88E5 90%)',
                }
              }}
            >
              {loading ? 'Signing In...' : 'Sign In to Smart Campus'}
            </Button>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Quick Demo Login:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleDemoLogin('student')}
                  startIcon={<School />}
                >
                  Student Demo
                </Button>
                {DEPARTMENTS.slice(0, 3).map((dept) => (
                  <Button
                    key={dept.code}
                    variant="outlined"
                    size="small"
                    onClick={() => handleDemoLogin('admin', dept.code)}
                    startIcon={<AdminPanelSettings />}
                  >
                    {dept.code} Admin
                  </Button>
                ))}
              </Box>
            </Box>

            <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #e0e0e0' }}>
              <Typography variant="caption" color="textSecondary" align="center">
                Smart Campus Framework with Multi-Department Conflict Detection
              </Typography>
            </Box>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;