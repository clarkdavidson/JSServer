import * as mysql from 'mysql';
import { Request, Response } from 'express'

// Constructor for DB connection pool
export class CnnPool {

   // NOTE: Do *not* change this pool size.  It is required to be 1 in order
   // to demonstrate you are properly freeing connections!
   private static PoolSize: number = 1;
   private pool: mysql.Pool
   
   // The one (and probably only) CnnPool object needed for the app
   private static singleton:CnnPool = new CnnPool();;

   constructor() {
      var poolCfg = require('./connection.json');
      poolCfg.connectionLimit = CnnPool.PoolSize;
      this.pool = mysql.createPool(poolCfg);

   }

   // Conventional getConnection, drawing from the pool
   getConnection(cb : (err: mysql.MysqlError, connection: mysql.PoolConnection) => void) {
      this.pool.getConnection(cb);
   };

   // Router function for use in auto-creating CnnPool for a request
   static router = function (req: Request, res: Response, next: Function) {
      console.log("Getting connection");
      CnnPool.singleton.getConnection(function (err: Error, cnn: mysql.PoolConnection) {
         if (err)
            res.status(500).json('Failed to get connection ' + err);
         else {
            console.log("Connection acquired");
            cnn.chkQry = function (qry: string, prms: [], cb: Function) {
               // Run real qry, checking for error
               this.query(qry, prms, function (err: Error, res: Response, fields: any) {
                  if (err) {
                     console.log(err.stack);
                     res.status(500).json('Failed query ' + qry);

                  }

                  cb(err, res, fields);
               });
            };
            req.cnn = cnn;
            next();
            // console.log('cnn pool next called');
         }
      });
   };

};
module.exports = CnnPool;
