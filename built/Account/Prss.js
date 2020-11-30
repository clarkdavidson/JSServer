"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var Express = require('express');
const Validator_1 = require("../Validator");
const async_1 = __importDefault(require("async"));
const Session_1 = require("../Session");
var router = Express.Router({ caseSensitive: true });
router.baseURL = '/Prss';
//Remove Password from this return value!
router.get('/', function (req, res) {
    console.log("Query Email = " + req.query.email);
    console.log("Session Email = " + req.session.email);
    console.log("Is Person A Admin " + req.session.isAdmin());
    let email = req.query.email;
    console.log(req.query.email);
    console.log("First Test = " + req.session.isAdmin() && req.query.email);
    console.log("Second Test = " + !req.session.isAdmin() && req.query.email);
    var handler = function (err, prsArr, fields) {
        for (let i = 0; i < prsArr.length; i++) {
            delete prsArr[i].password;
        }
        res.json(prsArr);
        //Assuming a connection is already there
        req.cnn.release();
    };
    console.log("Value of Email : " + email);
    if (email && req.session.isAdmin()) {
        console.log('1');
        //Using Handler as a Callback
        email += "%";
        req.cnn.chkQry("select id, email from Person where email LIKE ? ", [email], handler);
    }
    else if (req.session.isAdmin() && !email) {
        console.log('2');
        req.cnn.chkQry('select id, email from Person', null, handler);
    }
    else if (!req.session.isAdmin() && (req.session.email.includes(email) || !email)) {
        console.log('3');
        req.cnn.chkQry('select id,email from Person where email = ?', [req.session.email], handler);
    }
    else if (!req.session.isAdmin() && !req.session.email.includes(email)) {
        req.cnn.chkQry('select id, email from Person where email = null', null, handler);
    }
});
router.post('/', function (req, res) {
    var vld = req.validator; // Shorthands
    var body = req.body; // Request Body
    var admin = req.session && req.session.isAdmin(); //Check for Admin
    var cnn = req.cnn; // Connection From Connection Pool
    console.log(body.firstName);
    if (admin && !body.password)
        body.password = "*"; // Blocking password
    body.whenRegistered = new Date();
    async_1.default.waterfall([
        function (cb) {
            if (vld.hasFields(body, ["email", "password", "role"], cb) &&
                vld.check(body.role !== null, Validator_1.Tags.missingField, ['role'], cb) &&
                vld.chain(body.role === 0 || admin, Validator_1.Tags.forbiddenRole, null)
                    .chain(body.termsAccepted || admin, Validator_1.Tags.noTerms, null)
                    .chain(body.password || admin, Validator_1.Tags.missingField, ['password'])
                    .chain(body.email, Validator_1.Tags.missingField, ['email'])
                    .chain(body.lastName, Validator_1.Tags.missingField, ['lastName'])
                    .chain(body.firstName && body.firstName.length <= 30, Validator_1.Tags.badValue, ['firstName'])
                    .chain(body.email !== null && body.email.length <= 150, Validator_1.Tags.badValue, ['email'])
                    .chain(body.lastName.length <= 50, Validator_1.Tags.badValue, ['lastName'])
                    .chain(body.password.length <= 50, Validator_1.Tags.badValue, ['password'])
                    .check(body.role >= 0, Validator_1.Tags.badValue, ["role"], cb)) {
                cnn.chkQry('select * from Person where email = ?', body.email, cb);
            }
        },
        function (existingPrss, fields, cb) {
            if (vld.check(!existingPrss.length, Validator_1.Tags.dupEmail, null, cb) &&
                vld.check(body.role !== null || body.role !== "", Validator_1.Tags.missingField, ["role"], cb)) {
                body.termsAccepted = body.termsAccepted && new Date();
                cnn.chkQry('insert into Person set ?', body, cb);
            }
        },
        function (result, fields, cb) {
            res.location(router.baseURL + '/' + result.insertId).end();
            cb();
        }
    ], function (err) {
        cnn.release();
    });
});
/* Fill in this version */
router.put('/:id', function (req, res) {
    var vld = req.validator;
    var body = req.body;
    var admin = req.session.isAdmin();
    var cnn = req.cnn;
    async_1.default.waterfall([
        function (cb) {
            if (vld.checkPrsOK(parseInt(req.params.id), cb) &&
                vld.chain(!("whenRegistered" in body), Validator_1.Tags.forbiddenField, ["whenRegistered"])
                    .chain(!("termsAccepted" in body), Validator_1.Tags.forbiddenField, ["termsAccepted"])
                    .chain(!("role" in body) || body.role === 0 || admin, Validator_1.Tags.badValue, ["role"])
                    .chain(!("password" in body) || (body.password !== null && body.password !== "") && body.password.length <= 50, Validator_1.Tags.badValue, ["password"])
                    .chain(admin || !body.password || body.oldPassword, Validator_1.Tags.forbiddenRole, ['role'])
                    .chain(!("lastName" in body) || body.lastName.length <= 50, Validator_1.Tags.badValue, ["lastName"])
                    .chain(!("email" in body), Validator_1.Tags.badValue, ["email"])
                    .check(!("firstName" in body) || body.firstName.length <= 30, Validator_1.Tags.badValue, ["firstName"], cb))
                cnn.chkQry('select * from Person where id = ?', [req.params.id], cb);
        },
        (prss, fields, cb) => {
            if (vld.check(Boolean(prss.length), Validator_1.Tags.notFound, null, cb) &&
                vld.check(admin || body.oldPassword === prss[0].password || !body.password, Validator_1.Tags.oldPwdMismatch, ["pwdMismatch"], cb)) {
                delete body.id;
                delete body.oldPassword;
                if (Object.keys(body).length) {
                    cnn.chkQry('update Person set ? where id = ?', [req.body, req.params.id], cb);
                }
                else {
                    console.log('try again');
                    cb(null, null, null);
                }
            }
        },
        (updateResult, fields, cb) => {
            res.status(200).end();
            cb();
        }
    ], function (err) {
        console.log('You Ended up here');
        cnn.release();
    });
});
//Remove Password from PrsArr
router.get('/:id', function (req, res) {
    var vld = req.validator;
    async_1.default.waterfall([
        function (cb) {
            if (vld.checkPrsOK(parseInt(req.params.id), cb) || vld.checkAdmin(cb))
                req.cnn.chkQry('select * from Person where id = ?', [req.params.id], cb);
        },
        function (prsArr, fields, cb) {
            if (vld.check(Boolean(prsArr.length), Validator_1.Tags.notFound, null, cb)) {
                console.log(prsArr[0].password);
                delete prsArr[0].password;
                console.log(prsArr[0].password);
                res.json(prsArr);
                cb();
            }
        }
    ], (err) => {
        req.cnn.release();
    });
});
/*
router.get('/:id', function(req, res) {
   var vld = req.validator;

   if (vld.checkPrsOK(req.params.id)) {
      req.cnn.query('select * from Person where id = ?', [req.params.id],
      function(err, prsArr) {
         if (vld.check(prsArr.length, Tags.notFound))
            res.json(prsArr);
         req.cnn.release();
      });
   }
   else {
      req.cnn.release();
   }
});
*/
//________________________________//
//  Connection Not being Released \\
router.delete('/:id', function (req, res) {
    var vld = req.validator;
    var userId = req.params.id;
    console.log(userId);
    Session_1.Session.deletedUser(userId);
    async_1.default.waterfall([
        function (cb) {
            if (vld.checkAdmin(cb)) {
                //console.log("Admin Check Cleared");
                //console.log(vld.checkAdmin());
                req.cnn.chkQry('DELETE from Person where id = ?', [req.params.id], cb);
            }
        },
        function (result, fields, cb) {
            if (vld.check(Boolean(result.affectedRows), Validator_1.Tags.notFound, null, cb)) {
                //console.log("Person Deleted");
                res.end();
                cb();
            }
        }
    ], function (err) {
        console.log('Connection Released');
        req.cnn.release();
    });
});
module.exports = router;
