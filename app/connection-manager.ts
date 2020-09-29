import * as config from "../configs/config.json";
import mysql, { Connection, MysqlError, Pool } from "mysql";

export default class ConnectionManager {
  private static instance: ConnectionManager;
  private amrsPool: Pool;
  private kenyaemrPool: Pool;
  private constructor() {
    this.amrsPool = this.createPool(config.amrsConnection);
    this.kenyaemrPool = this.createPool(config.kenyaemrConnection);
  }
  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  createPool(conf: any): Pool {
    return mysql.createPool({
      host: conf.host,
      user: conf.user,
      password: conf.password,
      database: conf.database,
      port: conf.port,
      connectionLimit: conf.connectionLimit,
    });
  }

  async getConnectionAmrs(): Promise<Connection> {
    return this.getConnection(this.amrsPool);
  }
  async getConnectionKenyaemr(): Promise<Connection> {
    return this.getConnection(this.kenyaemrPool);
  }

  async startTransaction(connection: Connection): Promise<Connection> {
    return new Promise<Connection>((resolve, reject) => {
      console.log("Beginning transaction..");
      connection.beginTransaction((err) => {
        if (err) {
          console.error("Starting transaction failed: ", err);
          reject(err);
          return;
        }
        resolve(connection);
      });
    });
  }

  async commitTransaction(connection: Connection): Promise<Connection> {
    return new Promise<Connection>((resolve, reject) => {
      console.log("Committing transaction..");
      connection.commit((err) => {
        if (err) {
          console.error("Committing transaction failed, rolling back.. ", err);
          connection.rollback(() => {
            reject(err);
          });
          return;
        }
        resolve(connection);
      });
    });
  }

  async rollbackTransaction(connection: Connection): Promise<Connection> {
    return new Promise<Connection>((resolve, reject) => {
      console.warn("Rolling back transaction..");
      connection.rollback(() => {
        console.warn("Rolling back complete.");
        resolve(connection);
      });
    });
  }

  async queryPool(pool: Pool, query: string): Promise<any> {
    return new Promise<any>((success, error) => {
      pool.query(query, function (err: MysqlError, results: [], fields: []) {
        if (err) error(error);
        success(results);
      });
    });
  }

  async queryAmrs(query: string) {
    return await this.queryPool(this.amrsPool, query);
  }

  async queryKenyaemr(query: string) {
    return await this.queryPool(this.kenyaemrPool, query);
  }

  async closeAllConnections() {
    await this.closeAmrsPool();
    await this.closeKenyaemrPool();
  }

  async query(query: string, connection: Connection): Promise<any> {
    return new Promise((resolve, reject) => {
      connection.query(query, (error, results, fields) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });
  }

  private async getConnection(pool: Pool): Promise<Connection> {
    return new Promise<Connection>((success, error) => {
      pool.getConnection((err, conn) => {
        if (err) {
          error(err);
          return; // not connected!
        }
        success(conn);
      });
    });
  }

  private async closeAmrsPool() {
    await this.closePool(this.amrsPool);
  }

  private async closeKenyaemrPool() {
    await this.closePool(this.kenyaemrPool);
  }
  async releaseConnections(
    kenyaEmrCon: mysql.Connection,
    amrsCon: mysql.Connection
  ) {
    kenyaEmrCon.destroy();
    amrsCon.destroy();
  }
  private async closePool(pool: Pool): Promise<any> {
    return new Promise((success, error) => {
      pool.end((err) => {
        // all connections in the pool have ended
        if (err) {
          error(err);
        } else {
          success();
        }
      });
    });
  }
}
