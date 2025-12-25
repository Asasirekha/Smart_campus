import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Paper,
  Typography,
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
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
  Alert,
  Chip,
  Grid,
  IconButton,
  Snackbar,
  Card
} from '@mui/material';
import { Save, Add, Delete, CalendarToday, Warning, MeetingRoom } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { db } from '../../services/firebase';
import { 
  collection, addDoc, getDocs, updateDoc, doc, query, 
  where, serverTimestamp 
} from 'firebase/firestore';

const CreateTimetable = () => {
  const location = useLocation();
  const department = location.state?.department || 'CSE';
  
  const [year, setYear] = useState('3');
  const [section, setSection] = useState('A');
  const [rooms, setRooms] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [_selectedCell, setSelectedCell] = useState(null); // Prefixed with underscore
  const [timetable, setTimetable] = useState({});
  const [formData, setFormData] = useState({
    roomId: '',
    course: '',
    professor: '',
    day: 'Monday',
    period: '8:40-9:30'
  });
  const [conflictAlert, setConflictAlert] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);

  const years = useMemo(() => ['1', '2', '3', '4'], []);
  const sections = useMemo(() => ['A', 'B', 'C'], []);
  const days = useMemo(() => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], []);
  const periods = useMemo(() => [
    '8:40-9:30', '9:30-10:20', '10:20-11:10', '11:10-12:00',
    '12:00-12:50', '12:50-1:40', '1:40-2:30', '2:30-3:20', '3:20-4:10'
  ], []);

  // Load rooms and check for conflicts
  const loadRooms = useCallback(async () => {
    try {
      const roomsSnapshot = await getDocs(collection(db, 'rooms'));
      const roomsData = roomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRooms(roomsData);
    } catch (error) {
      toast.error('Failed to load rooms');
    }
  }, []);

  const initializeTimetable = useCallback(() => {
    const newTimetable = {};
    days.forEach(day => {
      newTimetable[day] = {};
      periods.forEach(period => {
        newTimetable[day][period] = null;
      });
    });
    setTimetable(newTimetable);
  }, [days, periods]);

  // Load rooms on component mount
  useEffect(() => {
    const fetchRooms = async () => {
      await loadRooms();
    };
    fetchRooms();
  }, [loadRooms]); // Added dependency

  // Initialize timetable when department, year, or section changes
  useEffect(() => {
    initializeTimetable();
  }, [department, year, section, initializeTimetable]); // Added dependency

  const checkRoomConflicts = async (roomId, day, period) => {
    try {
      // Query for any schedule at same time, regardless of department
      const conflictQuery = query(
        collection(db, 'schedules'),
        where('roomId', '==', roomId),
        where('day', '==', day),
        where('period', '==', period),
        where('isActive', '==', true)
      );
      
      const conflictSnapshot = await getDocs(conflictQuery);
      
      if (!conflictSnapshot.empty) {
        const conflicts = conflictSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        return conflicts;
      }
      
      return [];
    } catch (error) {
      console.error('Error checking conflicts:', error);
      return [];
    }
  };

  const findAvailableRooms = async (day, period) => {
    try {
      // Get all rooms
      const allRoomsSnapshot = await getDocs(collection(db, 'rooms'));
      const allRooms = allRoomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get occupied rooms at this time
      const occupiedQuery = query(
        collection(db, 'schedules'),
        where('day', '==', day),
        where('period', '==', period),
        where('isActive', '==', true)
      );
      
      const occupiedSnapshot = await getDocs(occupiedQuery);
      const occupiedRoomIds = occupiedSnapshot.docs.map(doc => doc.data().roomId);

      // Filter available rooms
      const available = allRooms.filter(room => 
        !occupiedRoomIds.includes(room.id) && 
        room.status !== 'cancelled'
      );

      setAvailableRooms(available);
      return available;
    } catch (error) {
      console.error('Error finding available rooms:', error);
      return [];
    }
  };

  const handleCellClick = async (day, period) => {
    setSelectedCell({ day, period });
    const existingClass = timetable[day]?.[period];
    
    // Find available rooms for this time slot
    await findAvailableRooms(day, period);
    
    setFormData({
      roomId: existingClass?.roomId || '',
      course: existingClass?.course || '',
      professor: existingClass?.professor || '',
      day,
      period
    });
    setOpenDialog(true);
  };

  const handleSaveClass = async () => {
    if (!formData.roomId || !formData.course || !formData.professor) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      // Check for conflicts
      const conflicts = await checkRoomConflicts(
        formData.roomId, 
        formData.day, 
        formData.period
      );

      if (conflicts.length > 0) {
        // Show conflict details
        const conflictDetails = conflicts.map(conflict => 
          `${conflict.department} Year ${conflict.year} Sec ${conflict.section} - ${conflict.course}`
        ).join(', ');

        setConflictAlert({
          open: true,
          title: 'Room Conflict Detected!',
          message: `Room ${formData.roomId} is already allocated at ${formData.day} ${formData.period}`,
          details: `Currently booked for: ${conflictDetails}`,
          conflicts: conflicts,
          day: formData.day,
          period: formData.period
        });
        return;
      }

      // Save to Firebase
      const scheduleData = {
        ...formData,
        department,
        year,
        section,
        isActive: true,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'schedules'), scheduleData);

      // Update local timetable
      const newTimetable = { ...timetable };
      newTimetable[formData.day][formData.period] = {
        roomId: formData.roomId,
        course: formData.course,
        professor: formData.professor,
        department,
        year,
        section
      };
      setTimetable(newTimetable);

      // Update room status
      const roomRef = doc(db, 'rooms', formData.roomId);
      await updateDoc(roomRef, {
        status: 'busy',
        currentClass: formData.course,
        updatedAt: serverTimestamp()
      });

      toast.success(`Class scheduled for ${department} Department!`);
      setOpenDialog(false);
      
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleConflictResolution = async (alternativeRoomId) => {
    if (!alternativeRoomId) {
      toast.error('Please select an alternative room');
      return;
    }

    try {
      // Save with alternative room
      const scheduleData = {
        roomId: alternativeRoomId,
        course: formData.course,
        professor: formData.professor,
        day: formData.day,
        period: formData.period,
        department,
        year,
        section,
        isActive: true,
        createdAt: serverTimestamp(),
        conflictResolved: true,
        originalRoomId: formData.roomId
      };

      await addDoc(collection(db, 'schedules'), scheduleData);

      // Log conflict in conflicts collection
      const conflictData = {
        roomId: formData.roomId,
        timeSlot: `${formData.day}_${formData.period}`,
        conflictingDepartments: [
          ...conflictAlert?.conflicts.map(c => c.department) || [],
          department
        ],
        resolvedWith: alternativeRoomId,
        status: 'resolved',
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'conflicts'), conflictData);

      // Update timetable
      const newTimetable = { ...timetable };
      newTimetable[formData.day][formData.period] = {
        roomId: alternativeRoomId,
        course: formData.course,
        professor: formData.professor,
        department,
        year,
        section
      };
      setTimetable(newTimetable);

      // Update room status
      const roomRef = doc(db, 'rooms', alternativeRoomId);
      await updateDoc(roomRef, {
        status: 'busy',
        currentClass: formData.course,
        updatedAt: serverTimestamp()
      });

      toast.success(`Class scheduled in alternative room ${alternativeRoomId}`);
      setConflictAlert(null);
      setOpenDialog(false);
      
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const getRoomName = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    return room ? room.name : 'Unknown';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Create Timetable - {department} Department
            </Typography>
            <Box display="flex" alignItems="center" gap={2} mt={1}>
              <Chip 
                label={department} 
                color="primary" 
                variant="outlined"
                icon={<MeetingRoom />}
              />
              <Typography variant="body2" color="textSecondary">
                Department-specific timetable management
              </Typography>
            </Box>
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Year</InputLabel>
              <Select
                value={year}
                label="Year"
                onChange={(e) => setYear(e.target.value)}
              >
                {years.map(yr => (
                  <MenuItem key={yr} value={yr}>Year {yr}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Section</InputLabel>
              <Select
                value={section}
                label="Section"
                onChange={(e) => setSection(e.target.value)}
              >
                {sections.map(sec => (
                  <MenuItem key={sec} value={sec}>Section {sec}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <Alert severity="info">
              <strong>Conflict Detection Active:</strong> System checks room availability across all departments
            </Alert>
          </Grid>
        </Grid>
      </Paper>

      {/* Timetable Table */}
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ 
                  backgroundColor: '#2c3e50', 
                  color: 'white',
                  fontWeight: 'bold',
                  position: 'sticky',
                  left: 0,
                  zIndex: 3
                }}>
                  Time / Day
                </TableCell>
                {periods.map((period) => (
                  <TableCell 
                    key={period}
                    align="center"
                    sx={{ 
                      backgroundColor: '#2c3e50', 
                      color: 'white',
                      fontWeight: 'bold',
                      minWidth: 120
                    }}
                  >
                    {period}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {days.map((day) => (
                <TableRow key={day}>
                  <TableCell 
                    sx={{ 
                      backgroundColor: '#f5f7f9',
                      fontWeight: 'bold',
                      position: 'sticky',
                      left: 0,
                      zIndex: 2
                    }}
                  >
                    {day}
                  </TableCell>
                  {periods.map((period) => {
                    const classInfo = timetable[day]?.[period];
                    const isLunch = period === '12:00-12:50';
                    
                    return (
                      <TableCell
                        key={`${day}-${period}`}
                        onClick={() => !isLunch && handleCellClick(day, period)}
                        sx={{
                          cursor: isLunch ? 'default' : 'pointer',
                          backgroundColor: isLunch ? '#fff4e6' : 'white',
                          minHeight: 80,
                          border: '1px solid #e0e0e0',
                          '&:hover': {
                            backgroundColor: isLunch ? '#fff4e6' : '#f0f7ff',
                          }
                        }}
                      >
                        {isLunch ? (
                          <Box textAlign="center" fontStyle="italic" color="#f39c12">
                            LUNCH BREAK
                          </Box>
                        ) : classInfo ? (
                          <Box>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                              <Typography variant="body2" fontWeight="bold">
                                {classInfo.course}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle delete
                                  toast.info('Delete functionality to be implemented');
                                }}
                                sx={{ p: 0 }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                            <Typography variant="caption" display="block">
                              {getRoomName(classInfo.roomId)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {classInfo.professor}
                            </Typography>
                            <Chip 
                              label={`${classInfo.department} ${classInfo.year}${classInfo.section}`} 
                              size="small" 
                              color="primary" 
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                        ) : (
                          <Box 
                            display="flex" 
                            alignItems="center" 
                            justifyContent="center"
                            height="100%"
                            color="text.secondary"
                          >
                            <Add fontSize="small" />
                            <Typography variant="caption" ml={0.5}>
                              Add Class
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add Class Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Schedule Class - {formData.day} at {formData.period}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              fullWidth
              label="Room"
              value={formData.roomId}
              onChange={(e) => setFormData({...formData, roomId: e.target.value})}
              SelectProps={{
                native: true,
              }}
            >
              <option value="">Select Room</option>
              {rooms
                .filter(room => room.status === 'free' || room.id === formData.roomId)
                .map(room => (
                  <option key={room.id} value={room.id}>
                    {room.name} ({room.building}, {room.capacity} seats)
                  </option>
                ))}
            </TextField>
            
            <TextField
              fullWidth
              label="Course/Subject"
              placeholder="e.g., Data Structures"
              value={formData.course}
              onChange={(e) => setFormData({...formData, course: e.target.value})}
            />
            
            <TextField
              fullWidth
              label="Professor"
              placeholder="e.g., Dr. Smith"
              value={formData.professor}
              onChange={(e) => setFormData({...formData, professor: e.target.value})}
            />
            
            <Box>
              <Typography variant="caption" color="textSecondary">
                Department: {department} • Year: {year} • Section: {section}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveClass}>
            Schedule Class
          </Button>
        </DialogActions>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <Dialog 
        open={conflictAlert?.open || false} 
        onClose={() => setConflictAlert(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ color: '#e74c3c' }}>
          <Warning sx={{ verticalAlign: 'middle', mr: 1 }} />
          Room Allocation Conflict
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <strong>{conflictAlert?.message}</strong>
          </Alert>
          
          <Typography variant="body1" gutterBottom>
            {conflictAlert?.details}
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Available Rooms at {conflictAlert?.day} {conflictAlert?.period}:
            </Typography>
            {availableRooms.length > 0 ? (
              <Grid container spacing={2}>
                {availableRooms.slice(0, 4).map(room => (
                  <Grid item xs={6} key={room.id}>
                    <Card 
                      variant="outlined"
                      sx={{ 
                        p: 2, 
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#f0f7ff' }
                      }}
                      onClick={() => handleConflictResolution(room.id)}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <MeetingRoom fontSize="small" />
                        <Typography variant="body1" fontWeight="medium">
                          {room.name}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        {room.building} • {room.capacity} seats
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Alert severity="warning">
                No rooms available at this time. Try a different time slot.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConflictAlert(null)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              // Try a different time slot
              setConflictAlert(null);
              toast.info('Please select a different time slot');
            }}
          >
            Try Different Time
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for messages */}
      <Snackbar
        open={!!conflictAlert}
        autoHideDuration={6000}
        onClose={() => setConflictAlert(null)}
        message={conflictAlert?.message}
      />
    </Box>
  );
};

export default CreateTimetable;