import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp,
  TrendingDown,
  MeetingRoom,
  Schedule,
  Cancel,
  BarChart,
  PieChart
} from '@mui/icons-material';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { db } from '../../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement);

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('week');
  const [rooms, setRooms] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRooms: 0,
    availableRooms: 0,
    occupiedRooms: 0,
    cancelledClasses: 0,
    utilizationRate: 0,
    peakHours: []
  });

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load rooms
      const roomsSnapshot = await getDocs(collection(db, 'rooms'));
      const roomsData = roomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRooms(roomsData);

      // Load schedules for the week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const schedulesQuery = query(
        collection(db, 'schedules'),
        where('createdAt', '>=', oneWeekAgo.toISOString())
      );
      const schedulesSnapshot = await getDocs(schedulesQuery);
      const schedulesData = schedulesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSchedules(schedulesData);

      // Calculate statistics
      calculateStats(roomsData, schedulesData);
    } catch (err) {
      console.error('Error loading analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (roomsData, schedulesData) => {
    const totalRooms = roomsData.length;
    const availableRooms = roomsData.filter(r => r.status === 'free').length;
    const occupiedRooms = roomsData.filter(r => r.status === 'busy').length;
    const cancelledClasses = roomsData.filter(r => r.status === 'cancelled').length;
    const utilizationRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // Calculate peak hours
    const hourCounts = Array(9).fill(0); // 9 AM to 5 PM
    schedulesData.forEach(schedule => {
      const hour = parseInt(schedule.period?.split(':')[0]) || 9;
      if (hour >= 9 && hour <= 17) {
        hourCounts[hour - 9]++;
      }
    });

    const maxCount = Math.max(...hourCounts);
    const peakHours = hourCounts
      .map((count, index) => ({ hour: index + 9, count }))
      .filter(item => item.count === maxCount)
      .map(item => `${item.hour}:00`);

    setStats({
      totalRooms,
      availableRooms,
      occupiedRooms,
      cancelledClasses,
      utilizationRate,
      peakHours
    });
  };

  const getWeeklyUsageData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const usageByDay = days.map(() => 0);
    
    schedules.forEach(schedule => {
      const dayIndex = days.findIndex(day => 
        schedule.day?.toLowerCase().includes(day.toLowerCase())
      );
      if (dayIndex !== -1) {
        usageByDay[dayIndex]++;
      }
    });

    return {
      labels: days,
      datasets: [
        {
          label: 'Classes Scheduled',
          data: usageByDay,
          backgroundColor: '#3498db',
          borderColor: '#2980b9',
          borderWidth: 1,
        }
      ]
    };
  };

  const getRoomUtilizationData = () => {
    const buildingGroups = {};
    rooms.forEach(room => {
      if (!buildingGroups[room.building]) {
        buildingGroups[room.building] = { total: 0, occupied: 0 };
      }
      buildingGroups[room.building].total++;
      if (room.status === 'busy') {
        buildingGroups[room.building].occupied++;
      }
    });

    const buildings = Object.keys(buildingGroups);
    const utilizationRates = buildings.map(building => {
      const { total, occupied } = buildingGroups[building];
      return total > 0 ? Math.round((occupied / total) * 100) : 0;
    });

    return {
      labels: buildings,
      datasets: [
        {
          label: 'Utilization Rate (%)',
          data: utilizationRates,
          backgroundColor: [
            '#2ecc71', '#3498db', '#9b59b6', '#e74c3c', '#f39c12'
          ],
          borderWidth: 1,
        }
      ]
    };
  };

  const getTopRoomsData = () => {
    const roomUsage = {};
    schedules.forEach(schedule => {
      if (schedule.roomId) {
        roomUsage[schedule.roomId] = (roomUsage[schedule.roomId] || 0) + 1;
      }
    });

    const sortedRooms = Object.entries(roomUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      labels: sortedRooms.map(([roomId]) => {
        const room = rooms.find(r => r.id === roomId);
        return room ? room.name : roomId;
      }),
      datasets: [
        {
          label: 'Number of Classes',
          data: sortedRooms.map(([, count]) => count),
          backgroundColor: '#e74c3c',
          borderColor: '#c0392b',
          borderWidth: 1,
        }
      ]
    };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Analytics Dashboard
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Weekly Performance Overview
          </Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="quarter">This Quarter</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <MeetingRoom sx={{ fontSize: 40, color: '#3498db' }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">{stats.totalRooms}</Typography>
                    <Typography variant="body2" color="textSecondary">Total Rooms</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <TrendingUp sx={{ fontSize: 40, color: '#2ecc71' }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">{stats.utilizationRate}%</Typography>
                    <Typography variant="body2" color="textSecondary">Utilization Rate</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Cancel sx={{ fontSize: 40, color: '#e74c3c' }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">{stats.cancelledClasses}</Typography>
                    <Typography variant="body2" color="textSecondary">Cancelled Classes</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Schedule sx={{ fontSize: 40, color: '#f39c12' }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">{stats.peakHours.length}</Typography>
                    <Typography variant="body2" color="textSecondary">Peak Hours</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <BarChart sx={{ verticalAlign: 'middle', mr: 1 }} />
                Weekly Room Usage
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar 
                  data={getWeeklyUsageData()}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                      }
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <PieChart sx={{ verticalAlign: 'middle', mr: 1 }} />
                Building Utilization
              </Typography>
              <Box sx={{ height: 300 }}>
                <Pie 
                  data={getRoomUtilizationData()}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                      }
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TrendingUp sx={{ verticalAlign: 'middle', mr: 1 }} />
                Most Used Rooms (This Week)
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar 
                  data={getTopRoomsData()}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                      }
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AnalyticsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Quick Stats
              </Typography>
              <Box>
                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary">Room Status</Typography>
                  <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                    <Chip 
                      label={`${stats.availableRooms} Available`} 
                      color="success" 
                      variant="outlined"
                      size="small"
                    />
                    <Chip 
                      label={`${stats.occupiedRooms} Occupied`} 
                      color="error" 
                      variant="outlined"
                      size="small"
                    />
                    <Chip 
                      label={`${stats.cancelledClasses} Cancelled`} 
                      color="warning" 
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </Box>

                <Box mb={2}>
                  <Typography variant="body2" color="textSecondary">Peak Hours</Typography>
                  <Box mt={1} display="flex" flexWrap="wrap" gap={0.5}>
                    {stats.peakHours.map(hour => (
                      <Chip 
                        key={hour}
                        label={hour}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" color="textSecondary">Total Classes This Week</Typography>
                  <Typography variant="h5" fontWeight="bold">{schedules.length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper elevation={2} sx={{ p: 3, mt: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Room Performance Details
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Room Name</TableCell>
                <TableCell>Building</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Capacity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Usage Count</TableCell>
                <TableCell>Utilization</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rooms.slice(0, 8).map(room => {
                const usageCount = schedules.filter(s => s.roomId === room.id).length;
                return (
                  <TableRow key={room.id} hover>
                    <TableCell>{room.name}</TableCell>
                    <TableCell>{room.building}</TableCell>
                    <TableCell>
                      <Chip 
                        label={room.type} 
                        size="small" 
                        color={
                          room.type === 'lab' ? 'success' :
                          room.type === 'lecture' ? 'warning' : 'primary'
                        }
                      />
                    </TableCell>
                    <TableCell>{room.capacity} seats</TableCell>
                    <TableCell>
                      <Chip 
                        label={room.status || 'free'} 
                        size="small" 
                        color={
                          room.status === 'free' ? 'success' :
                          room.status === 'busy' ? 'error' : 'warning'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2">{usageCount}</Typography>
                        {usageCount > 5 && (
                          <TrendingUp fontSize="small" color="success" sx={{ ml: 1 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(usageCount * 20, 100)} 
                        sx={{ 
                          height: 8, 
                          borderRadius: 4,
                          backgroundColor: '#ecf0f1'
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Analytics;