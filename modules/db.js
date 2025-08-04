// /modules/db.js (CommonJS)

const sql = require('mssql');
require('dotenv').config();

const DB_CONFIG = {
  user: process.env.DB_USER || 'vault',
  password: process.env.DB_PASSWORD || 'Bl4ck3y34dm!n',
  server: process.env.DB_SERVER || '10.60.10.47',
  database: process.env.DB_DATABASE || 'DataDBEnt',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const pool = new sql.ConnectionPool(DB_CONFIG);
const poolConnect = pool.connect()
  .then(() => console.log('✔️ DB pool connected'))
  .catch(err => console.error('❌ DB pool connection failed:', err));

async function getUserPhotoFromDB(staffNo) {
  console.log(`🔍 [DB] Searching for photo with StaffNo: ${staffNo}`);
  
  try {
    await poolConnect;
    const request = pool.request();
    request.input('staffNo', sql.NVarChar, staffNo);

    const result = await request.query(`
      SELECT PHOTO, StaffNo, Del_State
      FROM CardDB
      WHERE StaffNo = @staffNo
        AND Del_State = 'False'
    `);

    console.log(`📊 [DB] Query result: ${result.recordset.length} records found`);
    
    if (!result.recordset.length) {
      console.log(`❌ [DB] No records found for StaffNo: ${staffNo}`);
      
      // Check if record exists but with different Del_State
      const checkRequest = pool.request();
      checkRequest.input('staffNo', sql.NVarChar, staffNo);
      const checkResult = await checkRequest.query(`
        SELECT StaffNo, Del_State
        FROM CardDB
        WHERE StaffNo = @staffNo
      `);
      
      if (checkResult.recordset.length > 0) {
        console.log(`⚠️ [DB] Record exists but Del_State is: ${checkResult.recordset[0].Del_State}`);
      } else {
        console.log(`❌ [DB] No record exists at all for StaffNo: ${staffNo}`);
      }
      
      return null;
    }

    const record = result.recordset[0];
    console.log(`📋 [DB] Record found - StaffNo: ${record.StaffNo}, Del_State: ${record.Del_State}`);
    
    if (!record.PHOTO) {
      console.log(`📷 [DB] Record found but PHOTO field is null/empty for StaffNo: ${staffNo}`);
      return null;
    }
    
    const photoSize = record.PHOTO ? record.PHOTO.length : 0;
    console.log(`✅ [DB] Photo found for StaffNo: ${staffNo}, size: ${photoSize} bytes`);
    
    return record.PHOTO;
    
  } catch (error) {
    console.error(`❌ [DB] Error retrieving photo for StaffNo ${staffNo}:`, error.message);
    console.error(`❌ [DB] Error stack:`, error.stack);
    throw error;
  }
}

// Helper function to validate photo data
function validatePhotoData(photoBuffer) {
  if (!photoBuffer) {
    return { valid: false, reason: 'Photo buffer is null or undefined' };
  }
  
  if (photoBuffer.length === 0) {
    return { valid: false, reason: 'Photo buffer is empty (0 bytes)' };
  }
  
  if (photoBuffer.length < 100) {
    return { valid: false, reason: `Photo buffer too small (${photoBuffer.length} bytes)` };
  }
  
  // Check for common image file signatures
  const firstBytes = photoBuffer.slice(0, 10);
  const isJPEG = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8;
  const isPNG = firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47;
  const isBMP = firstBytes[0] === 0x42 && firstBytes[1] === 0x4D;
  const isGIF = firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46;
  
  if (!isJPEG && !isPNG && !isBMP && !isGIF) {
    const hexStart = firstBytes.toString('hex').toUpperCase();
    return { valid: false, reason: `Unknown image format (starts with: ${hexStart})` };
  }
  
  const format = isJPEG ? 'JPEG' : isPNG ? 'PNG' : isBMP ? 'BMP' : 'GIF';
  return { valid: true, format, size: photoBuffer.length };
}

module.exports = {
  DB_CONFIG,
  getUserPhotoFromDB,
  validatePhotoData,
};
