import React, { useState, useEffect } from 'react';
import { supabase, testConnection } from '../services/supabase';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Chip
} from '@mui/material';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';

const TestConnection = () => {
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [tableCounts, setTableCounts] = useState({});
  const [realTimeStatus, setRealTimeStatus] = useState('disconnected');

  const runTests = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      // Test 1: Basic connection
      const connectionTest = await testConnection();
      setTestResult(connectionTest);
      
      if (connectionTest.success) {
        // Test 2: Get table counts
        const [roomsRes, schedulesRes, deptRes] = await Promise.all([
          supabase.from('rooms').select('*', { count: 'exact', head: false }),
          supabase.from('schedules').select('*', { count: 'exact', head: false }),
          supabase.from('department_timetables').select('*', { count: 'exact', head: false })
        ]);
        
        setTableCounts({
          rooms: roomsRes.count || 0,
          schedules: schedulesRes.count || 0,
          departments: deptRes.count || 0
        });
        
        // Test 3: Real-time subscription
        const channel = supabase
          .channel('test-channel')
          .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'schedules' },
            (payload) => {
              console.log('Real-time event received:', payload);
              setRealTimeStatus('active - event received');
            }
          )
          .subscribe((status) => {
            setRealTimeStatus(status);
          });
          
        // Cleanup
        setTimeout(() => {
          supabase.removeChannel(channel);
        }, 5000);
      }
      
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult({
        success: false,
        error: error.message
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Supabase Connection Test
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Connection Status
          </Typography>
          
          {testing ? (
            <Box>
              <Typography>Testing connection...</Typography>
              <LinearProgress sx={{ mt: 2 }} />
            </Box>
          ) : testResult ? (
            <Alert 
              severity={testResult.success ? "success" : "error"}
              icon={testResult.success ? <CheckCircle /> : <ErrorIcon />}
            >
              {testResult.success ? '✅ Connected successfully!' : `❌ Failed: ${testResult.error || testResult.message}`}
            </Alert>
          ) : null}
          
          {tableCounts.rooms !== undefined && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Table Data:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={`Rooms: ${tableCounts.rooms}`} color="primary" />
                <Chip label={`Schedules: ${tableCounts.schedules}`} color="secondary" />
                <Chip label={`Departments: ${tableCounts.departments}`} color="info" />
              </Box>
            </Box>
          )}
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="textSecondary">
              Real-time Status: <strong>{realTimeStatus}</strong>
            </Typography>
          </Box>
          
          <Button 
            variant="contained" 
            onClick={runTests}
            sx={{ mt: 3 }}
            disabled={testing}
          >
            {testing ? 'Testing...' : 'Re-run Tests'}
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Troubleshooting Steps
          </Typography>
          <ul>
            <li><Typography variant="body2">1. Check if .env file has correct values</Typography></li>
            <li><Typography variant="body2">2. Verify tables exist in Supabase Table Editor</Typography></li>
            <li><Typography variant="body2">3. Check browser console for errors</Typography></li>
            <li><Typography variant="body2">4. Restart React dev server after .env changes</Typography></li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TestConnection;