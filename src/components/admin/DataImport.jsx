import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  Alert,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Tab,
  Tabs,
  Tooltip,
  Avatar,
  Badge
} from '@mui/material';
import {
  Upload,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
  Download,
  Room,
  School,
  AccessTime,
  Warning,
  Delete,
  CloudUpload,
  Description,
  Folder,
  Cloud,
  History,
  Refresh,
  Info,
  GetApp,
  Visibility,
  CalendarToday,
  Storage
} from '@mui/icons-material';
import { parse } from 'papaparse';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabase';

// Your college rooms for validation
const COLLEGE_ROOMS = [
  '101', '102', '103', '104', '105', '106', 'EEE_LAB', '115', '116', '117', '118', '119', 'AUD',
  '201', '202', '203', 'CSE1', 'CSE2', 'CSE3', 'CSE4', 'PROJ_LAB', 'CSE5', '215', '216', 'C_LAB', 'ENG_LAB', 'SPORTS', '221',
  '301', '302', 'IT_LAB', 'LIB', '315', '316', '317', '318',
  'SIM1', 'SIM2', '401', '402', '403', '415', '416'
];

const DataImport = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [currentStage, setCurrentStage] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('CSE');
  const [validationDialog, setValidationDialog] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [autoFixErrors, setAutoFixErrors] = useState(true);
  const [conflictResolution, setConflictResolution] = useState('skip'); // skip, override, manual
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [departmentStats, setDepartmentStats] = useState({});
  
  const navigate = useNavigate();

  const departments = [
    { code: 'CSE', name: 'Computer Science & Engineering' },
    { code: 'CSM', name: 'Computer Science & Management' },
    { code: 'ECE', name: 'Electronics & Communication' },
    { code: 'EEE', name: 'Electrical & Electronics Engineering' },
    { code: 'IT', name: 'Information Technology' }
  ];

  // Fetch uploaded files from Supabase
  const fetchUploadedFiles = async () => {
    try {
      setLoadingFiles(true);
      const { data: files, error } = await supabase
        .from('timetable_files')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      // Create the table if it doesn't exist
      if (!files) {
        await createTimetableFilesTable();
        setUploadedFiles([]);
        return;
      }

      setUploadedFiles(files || []);

      // Fetch department stats
      await fetchDepartmentStats();
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
      // Create table if it doesn't exist
      if (error.code === '42P01') {
        await createTimetableFilesTable();
      }
    } finally {
      setLoadingFiles(false);
    }
  };

  // Create timetable_files table if it doesn't exist
  const createTimetableFilesTable = async () => {
    try {
      const { error } = await supabase
        .from('timetable_files')
        .insert([
          {
            id: 'sample',
            filename: 'No files uploaded yet',
            department: 'CSE',
            semester: 'Fall 2024',
            upload_date: new Date().toISOString(),
            uploaded_by: 'admin',
            status: 'uploaded',
            schedules_count: 0,
            file_size: '0 KB'
          }
        ]);
      
      // If we get an error about table not existing, we need to create it
      if (error && error.code === '42P01') {
        console.log('Table does not exist. You need to create it in Supabase:');
        console.log(`
          CREATE TABLE IF NOT EXISTS timetable_files (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            filename TEXT NOT NULL,
            department TEXT NOT NULL,
            semester TEXT NOT NULL,
            upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            uploaded_by TEXT DEFAULT 'admin',
            status TEXT DEFAULT 'uploaded',
            schedules_count INTEGER DEFAULT 0,
            file_size TEXT,
            file_url TEXT,
            validation_errors INTEGER DEFAULT 0,
            validation_warnings INTEGER DEFAULT 0
          );
        `);
      }
    } catch (err) {
      console.error('Error creating table:', err);
    }
  };

  // Fetch department statistics
  const fetchDepartmentStats = async () => {
    try {
      const stats = {};
      
      for (const dept of departments) {
        const { data, error } = await supabase
          .from('schedules')
          .select('id', { count: 'exact' })
          .eq('department', dept.code)
          .eq('is_active', true);

        if (!error) {
          stats[dept.code] = {
            count: data?.length || 0,
            files: uploadedFiles.filter(f => f.department === dept.code).length
          };
        }
      }

      setDepartmentStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Save uploaded file info to database
  const saveFileInfo = async (filename, stats) => {
    try {
      const fileInfo = {
        filename: filename,
        department: selectedDepartment,
        semester: 'Fall 2024',
        uploaded_by: 'admin',
        status: 'uploaded',
        schedules_count: stats.newSchedules,
        file_size: `${Math.round(stats.rows * 0.1)} KB`, // Approximate size
        validation_errors: validationResults?.errors.length || 0,
        validation_warnings: validationResults?.warnings.length || 0
      };

      const { error } = await supabase
        .from('timetable_files')
        .insert(fileInfo);

      if (error) throw error;

      // Refresh files list
      await fetchUploadedFiles();
    } catch (error) {
      console.error('Error saving file info:', error);
    }
  };

  // Delete uploaded file
  const handleDeleteFile = async () => {
    if (!fileToDelete || deleteConfirmation !== fileToDelete.filename) {
      toast.error('Please type the filename correctly to confirm deletion');
      return;
    }

    try {
      setDeleteLoading(true);
      
      // Delete the file record from database
      const { error } = await supabase
        .from('timetable_files')
        .delete()
        .eq('id', fileToDelete.id);

      if (error) throw error;

      // If we have schedules associated with this file, we might want to handle them
      // For now, we'll just delete the file record
      
      toast.success(`File "${fileToDelete.filename}" deleted successfully`);
      
      // Refresh files list
      await fetchUploadedFiles();
      
      // Close dialog and reset
      setDeleteDialog(false);
      setFileToDelete(null);
      setDeleteConfirmation('');
      
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Download file data
  const handleDownloadFile = async (file) => {
    try {
      // Fetch schedules for this department/semester
      const { data: schedules, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('department', file.department)
        .eq('is_active', true)
        .order('day')
        .order('period');

      if (error) throw error;

      // Convert to CSV format
      const headers = ['room_id', 'room_name', 'course', 'professor', 'day', 'period', 'department', 'year', 'section'];
      const csvRows = [
        headers.join(','),
        ...schedules.map(row => 
          headers.map(header => {
            const value = row[header] || '';
            return `"${value}"`;
          }).join(',')
        )
      ];

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.department}_timetable_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('File downloaded successfully');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  // View file details
  const handleViewFile = (file) => {
    // Navigate to a details page or show in dialog
    toast.success(`Viewing details for ${file.filename}`);
    // You can implement a detailed view modal here
  };

  // Initial fetch
  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const validateCSVData = async (csvData) => {
    const errors = [];
    const warnings = [];
    const validRows = [];
    const roomConflicts = [];
    
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNum = i + 2; // +2 because header is row 1 and arrays are 0-indexed
      
      // Check required fields
      if (!row.room_id) errors.push(`Row ${rowNum}: Missing room_id`);
      if (!row.course) errors.push(`Row ${rowNum}: Missing course`);
      if (!row.day) errors.push(`Row ${rowNum}: Missing day`);
      if (!row.period) errors.push(`Row ${rowNum}: Missing period`);
      
      // Check if room exists in college
      if (row.room_id && !COLLEGE_ROOMS.includes(row.room_id)) {
        warnings.push(`Row ${rowNum}: Room ${row.room_id} not found in college database`);
      }
      
      // Check room capacity if provided
      if (row.capacity && isNaN(parseInt(row.capacity))) {
        warnings.push(`Row ${rowNum}: Invalid capacity value`);
      }
      
      // Check time format
      if (row.period && !row.period.includes('-')) {
        errors.push(`Row ${rowNum}: Invalid period format (should be like "8:40-9:30")`);
      }
      
      // Check for room conflicts in database
      if (row.room_id && row.day && row.period) {
        try {
          const { data: conflicts } = await supabase
            .from('schedules')
            .select('*')
            .eq('room_id', row.room_id)
            .eq('day', row.day.toLowerCase())
            .eq('is_active', true);
          
          if (conflicts && conflicts.length > 0) {
            const [start1, end1] = row.period.split('-');
            conflicts.forEach(conflict => {
              const [start2, end2] = conflict.period.split('-');
              // Check if periods overlap
              if (!(end1 <= start2 || start1 >= end2)) {
                roomConflicts.push({
                  row: rowNum,
                  room: row.room_id,
                  conflictWith: conflict.course_name,
                  conflictPeriod: conflict.period,
                  newPeriod: row.period,
                  day: row.day
                });
              }
            });
          }
        } catch (err) {
          console.error('Conflict check error:', err);
        }
      }
      
      if (!errors.some(e => e.startsWith(`Row ${rowNum}:`))) {
        validRows.push(row);
      }
    }
    
    return { errors, warnings, validRows, roomConflicts, totalRows: csvData.length };
  };

  const resolveConflicts = async (conflicts, validRows) => {
    const resolvedRows = [...validRows];
    
    for (const conflict of conflicts) {
      switch (conflictResolution) {
        case 'skip':
          // Remove conflicting row
          resolvedRows.splice(conflict.row - 2, 1);
          break;
          
        case 'override':
          // Keep new row, will override in database
          break;
          
        case 'manual':
          // For manual resolution, we'll skip for now
          resolvedRows.splice(conflict.row - 2, 1);
          break;
      }
    }
    
    return resolvedRows;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset states
    setUploading(true);
    setProgress(0);
    setUploadResult(null);
    setPreviewData([]);
    setCurrentStage('Starting...');

    try {
      // 1. Parse CSV
      setCurrentStage('Parsing CSV...');
      setProgress(10);
      
      const text = await file.text();
      const result = parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        transform: (value) => value ? value.trim() : value
      });

      const csvData = result.data;
      
      if (csvData.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Validate columns
      const requiredColumns = ['room_id', 'room_name', 'course', 'day', 'period'];
      const headers = result.meta.fields || [];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        throw new Error(`Missing columns: ${missingColumns.join(', ')}`);
      }

      // Show preview
      setPreviewData(csvData.slice(0, 5));
      setCurrentStage(`Validating ${csvData.length} rows...`);
      setProgress(20);

      // 2. Validate data
      const validation = await validateCSVData(csvData);
      
      if (validation.errors.length > 0) {
        setValidationResults(validation);
        setValidationDialog(true);
        throw new Error(`Found ${validation.errors.length} validation errors`);
      }
      
      // Show validation results if warnings
      if (validation.warnings.length > 0 || validation.roomConflicts.length > 0) {
        setValidationResults(validation);
        setValidationDialog(true);
        
        // Wait for user confirmation
        await new Promise((resolve) => {
          const checkDialog = setInterval(() => {
            if (!validationDialog) {
              clearInterval(checkDialog);
              resolve();
            }
          }, 100);
        });
      }

      setCurrentStage('Processing data...');
      setProgress(30);

      // 3. Resolve conflicts if any
      let finalRows = validation.validRows;
      if (validation.roomConflicts.length > 0) {
        finalRows = await resolveConflicts(validation.roomConflicts, validation.validRows);
      }

      const schedulesData = [];
      const roomsSet = new Set();
      const coursesSet = new Set();

      finalRows.forEach((row) => {
        const department = row.department || selectedDepartment;
        const roomKey = `${row.room_id}_${department}`;
        
        // Track unique rooms
        if (!roomsSet.has(roomKey)) {
          roomsSet.add(roomKey);
        }

        // Prepare schedule
        const schedule = {
          room_id: row.room_id,
          room_name: row.room_name || `Room ${row.room_id}`,
          course_name: row.course,
          professor: row.professor || 'Staff',
          day: row.day.toLowerCase(),
          period: row.period,
          start_time: row.start_time || row.period.split('-')[0],
          end_time: row.end_time || row.period.split('-')[1] || row.period.split('-')[0],
          department: department,
          year: row.year || '3',
          section: row.section || 'A',
          semester: row.semester || 'Fall 2024',
          is_active: true,
          created_at: new Date().toISOString()
        };

        schedulesData.push(schedule);
        coursesSet.add(row.course);
      });

      setCurrentStage('Uploading to database...');
      setProgress(40);

      // 4. Upload schedules with duplicate handling
      let successCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;

      // Upload each schedule individually to handle duplicates properly
      for (let i = 0; i < schedulesData.length; i++) {
        const schedule = schedulesData[i];
        
        try {
          // Try to insert each schedule
          const { error } = await supabase
            .from('schedules')
            .insert(schedule);
          
          if (error) {
            if (error.code === '23505') {
              // This is a duplicate - skip it
              duplicateCount++;
              console.log(`Duplicate skipped: ${schedule.room_id} at ${schedule.period}`);
              continue;
            } else {
              // Some other error
              console.error('Upload error:', error);
              errorCount++;
              continue;
            }
          }
          
          successCount++;
          
        } catch (err) {
          if (err.code === '23505') {
            duplicateCount++;
            continue;
          }
          console.error('Error uploading schedule:', err);
          errorCount++;
        }
        
        // Update progress every 10 items or at the end
        if (i % 10 === 0 || i === schedulesData.length - 1) {
          const currentProgress = 40 + Math.round((i / schedulesData.length) * 40);
          setProgress(currentProgress);
          setCurrentStage(`Processed ${i + 1}/${schedulesData.length} (${successCount} uploaded, ${duplicateCount} duplicates)`);
        }
      }

      // If no schedules were uploaded at all, throw error
      if (successCount === 0 && schedulesData.length > 0) {
        throw new Error('No schedules were uploaded. All were duplicates or had errors.');
      }

      setProgress(80);
      setCurrentStage('Updating rooms...');

      // 5. Create/update rooms with your college data
      const roomsData = Array.from(roomsSet).map(roomKey => {
        const [roomId, dept] = roomKey.split('_');
        const collegeRoom = COLLEGE_ROOMS.includes(roomId);
        
        return {
          id: roomId,
          name: collegeRoom ? getRoomName(roomId) : `Room ${roomId}`,
          building: 'Main Building',
          capacity: collegeRoom ? getRoomCapacity(roomId) : 30,
          department: dept,
          type: collegeRoom ? getRoomType(roomId) : 'classroom',
          status: 'available',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      if (roomsData.length > 0) {
        const { error: roomsError } = await supabase
          .from('rooms')
          .upsert(roomsData, { 
            onConflict: 'id,department',
            ignoreDuplicates: false
          });

        if (roomsError) {
          console.warn('Room update warning:', roomsError.message);
        }
      }

      setCurrentStage('Updating department summary...');
      setProgress(95);

      // 6. Update department summary
      const summary = {
        department: selectedDepartment,
        semester: 'Fall 2024',
        total_courses: coursesSet.size,
        total_rooms: roomsSet.size,
        total_schedules: successCount,
        last_updated: new Date().toISOString(),
        uploaded_by: 'admin'
      };

      const { error: summaryError } = await supabase
        .from('department_timetables')
        .upsert(summary, { onConflict: 'department,semester' });

      if (summaryError) {
        console.warn('Summary update warning:', summaryError.message);
      }

      // Save file information
      const stats = {
        rows: csvData.length,
        newSchedules: successCount,
        duplicates: duplicateCount,
        errors: errorCount,
        rooms: roomsSet.size,
        courses: coursesSet.size
      };
      
      await saveFileInfo(file.name, stats);

      // Trigger real-time update
      await supabase.channel('data-import-updates').send({
        type: 'broadcast',
        event: 'timetable_imported',
        payload: {
          department: selectedDepartment,
          timestamp: new Date().toISOString(),
          schedules: successCount
        }
      });

      // Success
      setProgress(100);
      setCurrentStage('Complete!');

      const resultData = {
        success: true,
        message: `✅ Uploaded ${successCount} new schedules for ${selectedDepartment} (${duplicateCount} duplicates skipped)`,
        stats: stats
      };
      
      setUploadResult(resultData);
      toast.success(`Uploaded ${successCount} new timetable entries (${duplicateCount} duplicates skipped)`);

      // Clear file input
      event.target.value = '';

    } catch (err) {
      console.error('Upload error:', err);
      setUploadResult({
        success: false,
        message: `❌ Upload failed: ${err.message}`,
        error: err.toString()
      });
      toast.error(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Helper functions for your college rooms
  const getRoomName = (roomId) => {
    const roomMap = {
      '101': 'Room 101', '102': 'Room 102', '103': 'Chemistry Lab', '104': 'Room 104',
      '105': 'CSM Lab', '106': 'Room 106', 'EEE_LAB': 'EEE Lab', '115': 'Room 115',
      '116': 'Room 116', '117': 'Room 117', '118': 'Room 118', '119': 'Room 119',
      'AUD': 'Auditorium', '201': 'Room 201', '202': 'Room 202', '203': 'Room 203',
      'CSE1': 'CSE Lab 1', 'CSE2': 'CSE Lab 2', 'CSE3': 'CSE Lab 3', 'CSE4': 'CSE Lab 4',
      'PROJ_LAB': 'Project Lab', 'CSE5': 'CSE Lab 5', '215': 'Room 215', '216': 'Room 216',
      'C_LAB': 'C Lab', 'ENG_LAB': 'English Lab', 'SPORTS': 'Sports Room', '221': 'Room 221',
      '301': 'Room 301', '302': 'Room 302', 'IT_LAB': 'IT Lab', 'LIB': 'Library',
      '315': 'Room 315', '316': 'Room 316', '317': 'Room 317', '318': 'Room 318',
      'SIM1': 'Simulation Lab 1', 'SIM2': 'Simulation Lab 2', '401': 'Room 401',
      '402': 'Room 402', '403': 'Room 403', '415': 'Room 415', '416': 'Room 416'
    };
    return roomMap[roomId] || `Room ${roomId}`;
  };

  const getRoomCapacity = (roomId) => {
    const capacityMap = {
      'AUD': 150, 'LIB': 200, 'SPORTS': 100, '301': 60, '302': 60,
      '401': 55, '402': 55, '403': 55, '415': 60, '416': 60,
      '221': 50, '315': 50, '316': 50, '317': 50, '318': 50,
      '102': 45, '202': 45, '101': 40, '104': 40, '201': 40, '203': 40,
      '215': 40, '216': 40, '115': 35, '116': 35, '117': 35, '118': 35,
      '119': 35, '106': 50, 'CSE1': 30, 'CSE2': 30, 'CSE3': 30, 'CSE4': 30,
      'CSE5': 30, '105': 30, 'IT_LAB': 30, 'ENG_LAB': 30, 'C_LAB': 25,
      'PROJ_LAB': 25, '103': 20, 'SIM1': 20, 'SIM2': 20, 'EEE_LAB': 20
    };
    return capacityMap[roomId] || 30;
  };

  const getRoomType = (roomId) => {
    if (['103', '105', 'EEE_LAB', 'CSE1', 'CSE2', 'CSE3', 'CSE4', 'CSE5', 
         'PROJ_LAB', 'C_LAB', 'ENG_LAB', 'IT_LAB', 'SIM1', 'SIM2'].includes(roomId)) {
      return 'lab';
    } else if (roomId === 'AUD') {
      return 'auditorium';
    } else if (roomId === 'LIB') {
      return 'library';
    } else if (roomId === 'SPORTS') {
      return 'sports';
    }
    return 'classroom';
  };

  const handleDownloadTemplate = () => {
    const template = `room_id,room_name,building,capacity,course,professor,day,period,department,year,section,semester,start_time,end_time
101,Room 101,Main Building,40,Data Structures,Dr. Smith,Monday,8:40-9:30,CSE,3,A,Fall 2024,8:40,9:30
102,Room 102,Main Building,45,Algorithms,Dr. Johnson,Tuesday,10:20-11:10,CSE,3,B,Fall 2024,10:20,11:10
103,Chemistry Lab,Main Building,20,Chemistry,Prof. Davis,Wednesday,1:40-2:30,CSE,2,A,Fall 2024,13:40,14:30
CSE1,CSE Lab 1,Main Building,30,Programming Lab,Dr. Miller,Thursday,9:30-10:20,CSE,2,A,Fall 2024,9:30,10:20
AUD,Auditorium,Main Building,150,Guest Lecture,Industry Expert,Friday,2:30-3:20,CSE,ALL,ALL,Fall 2024,14:30,15:20`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable_template_${selectedDepartment}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Template downloaded with your college rooms');
  };

  const handleProceedWithUpload = () => {
    setValidationDialog(false);
    // Continue with upload (handled in the main function)
  };

  const handleTestUpload = () => {
    // Create a simple test CSV programmatically
    const testCSV = `room_id,room_name,course,day,period,department
101,Room 101,Test Course 1,Monday,8:40-9:30,CSE
102,Room 102,Test Course 2,Tuesday,10:20-11:10,CSE
201,Room 201,Test Course 3,Wednesday,1:40-2:30,CSE`;

    const blob = new Blob([testCSV], { type: 'text/csv' });
    const file = new File([blob], 'test.csv', { type: 'text/csv' });
    
    // Simulate file input
    const event = {
      target: {
        files: [file]
      }
    };
    
    handleFileUpload(event);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const openDeleteDialog = (file) => {
    setFileToDelete(file);
    setDeleteConfirmation('');
    setDeleteDialog(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        <CloudUpload sx={{ mr: 2, verticalAlign: 'middle' }} />
        Timetable Data Management
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        Upload CSV files, manage uploaded timetables, and track department schedules
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={handleTabChange}>
          <Tab icon={<CloudUpload />} label="Upload CSV" />
          <Tab icon={<Folder />} label="Uploaded Files" />
          <Tab icon={<Storage />} label="Department Stats" />
        </Tabs>
      </Box>

      {selectedTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Upload CSV File
                </Typography>

                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>Your College Rooms:</strong> System will validate against {COLLEGE_ROOMS.length} rooms in your college database
                </Alert>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={selectedDepartment}
                    label="Department"
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    disabled={uploading}
                  >
                    {departments.map(dept => (
                      <MenuItem key={dept.code} value={dept.code}>
                        {dept.code} - {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ border: '2px dashed #ccc', p: 3, borderRadius: 2, textAlign: 'center', mb: 2 }}>
                  <input
                    accept=".csv"
                    style={{ display: 'none' }}
                    id="csv-upload"
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <label htmlFor="csv-upload">
                    <Button
                      variant="contained"
                      component="span"
                      startIcon={<Upload />}
                      disabled={uploading}
                      sx={{ mb: 1, mr: 2 }}
                    >
                      {uploading ? 'Uploading...' : 'Select CSV File'}
                    </Button>
                  </label>
                  
                  <Button
                    variant="outlined"
                    onClick={handleTestUpload}
                    disabled={uploading}
                    sx={{ mb: 1 }}
                  >
                    Quick Test (3 rows)
                  </Button>
                  
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Supports: room_id, room_name, course, professor, day, period, department
                  </Typography>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Department: {selectedDepartment}
                  </Typography>
                </Box>

                {uploading && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="body2">{currentStage}</Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={progress} 
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    />
                    <Box display="flex" justifyContent="space-between" sx={{ mt: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        {progress}% complete
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Connecting to Supabase...
                      </Typography>
                    </Box>
                  </Box>
                )}

                {uploadResult && (
                  <Alert 
                    severity={uploadResult.success ? "success" : "error"}
                    sx={{ mt: 3 }}
                    onClose={() => setUploadResult(null)}
                    icon={uploadResult.success ? <CheckCircle /> : <ErrorIcon />}
                  >
                    {uploadResult.message}
                    {uploadResult.success && uploadResult.stats && (
                      <Box sx={{ mt: 1 }}>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Chip 
                              icon={<Room />}
                              label={`${uploadResult.stats.newSchedules} new`}
                              size="small" 
                              variant="outlined"
                              sx={{ width: '100%' }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <Chip 
                              icon={<Schedule />}
                              label={`${uploadResult.stats.duplicates} duplicates`}
                              size="small" 
                              variant="outlined"
                              sx={{ width: '100%' }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <Chip 
                              icon={<School />}
                              label={`${uploadResult.stats.courses} courses`}
                              size="small" 
                              variant="outlined"
                              sx={{ width: '100%' }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <Chip 
                              icon={<AccessTime />}
                              label={uploadResult.stats.department}
                              size="small" 
                              variant="outlined"
                              sx={{ width: '100%' }}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </Alert>
                )}

                <Box sx={{ mt: 3 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Schedule />}
                    onClick={() => navigate('/admin/rooms')}
                    sx={{ mb: 2 }}
                  >
                    Check Room Availability
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Upload />}
                    onClick={() => navigate('/admin/manual-entry')}
                  >
                    Manual Timetable Entry
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Preview & Actions
                </Typography>

                {previewData.length > 0 ? (
                  <>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        First {previewData.length} rows:
                      </Typography>
                    </Box>
                    <TableContainer sx={{ maxHeight: 200 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Room</strong></TableCell>
                            <TableCell><strong>Course</strong></TableCell>
                            <TableCell><strong>Day</strong></TableCell>
                            <TableCell><strong>Time</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {previewData.map((row, i) => (
                            <TableRow key={i} hover>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2">{row.room_name}</Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    {row.room_id}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>{row.course}</TableCell>
                              <TableCell>{row.day}</TableCell>
                              <TableCell>{row.period}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Upload sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
                    <Typography color="textSecondary">
                      Upload a CSV file to preview data
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #eee' }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={handleDownloadTemplate}
                    sx={{ mb: 2 }}
                  >
                    Download CSV Template
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Schedule />}
                    onClick={() => navigate('/dashboard')}
                  >
                    View Student Dashboard
                  </Button>
                </Box>

                <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="caption" color="textSecondary" display="block">
                    <strong>College Room IDs:</strong> {COLLEGE_ROOMS.slice(0, 10).join(', ')}...
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Total {COLLEGE_ROOMS.length} rooms in database
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedTab === 1 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                <Folder sx={{ mr: 1, verticalAlign: 'middle' }} />
                Uploaded Timetable Files
              </Typography>
              <Button
                startIcon={<Refresh />}
                onClick={fetchUploadedFiles}
                disabled={loadingFiles}
              >
                Refresh
              </Button>
            </Box>

            {loadingFiles ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : uploadedFiles.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Cloud sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
                <Typography color="textSecondary" gutterBottom>
                  No files uploaded yet
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Upload a CSV file to get started
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<CloudUpload />}
                  onClick={() => setSelectedTab(0)}
                  sx={{ mt: 2 }}
                >
                  Go to Upload
                </Button>
              </Box>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <strong>Total Files:</strong> {uploadedFiles.length} files uploaded across {new Set(uploadedFiles.map(f => f.department)).size} departments
                </Alert>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Filename</strong></TableCell>
                        <TableCell><strong>Department</strong></TableCell>
                        <TableCell><strong>Upload Date</strong></TableCell>
                        <TableCell><strong>Schedules</strong></TableCell>
                        <TableCell><strong>File Size</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Actions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {uploadedFiles.map((file) => (
                        <TableRow key={file.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <Description sx={{ mr: 1, color: 'primary.main' }} />
                              <Typography variant="body2">
                                {file.filename}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="textSecondary">
                              Uploaded by: {file.uploaded_by}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={file.department}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(file.upload_date)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {new Date(file.upload_date).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Badge
                              badgeContent={file.schedules_count}
                              color="primary"
                              sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem' } }}
                            >
                              <CalendarToday fontSize="small" />
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {file.file_size || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={file.status}
                              size="small"
                              color={file.status === 'uploaded' ? 'success' : 'warning'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1}>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewFile(file)}
                                >
                                  <Visibility fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Download">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadFile(file)}
                                >
                                  <GetApp fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => openDeleteDialog(file)}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="textSecondary">
                    Showing {uploadedFiles.length} files
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Delete />}
                    onClick={() => {
                      if (uploadedFiles.length > 0) {
                        openDeleteDialog(uploadedFiles[0]);
                      }
                    }}
                  >
                    Delete Files
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {selectedTab === 2 && (
        <Grid container spacing={3}>
          {departments.map((dept) => (
            <Grid item xs={12} sm={6} md={4} key={dept.code}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar
                      sx={{
                        bgcolor: `primary.main`,
                        mr: 2
                      }}
                    >
                      {dept.code.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{dept.code}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {dept.name}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="primary">
                          {departmentStats[dept.code]?.count || 0}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Schedules
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="secondary">
                          {departmentStats[dept.code]?.files || 0}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Files
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Box mt={3}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<CloudUpload />}
                      onClick={() => {
                        setSelectedDepartment(dept.code);
                        setSelectedTab(0);
                      }}
                    >
                      Upload for {dept.code}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Validation Dialog */}
      <Dialog open={validationDialog} onClose={() => setValidationDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Warning color="warning" />
            CSV Validation Results
          </Box>
        </DialogTitle>
        <DialogContent>
          {validationResults && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Validation Summary
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: validationResults.errors.length > 0 ? '#ffe6e6' : '#e6ffe6' }}>
                    <Typography variant="h4">{validationResults.errors.length}</Typography>
                    <Typography variant="caption">Errors</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: validationResults.warnings.length > 0 ? '#fff4e6' : '#f5f5f5' }}>
                    <Typography variant="h4">{validationResults.warnings.length}</Typography>
                    <Typography variant="caption">Warnings</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f4fc' }}>
                    <Typography variant="h4">{validationResults.validRows.length}</Typography>
                    <Typography variant="caption">Valid Rows</Typography>
                  </Paper>
                </Grid>
              </Grid>

              {validationResults.errors.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom color="error">
                    ❌ Errors that will prevent upload:
                  </Typography>
                  <Box sx={{ maxHeight: 150, overflowY: 'auto', p: 1, bgcolor: '#ffe6e6', borderRadius: 1 }}>
                    {validationResults.errors.slice(0, 5).map((error, i) => (
                      <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>
                        • {error}
                      </Typography>
                    ))}
                    {validationResults.errors.length > 5 && (
                      <Typography variant="caption">
                        ...and {validationResults.errors.length - 5} more errors
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}

              {validationResults.warnings.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom color="warning.main">
                    ⚠️ Warnings (can be ignored):
                  </Typography>
                  <Box sx={{ maxHeight: 150, overflowY: 'auto', p: 1, bgcolor: '#fff4e6', borderRadius: 1 }}>
                    {validationResults.warnings.slice(0, 5).map((warning, i) => (
                      <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>
                        • {warning}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}

              {validationResults.roomConflicts.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    🕒 Room Schedule Conflicts:
                  </Typography>
                  <Box sx={{ maxHeight: 150, overflowY: 'auto', p: 1, bgcolor: '#f0f7ff', borderRadius: 1 }}>
                    {validationResults.roomConflicts.slice(0, 3).map((conflict, i) => (
                      <Typography key={i} variant="body2" sx={{ mb: 1 }}>
                        • Row {conflict.row}: Room {conflict.room} already booked for {conflict.conflictWith} ({conflict.conflictPeriod})
                      </Typography>
                    ))}
                    {validationResults.roomConflicts.length > 3 && (
                      <Typography variant="caption">
                        ...and {validationResults.roomConflicts.length - 3} more conflicts
                      </Typography>
                    )}
                  </Box>
                  
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Conflict Resolution</InputLabel>
                    <Select
                      value={conflictResolution}
                      label="Conflict Resolution"
                      onChange={(e) => setConflictResolution(e.target.value)}
                    >
                      <MenuItem value="skip">Skip conflicting rows</MenuItem>
                      <MenuItem value="override">Override existing schedules</MenuItem>
                      <MenuItem value="manual">Manual review needed</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}

              <FormControlLabel
                control={
                  <Checkbox
                    checked={autoFixErrors}
                    onChange={(e) => setAutoFixErrors(e.target.checked)}
                  />
                }
                label="Automatically fix minor errors (capitalization, formatting)"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setValidationDialog(false)} color="error">
            Cancel Upload
          </Button>
          <Button 
            variant="contained" 
            onClick={handleProceedWithUpload}
            disabled={validationResults?.errors.length > 0}
          >
            Proceed with Upload ({validationResults?.validRows.length || 0} rows)
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Delete color="error" />
            Delete Timetable File
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            This action cannot be undone. The file record will be permanently deleted.
          </Alert>
          
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete:
          </Typography>
          <Typography variant="h6" color="error" gutterBottom>
            {fileToDelete?.filename}
          </Typography>
          
          <Box sx={{ my: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Department:</strong> {fileToDelete?.department}
            </Typography>
            <Typography variant="body2">
              <strong>Upload Date:</strong> {fileToDelete?.upload_date ? formatDate(fileToDelete.upload_date) : 'N/A'}
            </Typography>
            <Typography variant="body2">
              <strong>Schedules:</strong> {fileToDelete?.schedules_count || 0} entries
            </Typography>
          </Box>
          
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Type the filename below to confirm deletion:
          </Typography>
          
          <TextField
            autoFocus
            fullWidth
            placeholder={`Type "${fileToDelete?.filename}" to confirm`}
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            error={deleteConfirmation !== '' && deleteConfirmation !== fileToDelete?.filename}
            helperText={deleteConfirmation !== '' && deleteConfirmation !== fileToDelete?.filename ? "Filename does not match" : ""}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteFile}
            disabled={!fileToDelete || deleteConfirmation !== fileToDelete.filename || deleteLoading}
            startIcon={<Delete />}
          >
            {deleteLoading ? 'Deleting...' : 'Delete File'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataImport;