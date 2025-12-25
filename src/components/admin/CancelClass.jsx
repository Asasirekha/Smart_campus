import React, { useState, useEffect } from 'react';
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
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Cancel,
  Warning,
  Refresh,
  CalendarToday,
  MeetingRoom
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { db } from '../../services/firebase';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

const CancelClass = () => {
  const [rooms, setRooms] = useState([]);
  const [scheduledClasses, setScheduledClasses] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [classToCancel, setClassToCancel] = useState(null);

  const loadRooms = async () => {
    try {
      const roomsSnapshot = await getDocs(collection(db, 'rooms'));
      const roomsData = roomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRooms(roomsData);
    } catch (err) {
      toast.error('Failed to load rooms');
    }
  };

  const loadScheduledClasses = async () => {
    try {
      const schedulesQuery = query(
        collection(db, 'schedules'),
        where('isActive', '==', true)
      );
      const schedulesSnapshot = await getDocs(schedulesQuery);
      const classesData = schedulesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setScheduledClasses(classesData);
    } catch (err) {
      console.log('No scheduled classes found or error:', err.message);
    }
  };

  useEffect(() => {
    loadRooms();
    loadScheduledClasses();
  }, []);

  const handleCancelClass = async () => {
    if (!selectedRoom || !reason.trim()) {
      toast.error('Please select a room and provide reason');
      return;
    }

    setLoading(true);
    try {
      // Update room status in Firebase
      const roomRef = doc(db, 'rooms', selectedRoom);
      await updateDoc(roomRef, {
        status: 'cancelled',
        reason: reason,
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Find and update corresponding schedule
      const room = rooms.find(r => r.id === selectedRoom);
      if (room && room.currentClass) {
        const scheduleQuery = query(
          collection(db, 'schedules'),
          where('roomId', '==', selectedRoom),
          where('isActive', '==', true)
        );
        const scheduleSnapshot = await getDocs(scheduleQuery);
        
        if (!scheduleSnapshot.empty) {
          const scheduleDoc = scheduleSnapshot.docs[0];
          await updateDoc(doc(db, 'schedules', scheduleDoc.id), {
            isActive: false,
            cancelled: true,
            cancellationReason: reason,
            cancelledAt: new Date().toISOString()
          });
        }
      }

      toast.success('Class cancelled successfully! Room status updated in real-time.');
      
      // Reset form
      setSelectedRoom('');
      setReason('');
      
      // Reload data
      loadRooms();
      loadScheduledClasses();
      
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCancel = (schedule) => {
    setClassToCancel(schedule);
    setOpenDialog(true);
  };

  const confirmQuickCancel = async () => {
    try {
      // Update schedule
      await updateDoc(doc(db, 'schedules', classToCancel.id), {
        isActive: false,
        cancelled: true,
        cancellationReason: 'Quick cancellation by admin',
        cancelledAt: new Date().toISOString()
      });

      // Update room
      await updateDoc(doc(db, 'rooms', classToCancel.roomId), {
        status: 'cancelled',
        reason: 'Quick cancellation by admin',
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      toast.success('Class cancelled successfully!');
      setOpenDialog(false);
      loadRooms();
      loadScheduledClasses();
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const getRoomName = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    return room ? room.name : 'Unknown';
  };

  // Filter busy rooms for the select dropdown
  const busyRooms = rooms.filter(room => room.status === 'busy');
  const cancelledRooms = rooms.filter(room => room.status === 'cancelled');

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Cancel Class
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              <Warning sx={{ verticalAlign: 'middle', mr: 1, color: '#e74c3c' }} />
              Cancel Specific Class
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Room to Cancel</InputLabel>
              <Select
                value={selectedRoom}
                label="Select Room to Cancel"
                onChange={(e) => setSelectedRoom(e.target.value)}
              >
                <MenuItem value="">Select a room</MenuItem>
                {busyRooms.map(room => (
                  <MenuItem key={room.id} value={room.id}>
                    {room.name} • {room.currentClass || 'Class in progress'} • {room.building}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Reason for Cancellation"
              multiline
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Guest lecture, Maintenance, Faculty unavailable..."
              sx={{ mb: 2 }}
            />

            <Alert severity="warning" sx={{ mb: 2 }}>
              Cancelling will immediately update room status to "cancelled" in student dashboard.
            </Alert>

            <Button
              variant="contained"
              color="error"
              startIcon={<Cancel />}
              onClick={handleCancelClass}
              disabled={loading || !selectedRoom}
              fullWidth
            >
              {loading ? 'Cancelling...' : 'Cancel Class'}
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <CalendarToday sx={{ verticalAlign: 'middle', mr: 1 }} />
                Today's Scheduled Classes
              </Typography>
              
              {scheduledClasses.length === 0 ? (
                <Alert severity="info">No classes scheduled for today</Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Room</TableCell>
                        <TableCell>Course</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {scheduledClasses.slice(0, 5).map((schedule) => (
                        <TableRow key={schedule.id} hover>
                          <TableCell>
                            <Chip 
                              label={`${schedule.period}`} 
                              size="small" 
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{getRoomName(schedule.roomId)}</TableCell>
                          <TableCell>{schedule.course}</TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              startIcon={<Cancel fontSize="small" />}
                              onClick={() => handleQuickCancel(schedule)}
                            >
                              Cancel
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadScheduledClasses}
                sx={{ mt: 2 }}
              >
                Refresh List
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {cancelledRooms.length > 0 && (
        <Paper elevation={2} sx={{ p: 3, mt: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Recently Cancelled Classes
          </Typography>
          
          <TableContainer>
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Room</strong></TableCell>
                  <TableCell><strong>Original Class</strong></TableCell>
                  <TableCell><strong>Cancelled At</strong></TableCell>
                  <TableCell><strong>Reason</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cancelledRooms.slice(0, 5).map(room => (
                  <TableRow key={room.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <MeetingRoom fontSize="small" />
                        <Typography variant="body2">{room.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {room.currentClass || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {room.cancelledAt ? new Date(room.cancelledAt).toLocaleString() : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {room.reason || 'No reason provided'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label="CANCELLED" 
                        size="small" 
                        color="error"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {cancelledRooms.length > 5 && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
              Showing 5 of {cancelledRooms.length} cancelled classes
            </Typography>
          )}
        </Paper>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Cancellation</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1, mb: 2 }}>
            Are you sure you want to cancel this class?
          </Alert>
          {classToCancel && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography><strong>Room:</strong> {getRoomName(classToCancel.roomId)}</Typography>
              <Typography><strong>Course:</strong> {classToCancel.course}</Typography>
              <Typography><strong>Professor:</strong> {classToCancel.professor}</Typography>
              <Typography><strong>Time:</strong> {classToCancel.day} at {classToCancel.period}</Typography>
              <Typography><strong>Department:</strong> {classToCancel.department} Year {classToCancel.year} Sec {classToCancel.section}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>No, Keep</Button>
          <Button variant="contained" color="error" onClick={confirmQuickCancel}>
            Yes, Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CancelClass;