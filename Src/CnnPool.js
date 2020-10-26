var mysql = require('mysql');

// Constructor for DB connection pool
var CnnPool = function () {
   var poolCfg = require('./connection.json');

   poolCfg.connectionLimit = CnnPool.PoolSize;
   this.pool = mysql.createPool(poolCfg);
};

// NOTE: Do *not* change this pool size.  It is required to be 1 in order
// to demonstrate you are properly freeing connections!
CnnPool.PoolSize = 1;

// The one (and probably only) CnnPool object needed for the app
CnnPool.singleton = new CnnPool();

// Conventional getConnection, drawing from the pool
CnnPool.prototype.getConnection = function (cb) {
   this.pool.getConnection(cb);
};

// Router function for use in auto-creating CnnPool for a request
CnnPool.router = function (req, res, next) {
   console.log("Getting connection");
   CnnPool.singleton.getConnection(function (err, cnn) {
      if (err)
         res.status(500).json('Failed to get connection ' + err);
      else {
         console.log("Connection acquired");
         cnn.chkQry = function (qry, prms, cb) {
            // Run real qry, checking for error
            this.query(qry, prms, function (err, res, fields) {
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

module.exports = CnnPool;
