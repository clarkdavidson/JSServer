"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CnnPool = void 0;
const mysql = __importStar(require("mysql"));
// Constructor for DB connection pool
class CnnPool {
    constructor() {
        var poolCfg = require('./connection.json');
        poolCfg.connectionLimit = CnnPool.PoolSize;
        this.pool = mysql.createPool(poolCfg);
    }
    ;
    // Conventional getConnection, drawing from the pool
    getConnection(cb) {
        this.pool.getConnection(cb);
    }
    ;
}
exports.CnnPool = CnnPool;
// NOTE: Do *not* change this pool size.  It is required to be 1 in order
// to demonstrate you are properly freeing connections!
CnnPool.PoolSize = 1;
// The one (and probably only) CnnPool object needed for the app
CnnPool.singleton = new CnnPool();
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
;
module.exports = CnnPool;
