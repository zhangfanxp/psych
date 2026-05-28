import mysql from "mysql2/promise";
import { getDatabaseConfig } from "./config";

let pool: mysql.Pool | null = null;

export function getPool() {
  if (!pool) {
    const config = getDatabaseConfig();
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: config.connectionLimit || 10,
      timezone: config.timezone || "+08:00",
      namedPlaceholders: true
    });
  }
  return pool;
}

export async function query<T extends mysql.RowDataPacket[]>(sql: string, params?: Record<string, unknown> | unknown[]) {
  const [rows] = await getPool().query<T>(sql, params as never);
  return rows;
}

export async function execute(sql: string, params?: Record<string, unknown> | unknown[]) {
  const [result] = await getPool().execute<mysql.ResultSetHeader>(sql, params as never);
  return result;
}
