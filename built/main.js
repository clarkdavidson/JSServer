"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const body_parser_1 = __importDefault(require("body-parser"));
const Session_1 = require("./Session");
const Validator_1 = require("./Validator");
const CnnPool_1 = require("./CnnPool");
const async_1 = __importDefault(require("async"));
var app = express_1.default();
// Static paths to be served like index.html and all client side js
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
// Partially complete handler for CORS.
app.use(function (req, res, next) {
    console.log("Handling " + req.path + '/' + req.method);
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});
// No further processing needed for options calls.
app.options("/*", function (req, res) {
    res.status(200).end();
});
// Parse all request bodies using JSON, yielding a req.body property
app.use(body_parser_1.default.json());
// No messing w/db ids
app.use(function (req, res, next) { delete req.body.id; next(); });
// Parse cookie header, and attach cookies to req as req.cookies.<cookieName>
app.use(cookie_parser_1.default());
// Set up Session on req if available
app.use(Session_1.Session.router);
// Check general login.  If OK, add Validator to |req| and continue processing,
// otherwise respond immediately with 401 and noLogin error tag.
app.use(function (req, res, next) {
    console.log(req.path);
    if (req.session || (req.method === 'POST' &&
        (req.path === '/Prss' || req.path === '/Ssns'))) {
        req.validator = new Validator_1.Validator(req, res);
        next();
    }
    else
        res.status(401).end();
});
// Add DB connection, as req.cnn, with smart chkQry method, to |req|
app.use(CnnPool_1.CnnPool.router);
// Load all subroutes
app.use('/Prss', require('./Account/Prss.js'));
app.use('/Ssns', require('./Account/Ssns.js'));
app.use('/Cnvs', require('./Conversation/Cnvs.js'));
app.use('/Msgs', require('./Conversation/Msgs.js'));
// Special debugging route for /DB DELETE.  Clears all table contents,
//resets all auto_increment keys to start at 1, and reinserts one admin user.
app.delete('/DB', function (req, res) {
    if (req.validator.checkAdmin(null)) {
        // Callbacks to clear tables
        var cbs = ["Message", "Conversation", "Person", "Likes"].map(table => function (cb) {
            req.cnn.query("delete from " + table, cb);
        });
        // Callbacks to reset increment bases
        cbs = cbs.concat(["Conversation", "Message", "Person", "Likes"].map(table => cb => {
            req.cnn.query("alter table " + table + " auto_increment = 1", cb);
        }));
        // Callback to reinsert admin user
        cbs.push(cb => {
            req.cnn.query('INSERT INTO Person (firstName, lastName, email,' +
                ' password, whenRegistered, role) VALUES ' +
                '("Joe", "Admin", "adm@11.com","password", NOW(), 1);', cb);
        });
        // Callback to clear sessions, release connection and return result
        cbs.push((cb) => {
            Session_1.Session.getAllIds().forEach((id) => {
                Session_1.Session.findById(id).logOut();
            });
            var test = Session_1.Session.getSessionsById();
            test.length = 0;
            cb();
        });
        async_1.default.series(cbs, (err) => {
            req.cnn.release();
            if (err)
                res.status(400).json(err);
            else
                res.status(200).end();
        });
    }
    else
        req.cnn.release();
});
// Anchor handler for general 404 cases.
app.use(function (req, res) {
    res.status(404);
    console.log("You r here");
    //Changed to req from res
    //res.cnn.release();
});
// Handler of last resort.  Send a 500 response with stacktrace as the body.
// Throwing Exceptions
app.use(function (err, req, res, next) {
    //res.status(500).json(err.stack);
    console.log(err.stack);
    req.cnn && req.cnn.release();
});
if (process.argv.includes('-p')) {
    app.listen(process.argv[3], function () {
        console.log('App Listening on port ' + process.argv[3]);
    });
}
else {
    app.listen(3000, function () {
        console.log('App Listening on Port 3000');
    });
}
