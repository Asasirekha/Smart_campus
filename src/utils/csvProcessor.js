// src/utils/csvProcessor.js
import { parse } from 'papaparse';

export const processCSVFile = async (file) => {  // Removed onProgress parameter
  return new Promise((resolve, reject) => {
    parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          reject(new Error(results.errors[0].message));
        } else {
          resolve(results.data);
        }
      },
      error: (error) => {
        reject(new Error(error.message));
      }
    });
  });
};

export const validateCSVData = (data) => {
  const requiredColumns = ['room_id', 'room_name', 'building', 'capacity', 'course', 'professor', 'day', 'period'];
  const firstRow = data[0] || {};
  const headers = Object.keys(firstRow);
  
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }
  
  return true;
};

export const prepareRoomData = (csvData) => {
  const roomMap = new Map();
  
  csvData.forEach((row) => {  // Removed index parameter
    const roomKey = `${row.room_id}_${row.building}`;
    if (!roomMap.has(roomKey)) {
      roomMap.set(roomKey, {
        id: row.room_id,
        name: row.room_name || `Room ${row.room_id}`,
        building: row.building || 'Main Building',
        capacity: parseInt(row.capacity) || 30,
        type: row.type || 'classroom',
        status: 'free',
        features: row.features ? 
          row.features.split(',').map(f => f.trim()).filter(f => f) : [],
        createdAt: new Date().toISOString()
      });
    }
  });
  
  return Array.from(roomMap.values());
};

export const prepareScheduleData = (csvData) => {
  return csvData.map(row => ({
    roomId: row.room_id,
    course: row.course,
    professor: row.professor || 'Staff',
    day: row.day,
    period: row.period,
    department: row.department || 'CSE',
    year: row.year || '3',
    section: row.section || 'A',
    isActive: true,
    createdAt: new Date().toISOString()
  }));
};