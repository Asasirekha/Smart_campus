import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton
} from '@mui/material';
import {
  School,
  Person,
  LocationOn,
  People,
  Info,
  CheckCircle,
  Cancel,
  Add,
  Remove
} from '@mui/icons-material';
import toast from 'react-hot-toast';

const ElectiveSelection = () => {
  const [selectedElective, setSelectedElective] = useState(null);
  const [electives, setElectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedForDetails, setSelectedForDetails] = useState(null);

  const sampleElectives = [
    {
      id: 'STT',
      code: 'CS401',
      name: 'Software Testing and Quality Assurance',
      professor: 'Dr. Sarah Johnson',
      credits: 3,
      room: 'Lab 101',
      capacity: 30,
      enrolled: 25,
      schedule: 'Mon & Wed, 2:00 PM - 3:30 PM',
      description: 'Comprehensive course covering software testing methodologies, automation, and quality assurance processes.',
      prerequisites: ['CS301', 'CS302'],
      syllabus: ['Unit Testing', 'Integration Testing', 'Test Automation', 'Performance Testing', 'Quality Metrics'],
      difficulty: 'Medium'
    },
    {
      id: 'NLP',
      code: 'CS402',
      name: 'Natural Language Processing',
      professor: 'Prof. Michael Chen',
      credits: 3,
      room: 'Lab 102',
      capacity: 35,
      enrolled: 32,
      schedule: 'Tue & Thu, 10:00 AM - 11:30 AM',
      description: 'Introduction to NLP techniques including text processing, sentiment analysis, and language models.',
      prerequisites: ['CS201', 'MATH301'],
      syllabus: ['Text Processing', 'Word Embeddings', 'Sequence Models', 'Transformers', 'Applications'],
      difficulty: 'High'
    },
    {
      id: 'CC',
      code: 'CS403',
      name: 'Cloud Computing Infrastructure',
      professor: 'Dr. Robert Williams',
      credits: 4,
      room: 'Lab 103',
      capacity: 25,
      enrolled: 20,
      schedule: 'Mon & Fri, 9:00 AM - 10:30 AM',
      description: 'Hands-on course covering cloud platforms, virtualization, containerization, and distributed systems.',
      prerequisites: ['CS302', 'CS303'],
      syllabus: ['Virtualization', 'Containerization', 'Cloud Storage', 'Serverless', 'Security'],
      difficulty: 'Medium'
    },
    {
      id: 'DS',
      code: 'CS404',
      name: 'Advanced Data Science',
      professor: 'Dr. Emily Davis',
      credits: 3,
      room: 'Data Science Lab',
      capacity: 40,
      enrolled: 38,
      schedule: 'Wed & Fri, 1:00 PM - 2:30 PM',
      description: 'Advanced topics in data science including big data processing, machine learning pipelines, and deployment.',
      prerequisites: ['CS301', 'STAT301'],
      syllabus: ['Big Data Tools', 'ML Pipelines', 'Model Deployment', 'A/B Testing', 'Ethics'],
      difficulty: 'High'
    },
    {
      id: 'IOT',
      code: 'CS405',
      name: 'Internet of Things',
      professor: 'Prof. David Wilson',
      credits: 3,
      room: 'IoT Lab',
      capacity: 20,
      enrolled: 15,
      schedule: 'Tue & Thu, 3:00 PM - 4:30 PM',
      description: 'Practical course on IoT architecture, sensors, communication protocols, and smart systems.',
      prerequisites: ['CS202', 'PHY202'],
      syllabus: ['IoT Architecture', 'Sensors & Actuators', 'Communication Protocols', 'Edge Computing', 'Applications'],
      difficulty: 'Medium'
    },
    {
      id: 'BC',
      code: 'CS406',
      name: 'Blockchain Fundamentals',
      professor: 'Dr. Lisa Brown',
      credits: 3,
      room: 'Lab 201',
      capacity: 30,
      enrolled: 28,
      schedule: 'Mon & Wed, 11:00 AM - 12:30 PM',
      description: 'Introduction to blockchain technology, cryptocurrencies, smart contracts, and decentralized applications.',
      prerequisites: ['CS301', 'CS304'],
      syllabus: ['Cryptography', 'Consensus Algorithms', 'Smart Contracts', 'DApps', 'Use Cases'],
      difficulty: 'High'
    }
  ];

  useEffect(() => {
    setTimeout(() => {
      setElectives(sampleElectives);
      setLoading(false);
    }, 1000);
  }, []);

  const handleSelectElective = (electiveId) => {
    setSelectedElective(electiveId);
  };

  const handleSaveSelection = () => {
    if (!selectedElective) {
      toast.error('Please select an elective first');
      return;
    }
    
    const elective = electives.find(e => e.id === selectedElective);
    toast.success(`Successfully enrolled in ${elective.name}!`);
    
    console.log('Selected elective:', elective);
  };

  const handleViewDetails = (elective) => {
    setSelectedForDetails(elective);
    setOpenDetails(true);
  };

  const getAvailabilityPercentage = (enrolled, capacity) => {
    return Math.round(((capacity - enrolled) / capacity) * 100);
  };

  const getAvailabilityColor = (enrolled, capacity) => {
    const percentage = getAvailabilityPercentage(enrolled, capacity);
    if (percentage >= 30) return 'success';
    if (percentage >= 10) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
    </Box>
    );
  }

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Choose Your Elective
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Select one elective subject for the current semester. Your selection will determine which classes appear on your schedule.
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          <strong>Important:</strong> You can only select one elective. Once selected, changes require administrative approval.
        </Alert>
      </Paper>

      {selectedElective && (
        <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 3, bgcolor: '#e8f4fc' }}>
          <Box display="flex" alignItems="center" gap={2}>
            <CheckCircle sx={{ color: '#2ecc71', fontSize: 40 }} />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Selected: {electives.find(e => e.id === selectedElective)?.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Click "Save Selection" to confirm your choice
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      <Grid container spacing={3}>
        {electives.map((elective) => {
          const isSelected = selectedElective === elective.id;
          const availabilityColor = getAvailabilityColor(elective.enrolled, elective.capacity);
          const availableSeats = elective.capacity - elective.enrolled;

          return (
            <Grid item xs={12} md={6} lg={4} key={elective.id}>
              <Card
                onClick={() => handleSelectElective(elective.id)}
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #3498db' : '1px solid #e0e0e0',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                    borderColor: '#3498db'
                  }
                }}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                      <Chip
                        label={elective.code}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="h6" fontWeight="bold">
                        {elective.name}
                      </Typography>
                    </Box>
                    {isSelected && (
                      <CheckCircle sx={{ color: '#2ecc71' }} />
                    )}
                  </Box>

                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Person fontSize="small" color="action" />
                    <Typography variant="body2">
                      {elective.professor}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <LocationOn fontSize="small" color="action" />
                    <Typography variant="body2">
                      {elective.room} • {elective.schedule}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <People fontSize="small" color="action" />
                    <Typography variant="body2">
                      {elective.enrolled}/{elective.capacity} enrolled
                    </Typography>
                    <Chip
                      label={`${availableSeats} seats left`}
                      size="small"
                      color={availabilityColor}
                      variant="outlined"
                    />
                  </Box>

                  <Typography variant="body2" color="textSecondary" paragraph sx={{ mb: 2 }}>
                    {elective.description.substring(0, 100)}...
                  </Typography>

                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Chip
                      label={`${elective.credits} Credits`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={elective.difficulty}
                      size="small"
                      color={
                        elective.difficulty === 'High' ? 'error' :
                        elective.difficulty === 'Medium' ? 'warning' : 'success'
                      }
                    />
                  </Box>

                  <Box mb={2}>
                    <Typography variant="caption" fontWeight="medium" display="block" mb={0.5}>
                      Prerequisites:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {elective.prerequisites.map((prereq, index) => (
                        <Chip
                          key={index}
                          label={prereq}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>

                  <Box display="flex" justifyContent="space-between">
                    <Button
                      size="small"
                      startIcon={<Info />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(elective);
                      }}
                    >
                      Details
                    </Button>
                    <Button
                      size="small"
                      variant={isSelected ? 'contained' : 'outlined'}
                      color={isSelected ? 'success' : 'primary'}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<CheckCircle />}
          onClick={handleSaveSelection}
          disabled={!selectedElective}
          sx={{
            px: 6,
            py: 1.5,
            fontSize: 16,
            fontWeight: 'bold'
          }}
        >
          Save Elective Selection
        </Button>
        <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
          Deadline: December 31, 2023 • 11:59 PM
        </Typography>
      </Box>

      <Dialog 
        open={openDetails} 
        onClose={() => setOpenDetails(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedForDetails && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" fontWeight="bold">
                  {selectedForDetails.name}
                </Typography>
                <Chip
                  label={selectedForDetails.code}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Professor
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedForDetails.professor}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Schedule
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedForDetails.schedule}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Room
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedForDetails.room}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Capacity
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedForDetails.enrolled}/{selectedForDetails.capacity} students
                    <Chip
                      label={`${selectedForDetails.capacity - selectedForDetails.enrolled} seats available`}
                      size="small"
                      color={getAvailabilityColor(selectedForDetails.enrolled, selectedForDetails.capacity)}
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Course Description
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedForDetails.description}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Syllabus
              </Typography>
              <List>
                {selectedForDetails.syllabus.map((topic, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={`${index + 1}. ${topic}`} />
                  </ListItem>
                ))}
              </List>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDetails(false)}>Close</Button>
              <Button
                variant="contained"
                onClick={() => {
                  handleSelectElective(selectedForDetails.id);
                  setOpenDetails(false);
                }}
              >
                Select This Elective
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ElectiveSelection;