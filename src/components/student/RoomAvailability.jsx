import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Slider,
  Switch,
  FormControlLabel,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  AccessTime,
  LocationOn,
  People,
  Search,
  FilterList,
  Refresh,
  Star,
  StarBorder,
  EventBusy,
  EventAvailable,
  Error,
  Info,
  Computer,
  Videocam,
  Wifi,
  AcUnit,
  School,
  MeetingRoom,
  Science,
  Today,
  CalendarToday
} from '@mui/icons-material';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabase';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const RoomAvailability = () => {
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [roomSchedules, setRoomSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [selectedRoomDetail, setSelectedRoomDetail] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [capacityFilter, setCapacityFilter] = useState([0, 200]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [realTimeMode, setRealTimeMode] = useState(true);
  
  // DAY MANAGEMENT
  const [selectedDay, setSelectedDay] = useState('');
  const [currentDay, setCurrentDay] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Days array (Monday to Saturday)
  const daysOfWeek = [
    { value: 'monday', label: 'Monday', short: 'Mon' },
    { value: 'tuesday', label: 'Tuesday', short: 'Tue' },
    { value: 'wednesday', label: 'Wednesday', short: 'Wed' },
    { value: 'thursday', label: 'Thursday', short: 'Thu' },
    { value: 'friday', label: 'Friday', short: 'Fri' },
    { value: 'saturday', label: 'Saturday', short: 'Sat' }
  ];

  // Initialize with today's day
  useEffect(() => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayIndex = currentTime.getDay();
    const today = days[todayIndex];
    
    // Set current day (for real-time view)
    setCurrentDay(today);
    
    // Set selected day (default to today, unless it's Sunday, then Monday)
    if (today === 'sunday') {
      setSelectedDay('monday'); // Show Monday if today is Sunday
    } else {
      setSelectedDay(today);
    }
    
    // Update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timeInterval);
  }, []);

  // Fetch real data from Supabase
  useEffect(() => {
    fetchRealData();
    
    // Real-time subscription for schedule changes
    const channel = supabase
      .channel('room-availability-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'schedules' },
        () => {
          if (realTimeMode) {
            fetchRoomSchedules();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [realTimeMode, selectedDay]);

  const fetchRealData = async () => {
    setLoading(true);
    try {
      // Fetch rooms from database
      const { data: dbRooms, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('id');
      
      if (roomsError) throw roomsError;
      
      setRooms(dbRooms || []);
      setFilteredRooms(dbRooms || []);
      
      // Fetch schedules for selected day
      await fetchRoomSchedules();
      
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load room data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomSchedules = async () => {
    if (!selectedDay) return;
    
    const currentTimeStr = currentTime.toTimeString().slice(0, 5);
    const schedulesMap = {};
    
    // Fetch schedules for the SELECTED day only
    const { data: schedules, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('day', selectedDay)
      .eq('is_active', true)
      .order('start_time');
    
    if (error) {
      console.error('Error fetching schedules:', error);
      return;
    }
    
    // Group schedules by room and find current/next for each room
    schedules?.forEach(schedule => {
      const roomId = schedule.room_id;
      
      if (!schedulesMap[roomId]) {
        schedulesMap[roomId] = {
          schedules: [],
          currentSchedule: null,
          nextSchedule: null,
          isCurrentlyOccupied: false,
          nextAvailableTime: 'Free for the day',
          scheduleCount: 0
        };
      }
      
      schedulesMap[roomId].schedules.push(schedule);
      schedulesMap[roomId].scheduleCount++;
      
      const [start, end] = schedule.period?.split('-') || ['09:00', '10:00'];
      
      // Check if this schedule is currently running
      if (selectedDay === currentDay && currentTimeStr >= start && currentTimeStr < end) {
        schedulesMap[roomId].currentSchedule = schedule;
        schedulesMap[roomId].isCurrentlyOccupied = true;
      }
      
      // Find next schedule (if any)
      if (selectedDay === currentDay && 
          !schedulesMap[roomId].nextSchedule && 
          currentTimeStr < start) {
        schedulesMap[roomId].nextSchedule = schedule;
        schedulesMap[roomId].nextAvailableTime = `Free until ${start}`;
      }
    });
    
    setRoomSchedules(schedulesMap);
  };

  // Apply filters
  useEffect(() => {
    if (rooms.length === 0) return;

    let filtered = [...rooms];

    if (buildingFilter !== 'all') {
      filtered = filtered.filter(room => room.building === buildingFilter);
    }

    if (floorFilter !== 'all') {
      filtered = filtered.filter(room => room.floor === parseInt(floorFilter));
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(room => room.type === typeFilter);
    }

    filtered = filtered.filter(room => 
      room.capacity >= capacityFilter[0] && room.capacity <= capacityFilter[1]
    );

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(room =>
        room.name?.toLowerCase().includes(query) ||
        room.id?.toLowerCase().includes(query) ||
        room.type?.toLowerCase().includes(query)
      );
    }

    if (showOnlyAvailable) {
      filtered = filtered.filter(room => {
        const schedules = roomSchedules[room.id];
        return !schedules?.isCurrentlyOccupied;
      });
    }

    setFilteredRooms(filtered);
  }, [rooms, buildingFilter, floorFilter, typeFilter, capacityFilter, searchQuery, showOnlyAvailable, roomSchedules]);

  const toggleFavorite = (roomId) => {
    if (favorites.includes(roomId)) {
      setFavorites(favorites.filter(id => id !== roomId));
      toast.success('Removed from favorites');
    } else {
      setFavorites([...favorites, roomId]);
      toast.success('Added to favorites');
    }
  };

  const getStatusColor = (roomId) => {
    const schedules = roomSchedules[roomId];
    if (!schedules || schedules.scheduleCount === 0) return '#2ecc71'; // Green if no schedules
    return schedules.isCurrentlyOccupied ? '#e74c3c' : '#2ecc71';
  };

  const getStatusIcon = (roomId) => {
    const schedules = roomSchedules[roomId];
    if (!schedules || schedules.scheduleCount === 0) return <EventAvailable sx={{ color: '#2ecc71' }} />;
    return schedules.isCurrentlyOccupied 
      ? <EventBusy sx={{ color: '#e74c3c' }} /> 
      : <EventAvailable sx={{ color: '#2ecc71' }} />;
  };

  const getStatusText = (roomId) => {
    const schedules = roomSchedules[roomId];
    if (!schedules || schedules.scheduleCount === 0) return 'AVAILABLE';
    return schedules.isCurrentlyOccupied ? 'OCCUPIED' : 'AVAILABLE';
  };

  const getFeatureIcon = (feature) => {
    if (!feature) return <LocationOn fontSize="small" />;
    switch (feature.toLowerCase()) {
      case 'projector': case 'screen': return <Videocam fontSize="small" />;
      case 'computer': case 'pc': return <Computer fontSize="small" />;
      case 'lab equipment': case 'safety gear': return <Science fontSize="small" />;
      case 'whiteboard': return <MeetingRoom fontSize="small" />;
      case 'ac': return <AcUnit fontSize="small" />;
      case 'sound system': return <Wifi fontSize="small" />;
      default: return <LocationOn fontSize="small" />;
    }
  };

  const handleResetFilters = () => {
    setBuildingFilter('all');
    setFloorFilter('all');
    setTypeFilter('all');
    setCapacityFilter([0, 200]);
    setSearchQuery('');
    setShowOnlyAvailable(false);
  };

  const viewRoomDetails = async (roomId) => {
    try {
      const room = rooms.find(r => r.id === roomId);
      const schedules = roomSchedules[roomId];
      
      // Get ALL schedules for this room (all days)
      const { data: allSchedules } = await supabase
        .from('schedules')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_active', true)
        .order('day')
        .order('start_time');
      
      setSelectedRoomDetail({
        room: room,
        todaySchedules: schedules?.schedules || [],
        allSchedules: allSchedules || [],
        current_time: currentTime.toTimeString().slice(0, 5),
        selected_day: selectedDay
      });
    } catch (err) {
      console.error('Error fetching room details:', err);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Calculate statistics
  const totalRooms = rooms.length;
  const roomsWithSchedules = rooms.filter(r => roomSchedules[r.id]?.scheduleCount > 0).length;
  const occupiedRooms = rooms.filter(r => roomSchedules[r.id]?.isCurrentlyOccupied).length;
  const availableRooms = totalRooms - occupiedRooms;

  // Prepare chart data
  const chartData = filteredRooms.length > 0 ? {
    labels: filteredRooms.map(room => room.name || room.id),
    datasets: [
      {
        label: 'Scheduled Classes',
        data: filteredRooms.map(room => roomSchedules[room.id]?.scheduleCount || 0),
        backgroundColor: filteredRooms.map(room => 
          roomSchedules[room.id]?.isCurrentlyOccupied ? '#e74c3c' : 
          (roomSchedules[room.id]?.scheduleCount > 0 ? '#3498db' : '#2ecc71')
        ),
        borderColor: '#2c3e50',
        borderWidth: 1,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { 
        display: true, 
        text: `Today's Room Utilization (${selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)})` 
      }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        title: { display: true, text: 'Number of Classes' },
        ticks: { stepSize: 1 }
      },
      x: { ticks: { maxRotation: 45, minRotation: 45 } }
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Loading Room Availability for {selectedDay}...
          </Typography>
          <LinearProgress sx={{ width: '60%', mx: 'auto' }} />
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              <Today sx={{ mr: 2, verticalAlign: 'middle' }} />
              Room Availability - {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 
              Showing {roomsWithSchedules} of {totalRooms} rooms with schedules
              {selectedDay === currentDay && ' • Real-time Updates'}
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchRealData}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<FilterList />}
            >
              {filteredRooms.length} Rooms
            </Button>
          </Box>
        </Box>

        {/* DAY SELECTOR */}
        <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: '#f8f9fa' }}>
          <Typography variant="h6" gutterBottom>
            <CalendarToday sx={{ mr: 1, verticalAlign: 'middle' }} />
            Select Day to View
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {daysOfWeek.map((day) => (
              <Button
                key={day.value}
                variant={selectedDay === day.value ? "contained" : "outlined"}
                onClick={() => setSelectedDay(day.value)}
                sx={{
                  minWidth: 100,
                  backgroundColor: selectedDay === day.value 
                    ? (day.value === currentDay ? '#3498db' : '#2ecc71')
                    : 'transparent',
                  borderColor: day.value === currentDay ? '#3498db' : '#ccc',
                  fontWeight: day.value === currentDay ? 'bold' : 'normal'
                }}
                startIcon={day.value === currentDay ? <Today /> : null}
              >
                {day.short}
                {roomSchedules && (
                  <Badge 
                    badgeContent={Object.values(roomSchedules)
                      .filter(s => s.schedules?.some(sched => sched.day === day.value)).length}
                    color="primary"
                    sx={{ ml: 1 }}
                  />
                )}
              </Button>
            ))}
          </Box>
          {selectedDay === currentDay && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Real-time View:</strong> Showing today's schedule with current occupancy status
            </Alert>
          )}
        </Paper>

        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
          <Tab label="All Rooms" />
          <Tab label="First Floor" />
          <Tab label="Second Floor" />
          <Tab label="Third Floor" />
          <Tab label="Fourth Floor" />
          <Tab label="Labs" />
        </Tabs>

        <Paper elevation={1} sx={{ p: 3, mb: 2, borderRadius: 2, bgcolor: '#f8f9fa' }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Building</InputLabel>
                <Select
                  value={buildingFilter}
                  label="Building"
                  onChange={(e) => {
                    setBuildingFilter(e.target.value);
                    if (tabValue > 0) setTabValue(0);
                  }}
                >
                  <MenuItem value="all">All Buildings</MenuItem>
                  <MenuItem value="Main Building">Main Building</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Floor</InputLabel>
                <Select
                  value={floorFilter}
                  label="Floor"
                  onChange={(e) => {
                    setFloorFilter(e.target.value);
                    const floorMap = { 1: 1, 2: 2, 3: 3, 4: 4 };
                    if (floorMap[e.target.value]) setTabValue(floorMap[e.target.value]);
                  }}
                >
                  <MenuItem value="all">All Floors</MenuItem>
                  <MenuItem value="1">First Floor</MenuItem>
                  <MenuItem value="2">Second Floor</MenuItem>
                  <MenuItem value="3">Third Floor</MenuItem>
                  <MenuItem value="4">Fourth Floor</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={typeFilter}
                  label="Type"
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="classroom">Classrooms</MenuItem>
                  <MenuItem value="lab">Labs</MenuItem>
                  <MenuItem value="auditorium">Auditorium</MenuItem>
                  <MenuItem value="library">Library</MenuItem>
                  <MenuItem value="sports">Sports Room</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" flexWrap="wrap" gap={3} alignItems="center">
                <Typography variant="body2">
                  Capacity: {capacityFilter[0]} - {capacityFilter[1]} seats
                </Typography>
                <Slider
                  value={capacityFilter}
                  onChange={(e, newValue) => setCapacityFilter(newValue)}
                  valueLabelDisplay="auto"
                  min={0}
                  max={200}
                  step={5}
                  sx={{ width: 200 }}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={showOnlyAvailable}
                      onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Show only available"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={realTimeMode}
                      onChange={(e) => setRealTimeMode(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Real-time updates"
                />
                
                <Box sx={{ flexGrow: 1 }} />
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={handleResetFilters}
                >
                  Reset Filters
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Paper>

      {filteredRooms.length > 0 && chartData && (
        <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}'s Schedule Overview
            </Typography>
            <Chip 
              label={selectedDay === currentDay ? "Live View" : "Day Preview"} 
              color={selectedDay === currentDay ? "success" : "info"} 
              size="small" 
              variant="outlined"
            />
          </Box>
          <Box sx={{ height: 300 }}>
            <Bar data={chartData} options={chartOptions} />
          </Box>
        </Paper>
      )}

      <Grid container spacing={3}>
        {filteredRooms.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 3 }}>
              <EventBusy sx={{ fontSize: 60, color: '#95a5a6', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No rooms match your search criteria
              </Typography>
              <Button 
                variant="outlined" 
                onClick={handleResetFilters}
                startIcon={<Refresh />}
              >
                Reset All Filters
              </Button>
            </Paper>
          </Grid>
        ) : (
          filteredRooms.map((room) => {
            const schedules = roomSchedules[room.id] || {};
            const isOccupied = schedules.isCurrentlyOccupied;
            const currentClass = schedules.currentSchedule;
            const nextClass = schedules.nextSchedule;
            const hasSchedules = schedules.scheduleCount > 0;
            
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={room.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderLeft: `4px solid ${getStatusColor(room.id)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight="bold" noWrap>
                          {room.name}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                          {getStatusIcon(room.id)}
                          <Chip 
                            label={getStatusText(room.id)}
                            size="small"
                            sx={{
                              backgroundColor: getStatusColor(room.id),
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.7rem'
                            }}
                          />
                          <Chip 
                            label={`Floor ${room.floor}`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={() => toggleFavorite(room.id)}
                        sx={{ 
                          color: favorites.includes(room.id) ? '#f39c12' : 'inherit',
                        }}
                      >
                        {favorites.includes(room.id) ? <Star /> : <StarBorder />}
                      </IconButton>
                    </Box>
                    
                    <Box sx={{ color: 'text.secondary', mb: 2 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <LocationOn fontSize="small" />
                        <Typography variant="body2">
                          {room.building}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <People fontSize="small" />
                        <Typography variant="body2">
                          Capacity: <strong>{room.capacity}</strong> seats
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <School fontSize="small" />
                        <Typography variant="body2">
                          Type: <strong>{room.type}</strong>
                        </Typography>
                      </Box>
                      {hasSchedules && (
                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                          <AccessTime fontSize="small" />
                          <Typography variant="body2">
                            Today's classes: <strong>{schedules.scheduleCount}</strong>
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    
                    {/* SCHEDULE DISPLAY */}
                    {!hasSchedules ? (
                      <Paper elevation={0} sx={{ p: 1.5, mb: 2, backgroundColor: '#e6ffe6', borderRadius: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          ✅ No classes scheduled for {selectedDay}
                        </Typography>
                      </Paper>
                    ) : isOccupied && currentClass ? (
                      <Paper elevation={0} sx={{ p: 1.5, mb: 2, backgroundColor: '#ffe6e6', borderRadius: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          ⏳ Currently: {currentClass.course_name}
                        </Typography>
                        <Typography variant="caption" display="block">
                          {currentClass.professor} • Until: {currentClass.period.split('-')[1]}
                        </Typography>
                      </Paper>
                    ) : nextClass ? (
                      <Paper elevation={0} sx={{ p: 1.5, mb: 2, backgroundColor: '#e8f4fc', borderRadius: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          📅 Next: {nextClass.course_name} at {nextClass.period.split('-')[0]}
                        </Typography>
                        <Typography variant="caption" display="block">
                          {schedules.nextAvailableTime}
                        </Typography>
                      </Paper>
                    ) : (
                      <Paper elevation={0} sx={{ p: 1.5, mb: 2, backgroundColor: '#e6ffe6', borderRadius: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          ✅ Available for rest of day
                        </Typography>
                      </Paper>
                    )}
                    
                    {/* SHOW TODAY'S SCHEDULES */}
                    {hasSchedules && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" fontWeight="medium" display="block" color="textSecondary" mb={0.5}>
                          Today's Schedule:
                        </Typography>
                        <Box sx={{ maxHeight: 60, overflowY: 'auto', fontSize: '0.75rem' }}>
                          {schedules.schedules.map((sched, idx) => (
                            <Box key={idx} sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              borderBottom: '1px solid #f0f0f0',
                              py: 0.5,
                              backgroundColor: sched === currentClass ? '#ffe6e6' : 'transparent'
                            }}>
                              <Typography variant="caption">
                                {sched.course_name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {sched.period}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                    
                    <Box sx={{ mt: 'auto', pt: 2 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        size="small"
                        onClick={() => viewRoomDetails(room.id)}
                        sx={{ mb: 1 }}
                      >
                        View Full Schedule
                      </Button>
                      <Typography variant="caption" color="textSecondary" display="block" textAlign="center">
                        Room ID: {room.id} • Updated just now
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>
      
      <Paper elevation={2} sx={{ p: 2, mt: 3, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Typography variant="body2" color="textSecondary">
            Showing {filteredRooms.length} of {rooms.length} rooms • 
            {selectedDay === currentDay ? ' Real-time view' : ' Preview view'}
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Chip 
              icon={<EventAvailable />} 
              label={`${availableRooms} Available`}
              color="success" 
              variant="outlined"
              size="small"
            />
            <Chip 
              icon={<EventBusy />} 
              label={`${occupiedRooms} Occupied`}
              color="error" 
              variant="outlined"
              size="small"
            />
            <Chip 
              icon={<CalendarToday />} 
              label={`${roomsWithSchedules} Scheduled`}
              color="info" 
              variant="outlined"
              size="small"
            />
            <Chip 
              label={selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}
              color="primary" 
              variant="outlined"
              size="small"
            />
          </Box>
        </Box>
      </Paper>

      {/* Room Details Dialog */}
      <Dialog open={!!selectedRoomDetail} onClose={() => setSelectedRoomDetail(null)} maxWidth="md" fullWidth>
        {selectedRoomDetail && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={1}>
                <MeetingRoom color="primary" />
                {selectedRoomDetail.room?.name} - Complete Schedule
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Room Information
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      <Typography><strong>ID:</strong> {selectedRoomDetail.room?.id}</Typography>
                      <Typography><strong>Type:</strong> {selectedRoomDetail.room?.type}</Typography>
                      <Typography><strong>Capacity:</strong> {selectedRoomDetail.room?.capacity} seats</Typography>
                      <Typography><strong>Building:</strong> {selectedRoomDetail.room?.building || 'Main Building'}</Typography>
                      <Typography><strong>Floor:</strong> {selectedRoomDetail.room?.floor}</Typography>
                      <Typography><strong>Department:</strong> {selectedRoomDetail.room?.department || 'General'}</Typography>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Today's Schedule ({selectedRoomDetail.selected_day})
                    </Typography>
                    {selectedRoomDetail.todaySchedules.length > 0 ? (
                      <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                        {selectedRoomDetail.todaySchedules.map((schedule, index) => (
                          <Paper key={index} sx={{ 
                            p: 1, 
                            mb: 1, 
                            bgcolor: schedule === selectedRoomDetail.todaySchedules.find(s => 
                              selectedRoomDetail.current_time >= s.start_time && 
                              selectedRoomDetail.current_time < s.end_time
                            ) ? '#ffe6e6' : '#f5f5f5' 
                          }}>
                            <Typography variant="body2">
                              <strong>{schedule.course_name}</strong> ({schedule.period})
                            </Typography>
                            <Typography variant="caption">
                              {schedule.professor} • {schedule.year} Year • Section {schedule.section}
                              {selectedRoomDetail.current_time >= schedule.start_time && 
                               selectedRoomDetail.current_time < schedule.end_time && 
                               ' • CURRENTLY RUNNING'}
                            </Typography>
                          </Paper>
                        ))}
                      </Box>
                    ) : (
                      <Typography color="textSecondary" sx={{ fontStyle: 'italic' }}>
                        No classes scheduled for today
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Weekly Schedule
                    </Typography>
                    {selectedRoomDetail.allSchedules.length > 0 ? (
                      <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>Day</strong></TableCell>
                              <TableCell><strong>Time</strong></TableCell>
                              <TableCell><strong>Course</strong></TableCell>
                              <TableCell><strong>Professor</strong></TableCell>
                              <TableCell><strong>Dept/Year</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedRoomDetail.allSchedules.map((schedule, index) => (
                              <TableRow key={index} hover>
                                <TableCell>{schedule.day}</TableCell>
                                <TableCell>{schedule.period}</TableCell>
                                <TableCell>{schedule.course_name}</TableCell>
                                <TableCell>{schedule.professor}</TableCell>
                                <TableCell>{schedule.department} - Y{schedule.year}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    ) : (
                      <Typography color="textSecondary" sx={{ fontStyle: 'italic' }}>
                        No weekly schedule found
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedRoomDetail(null)}>Close</Button>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => {
                  toast.success(`Added ${selectedRoomDetail.room?.name} to monitoring`);
                  setSelectedRoomDetail(null);
                }}
              >
                Monitor This Room
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default RoomAvailability;