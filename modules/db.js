// /modules/db.js (CommonJS)

const sql = require('mssql');
require('dotenv').config();

const { DB_USER, DB_PASSWORD, DB_SERVER, DB_DATABASE } = process.env;

if (!DB_USER || !DB_PASSWORD || !DB_SERVER || !DB_DATABASE) {
  throw new Error('Database environment variables are not fully set');
}

const DB_CONFIG = {
  user: DB_USER,
  password: DB_PASSWORD,
  server: DB_SERVER,
  database: DB_DATABASE,
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
