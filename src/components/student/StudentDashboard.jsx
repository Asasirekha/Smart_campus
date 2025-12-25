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
  IconButton
} from '@mui/material';
import {
  Search,
  Refresh,
  Room,
  School,
  LocationOn,
  People,
  EventAvailable,
  AccessTime,
  Visibility
} from '@mui/icons-material';
import { db } from '../../services/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  getDocs,
  where
} from 'firebase/firestore';
import toast from 'react-hot-toast';

const StudentDashboard = () => {
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    building: '',
    capacity: '',
    status: '',
    type: ''
  });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [roomSchedules, setRoomSchedules] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Fetch rooms with real-time updates
  useEffect(() => {
    setLoading(true);
    
    const q = query(
      collection(db, 'rooms'),
      orderBy('availabilityScore', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setRooms(roomsData);
      setFilteredRooms(roomsData);
      setLoading(false);
      setLastUpdate(new Date().toLocaleTimeString());
      
      console.log(`Loaded ${roomsData.length} rooms from Firebase`);
    }, (error) => {
      console.error('Error fetching rooms:', error);
      setLoading(false);
      toast.error('Failed to load rooms. Using demo data.');
      
      // Fallback demo data
      const demoRooms = [
        {
          id: 'demo_room',
          name: 'Demo Room',
          building: 'Main Building',
          type: 'classroom',
          capacity: 50,
          status: 'free',
          availabilityScore: 100,
          features: []
        }
      ];
      setRooms(demoRooms);
      setFilteredRooms(demoRooms);
    });

    // Listen for data update events
    const handleDataUpdate = () => {
      console.log('StudentDashboard: Data update received');
      toast.success('New room data available!');
    };
    
    window.addEventListener('data-updated', handleDataUpdate);
    
    return () => {
      unsubscribe();
      window.removeEventListener('data-updated', handleDataUpdate);
    };
  }, []);

  // Check for localStorage updates (cross-tab sync)
  useEffect(() => {
    const checkForUpdates = () => {
      const lastUpdateTime = localStorage.getItem('lastDataUpdate');
      if (lastUpdateTime && lastUpdateTime !== localStorage.getItem('studentLastUpdate')) {
        localStorage.setItem('studentLastUpdate', lastUpdateTime);
        window.location.reload(); // Simple refresh
      }
    };
    
    const interval = setInterval(checkForUpdates, 2000);
    return () => clearInterval(interval);
  }, []);

  // Apply filters
  useEffect(() => {
    let result = rooms;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(room => 
        room.name?.toLowerCase().includes(term) ||
        room.building?.toLowerCase().includes(term) ||
        room.type?.toLowerCase().includes(term)
      );
    }
    
    if (filters.building) {
      result = result.filter(room => room.building === filters.building);
    }
    
    if (filters.capacity) {
      const [min, max] = filters.capacity.split('-').map(Number);
      result = result.filter(room => room.capacity >= min && room.capacity <= max);
    }
    
    if (filters.status) {
      result = result.filter(room => room.status === filters.status);
    }
    
    if (filters.type) {
      result = result.filter(room => room.type === filters.type);
    }
    
    setFilteredRooms(result);
  }, [rooms, searchTerm, filters]);

  const handleViewDetails = async (room) => {
    setSelectedRoom(room);
    
    try {
      // Fetch schedules for this room
      const schedulesQuery = query(
        collection(db, 'schedules'),
        where('roomId', '==', room.id)
      );
      const snapshot = await getDocs(schedulesQuery);
      const schedules = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setRoomSchedules(schedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setRoomSchedules([]);
    }
    
    setDetailsOpen(true);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'free': return 'success';
      case 'occupied': return 'error';
      case 'partially': return 'warning';
      default: return 'default';
    }
  };

  const getBuildings = () => {
    return [...new Set(rooms.map(room => room.building).filter(Boolean))].sort();
  };

  const getRoomTypes = () => {
    return [...new Set(rooms.map(room => room.type).filter(Boolean))].sort();
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          <School sx={{ verticalAlign: 'middle', mr: 2 }} />
          Room Availability Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Real-time view of available rooms
        </Typography>
        {lastUpdate && (
          <Typography variant="caption" color="textSecondary">
            Last updated: {lastUpdate} • Live Firebase Data
          </Typography>
        )}
      </Box>

      {/* Stats Bar */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Room color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">{rooms.length}</Typography>
              <Typography variant="body2" color="textSecondary">Total Rooms</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <EventAvailable color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">
                {rooms.filter(r => r.status === 'free').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">Available Now</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <People color="info" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4">
                {rooms.reduce((sum, room) => sum + (room.capacity || 0), 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">Total Capacity</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AccessTime color="action" sx={{ fontSize: 40, mb: 1 }} />
              <Button
                variant="outlined"
                size="small"
                startIcon={<Refresh />}
                onClick={handleRefresh}
              >
                Refresh Data
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search rooms, building, features..."
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
          <Grid item xs={12} md={6}>
            <Grid container spacing={1}>
              <Grid item xs={6} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Building</InputLabel>
                  <Select
                    value={filters.building}
                    label="Building"
                    onChange={(e) => setFilters({...filters, building: e.target.value})}
                  >
                    <MenuItem value="">All</MenuItem>
                    {getBuildings().map(building => (
                      <MenuItem key={building} value={building}>{building}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Capacity</InputLabel>
                  <Select
                    value={filters.capacity}
                    label="Capacity"
                    onChange={(e) => setFilters({...filters, capacity: e.target.value})}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="0-30">Small (0-30)</MenuItem>
                    <MenuItem value="31-60">Medium (31-60)</MenuItem>
                    <MenuItem value="61-100">Large (61-100)</MenuItem>
                    <MenuItem value="101-500">Very Large (100+)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="free">Available</MenuItem>
                    <MenuItem value="occupied">Occupied</MenuItem>
                    <MenuItem value="partially">Partially Free</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={filters.type}
                    label="Type"
                    onChange={(e) => setFilters({...filters, type: e.target.value})}
                  >
                    <MenuItem value="">All</MenuItem>
                    {getRoomTypes().map(type => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
          <Typography align="center" sx={{ mt: 1 }}>Loading room data from Firebase...</Typography>
        </Box>
      )}

      {/* Results Info */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Available Rooms ({filteredRooms.length})
        </Typography>
        <Chip 
          label="Live" 
          color="success" 
          size="small" 
          variant="outlined"
        />
      </Box>

      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <Alert severity="info">
          {rooms.length === 0 
            ? 'No rooms found in database. Upload data using Admin panel.' 
            : 'No rooms match your criteria. Try changing your filters.'}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredRooms.map((room) => (
            <Grid item xs={12} sm={6} md={4} key={room.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.3s ease'
                  }
                }}
                onClick={() => handleViewDetails(room)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                      {room.name}
                    </Typography>
                    <Chip 
                      label={room.status?.toUpperCase() || 'UNKNOWN'} 
                      color={getStatusColor(room.status)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    <LocationOn sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                    {room.building}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <People sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                    Capacity: {room.capacity} seats
                  </Typography>
                  
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Type: {room.type}
                  </Typography>
                  
                  {/* Availability Score */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Availability Score:
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={room.availabilityScore} 
                      sx={{ mb: 1, height: 8, borderRadius: 1 }}
                      color={
                        room.availabilityScore >= 80 ? 'success' : 
                        room.availabilityScore >= 50 ? 'warning' : 'error'
                      }
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption">
                        {room.availabilityScore}%
                      </Typography>
                      <Typography variant="caption">
                        Updated: {lastUpdate?.split(' ')[0] || 'Now'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Visibility />}
                    size="small"
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Room Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
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
                          label={selectedRoom.status?.toUpperCase() || 'UNKNOWN'} 
                          color={getStatusColor(selectedRoom.status)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">Availability:</Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedRoom.availabilityScore}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">Room ID:</Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {selectedRoom.id}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Schedule ({roomSchedules.length})
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
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default StudentDashboard;