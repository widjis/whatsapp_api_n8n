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

let pool = new sql.ConnectionPool(DB_CONFIG);
let poolConnect = null;

// Function to initialize or reinitialize the connection pool
async function initializePool() {
  try {
    if (pool && pool.connected) {
      return pool;
    }
    
    // Close existing pool if it exists but is not connected
    if (pool && !pool.connected) {
      try {
        await pool.close();
      } catch (closeErr) {
        console.warn('Warning closing existing pool:', closeErr.message);
      }
    }
    
    // Create new pool
    pool = new sql.ConnectionPool(DB_CONFIG);
    await pool.connect();
    console.log('✔️ DB pool connected');
    return pool;
  } catch (err) {
    console.error('❌ DB pool connection failed:', err.message);
    throw err;
  }
}

// Initialize pool on module load
poolConnect = initializePool().catch(err => {
  console.error('❌ Initial DB pool connection failed:', err.message);
});

async function getUserPhotoFromDB(staffNo) {
  try {
    // Ensure we have a valid connection
    const activePool = await initializePool();
    
    const request = activePool.request();
    request.input('staffNo', sql.NVarChar, staffNo);

    const result = await request.query(`
      SELECT PHOTO
      FROM CardDB
      WHERE StaffNo = @staffNo
        AND Del_State = 'False'
    `);

    if (!result.recordset.length || !result.recordset[0].PHOTO) {
      return null;
    }
    return result.recordset[0].PHOTO;
  } catch (err) {
    // If connection is closed, try to reconnect once
    if (err.message && err.message.includes('Connection is closed')) {
      console.log('DB connection closed, attempting to reconnect...');
      try {
        const activePool = await initializePool();
        const request = activePool.request();
        request.input('staffNo', sql.NVarChar, staffNo);

        const result = await request.query(`
          SELECT PHOTO
          FROM CardDB
          WHERE StaffNo = @staffNo
            AND Del_State = 'False'
        `);

        if (!result.recordset.length || !result.recordset[0].PHOTO) {
          return null;
        }
        return result.recordset[0].PHOTO;
      } catch (retryErr) {
        console.error('DB reconnection failed:', retryErr.message);
        throw retryErr;
      }
    }
    throw err;
  }
}

module.exports = {
  DB_CONFIG,
  getUserPhotoFromDB,
  initializePool,
};
