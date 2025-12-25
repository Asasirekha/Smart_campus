import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  TextField,
  InputAdornment,
  LinearProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import {
  Search,
  Refresh,
  Room,
  School,
  LocationOn,
  People,
  EventAvailable,
  EventBusy,
  AccessTime,
  Visibility,
  CalendarToday,
  FilterList,
  TrendingUp
} from '@mui/icons-material';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  getDocs,
  where,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import toast from 'react-hot-toast';

const AdminRoomAvailability = () => {
  const [rooms, setRooms] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomDetailsOpen, setRoomDetailsOpen] = useState(false);
  const [roomSchedules, setRoomSchedules] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [capacityFilter, setCapacityFilter] = useState([0, 200]);

  // Fetch rooms with real-time updates
  useEffect(() => {
    let isMounted = true;
    
    const setupListeners = () => {
      if (isMounted) setLoading(true);
      
      const q = query(
        collection(db, 'rooms'),
        orderBy('availabilityScore', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!isMounted) return;
        
        const roomsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setRooms(roomsData);
        setLoading(false);
        setLastUpdate(new Date().toLocaleTimeString());
        
        console.log(`Admin: Loaded ${roomsData.length} rooms from Firebase`);
      }, (error) => {
        console.error('Error fetching rooms:', error);
        if (isMounted) {
          setLoading(false);
          toast.error('Failed to load rooms from Firebase');
        }
      });

      // Also fetch all schedules for the schedules tab
      const schedulesQuery = query(
        collection(db, 'schedules'),
        orderBy('createdAt', 'desc')
      );
      
      const schedulesUnsubscribe = onSnapshot(schedulesQuery, (snapshot) => {
        if (!isMounted) return;
        
        const schedulesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setSchedules(schedulesData);
      });

      return () => {
        unsubscribe();
        schedulesUnsubscribe();
      };
    };
    
    const unsubscribe = setupListeners();

    // Listen for data import completion
    const handleDataImport = () => {
      toast.success('New data imported! Refreshing...');
    };
    
    window.addEventListener('data-import-complete', handleDataImport);
    
    return () => {
      isMounted = false;
      window.removeEventListener('data-import-complete', handleDataImport);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Apply filters
  const filteredRooms = rooms.filter(room => {
    if (searchTerm && !room.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !room.building?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !room.type?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    if (buildingFilter && room.building !== buildingFilter) return false;
    if (typeFilter && room.type !== typeFilter) return false;
    if (statusFilter && room.status !== statusFilter) return false;
    if (room.capacity < capacityFilter[0] || room.capacity > capacityFilter[1]) return false;
    
    return true;
  });

  // Filtered schedules (for schedules tab)
  const filteredSchedules = schedules.filter(schedule => {
    if (searchTerm && !schedule.course?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !schedule.roomName?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !schedule.professor?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleViewRoomDetails = async (room) => {
    setSelectedRoom(room);
    
    try {
      // Fetch schedules for this specific room
      const schedulesQuery = query(
        collection(db, 'schedules'),
        where('roomId', '==', room.id)
      );
      const snapshot = await getDocs(schedulesQuery);
      const roomSchedulesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setRoomSchedules(roomSchedulesData);
    } catch (error) {
      console.error('Error fetching room schedules:', error);
      setRoomSchedules([]);
    }
    
    setRoomDetailsOpen(true);
  };

  const handleUpdateRoomStatus = async (roomId, newStatus) => {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      toast.success(`Room status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating room status:', error);
      toast.error('Failed to update room status');
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    toast.success('Refreshing data...');
    setTimeout(() => setLoading(false), 1000);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'free': return 'success';
      case 'occupied': return 'error';
      case 'partially': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'free': return <EventAvailable />;
      case 'occupied': return <EventBusy />;
      default: return <EventBusy />;
    }
  };

  const getUniqueBuildings = () => {
    return [...new Set(rooms.map(room => room.building).filter(Boolean))].sort();
  };

  const getUniqueTypes = () => {
    return [...new Set(rooms.map(room => room.type).filter(Boolean))].sort();
  };

  // Calculate stats
  const stats = {
    totalRooms: rooms.length,
    availableRooms: rooms.filter(r => r.status === 'free').length,
    occupiedRooms: rooms.filter(r => r.status === 'occupied').length,
    totalSchedules: schedules.length,
    todaySchedules: schedules.filter(s => s.day === new Date().toLocaleDateString('en-US', { weekday: 'long' })).length
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" fontWeight="bold">
            <Room sx={{ verticalAlign: 'middle', mr: 2 }} />
            Admin - Room Availability
          </Typography>
          <Box display="flex" gap={2} alignItems="center">
            {lastUpdate && (
              <Typography variant="caption" color="textSecondary">
                Updated: {lastUpdate}
              </Typography>
            )}
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
        </Box>
        <Typography variant="body1" color="textSecondary">
          Monitor and manage room allocations and schedules
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.totalRooms}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">Total Rooms</Typography>
                </Box>
                <Room color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {stats.availableRooms}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">Available</Typography>
                </Box>
                <EventAvailable color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="error.main">
                    {stats.occupiedRooms}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">Occupied</Typography>
                </Box>
                <EventBusy color="error" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.totalSchedules}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">Schedules</Typography>
                </Box>
                <CalendarToday color="secondary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab label="Rooms View" icon={<Room />} iconPosition="start" />
          <Tab label="Schedules View" icon={<CalendarToday />} iconPosition="start" />
          <Tab label="Analytics" icon={<TrendingUp />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search rooms, courses, professors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Building</InputLabel>
              <Select
                value={buildingFilter}
                label="Building"
                onChange={(e) => setBuildingFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {getUniqueBuildings().map(building => (
                  <MenuItem key={building} value={building}>{building}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                label="Type"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {getUniqueTypes().map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="free">Available</MenuItem>
                <MenuItem value="occupied">Occupied</MenuItem>
                <MenuItem value="partially">Partially Free</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => {
                setBuildingFilter('');
                setTypeFilter('');
                setStatusFilter('');
                setSearchTerm('');
                setCapacityFilter([0, 200]);
              }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
          <Typography align="center" sx={{ mt: 1 }}>
            Loading data from Firebase...
          </Typography>
        </Box>
      )}

      {/* Content based on selected tab */}
      {tabValue === 0 && (
        <>
          {/* Rooms View */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6">
              Rooms ({filteredRooms.length} of {rooms.length})
            </Typography>
          </Box>
          
          {filteredRooms.length === 0 ? (
            <Alert severity="info">
              No rooms found. Upload timetable data using the Data Import page.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {filteredRooms.map((room) => (
                <Grid item xs={12} sm={6} md={4} key={room.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Typography variant="h6" fontWeight="bold">
                          {room.name}
                        </Typography>
                        <Chip 
                          label={room.status?.toUpperCase() || 'UNKNOWN'} 
                          color={getStatusColor(room.status)}
                          size="small"
                          icon={getStatusIcon(room.status)}
                        />
                      </Box>
                      
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        <LocationOn sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                        {room.building}
                      </Typography>
                      
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <People sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                        Capacity: {room.capacity} seats • Type: {room.type}
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          Availability: {room.availabilityScore}%
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={room.availabilityScore} 
                          sx={{ height: 6, borderRadius: 1 }}
                          color={
                            room.availabilityScore >= 80 ? 'success' : 
                            room.availabilityScore >= 50 ? 'warning' : 'error'
                          }
                        />
                      </Box>
                      
                      <Box display="flex" justifyContent="space-between" gap={1}>
                        <Button
                          fullWidth
                          variant="outlined"
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => handleViewRoomDetails(room)}
                        >
                          View Details
                        </Button>
                        <Button
                          fullWidth
                          variant="contained"
                          size="small"
                          onClick={() => handleUpdateRoomStatus(
                            room.id, 
                            room.status === 'free' ? 'occupied' : 'free'
                          )}
                          color={room.status === 'free' ? 'error' : 'success'}
                        >
                          {room.status === 'free' ? 'Mark Occupied' : 'Mark Available'}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {tabValue === 1 && (
        <>
          {/* Schedules View */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6">
              Schedules ({filteredSchedules.length} of {schedules.length})
            </Typography>
          </Box>
          
          {filteredSchedules.length === 0 ? (
            <Alert severity="info">
              No schedules found. Upload timetable data to see schedules.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Room</strong></TableCell>
                    <TableCell><strong>Course</strong></TableCell>
                    <TableCell><strong>Professor</strong></TableCell>
                    <TableCell><strong>Day</strong></TableCell>
                    <TableCell><strong>Time</strong></TableCell>
                    <TableCell><strong>Department</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSchedules.slice(0, 20).map((schedule) => (
                    <TableRow key={schedule.id} hover>
                      <TableCell>{schedule.roomName || schedule.roomId}</TableCell>
                      <TableCell>{schedule.course}</TableCell>
                      <TableCell>{schedule.professor}</TableCell>
                      <TableCell>{schedule.day}</TableCell>
                      <TableCell>{schedule.period}</TableCell>
                      <TableCell>{schedule.department}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            // Find the room and view its details
                            const room = rooms.find(r => r.id === schedule.roomId);
                            if (room) handleViewRoomDetails(room);
                          }}
                        >
                          View Room
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {filteredSchedules.length > 20 && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Showing first 20 of {filteredSchedules.length} schedules
              </Typography>
            </Box>
          )}
        </>
      )}

      {tabValue === 2 && (
        <>
          {/* Analytics View */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Room Distribution by Status
                  </Typography>
                  <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main" gutterBottom>
                        {stats.availableRooms}
                      </Typography>
                      <Typography variant="body2">Available Rooms</Typography>
                      
                      <Typography variant="h4" color="error.main" gutterBottom sx={{ mt: 3 }}>
                        {stats.occupiedRooms}
                      </Typography>
                      <Typography variant="body2">Occupied Rooms</Typography>
                      
                      <Typography variant="h4" gutterBottom sx={{ mt: 3 }}>
                        {stats.totalSchedules}
                      </Typography>
                      <Typography variant="body2">Total Schedules</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Quick Actions
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => window.location.href = '/admin/import'}
                      >
                        Import More Data
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => toast.success('Export started in background')}
                      >
                        Export Data
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => {
                          rooms.forEach(room => {
                            if (room.status === 'occupied') {
                              handleUpdateRoomStatus(room.id, 'free');
                            }
                          });
                        }}
                      >
                        Mark All as Available
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="secondary"
                        onClick={handleRefresh}
                      >
                        Refresh All Data
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* Room Details Dialog */}
      <Dialog 
        open={roomDetailsOpen} 
        onClose={() => setRoomDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedRoom && (
          <>
            <DialogTitle>
              <Typography variant="h5" fontWeight="bold">
                {selectedRoom.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedRoom.building} • {selectedRoom.type}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Room Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2">Capacity:</Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedRoom.capacity} seats
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">Status:</Typography>
                        <Chip 
                          label={selectedRoom.status?.toUpperCase()} 
                          color={getStatusColor(selectedRoom.status)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">Availability Score:</Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedRoom.availabilityScore}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">Schedule Count:</Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedRoom.scheduleCount || 0}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Schedules ({roomSchedules.length})
                    </Typography>
                    {roomSchedules.length > 0 ? (
                      <TableContainer sx={{ maxHeight: 250 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Course</TableCell>
                              <TableCell>Day</TableCell>
                              <TableCell>Time</TableCell>
                              <TableCell>Professor</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {roomSchedules.map((schedule) => (
                              <TableRow key={schedule.id}>
                                <TableCell>{schedule.course}</TableCell>
                                <TableCell>{schedule.day}</TableCell>
                                <TableCell>{schedule.period}</TableCell>
                                <TableCell>{schedule.professor}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info">
                        No schedules found for this room.
                      </Alert>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRoomDetailsOpen(false)}>Close</Button>
              <Button 
                variant="contained" 
                onClick={() => {
                  handleUpdateRoomStatus(
                    selectedRoom.id, 
                    selectedRoom.status === 'free' ? 'occupied' : 'free'
                  );
                  setRoomDetailsOpen(false);
                }}
              >
                Toggle Status
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default AdminRoomAvailability;