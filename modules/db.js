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
  await poolConnect;
  const request = pool.request();
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
}

module.exports = {
  DB_CONFIG,
  getUserPhotoFromDB,
};
