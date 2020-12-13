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
    let email = req.query.email;
    var handler = function (err, prsArr, fields) {
        for (let i = 0; i < prsArr.length; i++) {
            delete prsArr[i].password;
        }
        res.json(prsArr);
        req.cnn.release();
    };
    if (email && req.session.isAdmin()) {
        email += "%";
        req.cnn.chkQry("select id, email from Person where email LIKE ? ", [email], handler);
    }
    else if (req.session.isAdmin() && !email) {
        req.cnn.chkQry('select id, email from Person', null, handler);
    }
    else if (!req.session.isAdmin() && (req.session.email.includes(email) || !email)) {
        req.cnn.chkQry('select id,email from Person where email = ?', [req.session.email], handler);
    }
    else if (!req.session.isAdmin() && !req.session.email.includes(email)) {
        req.cnn.chkQry('select id, email from Person where email = null', null, handler);
    }
});
router.post('/', function (req, res) {
    var vld = req.validator;
    var body = req.body;
    var admin = req.session && req.session.isAdmin();
    var cnn = req.cnn;
    if (admin && !body.password)
        body.password = "*";
    if (!body.firstName)
        body.firstName = "";
    async_1.default.waterfall([
        function (cb) {
            if (vld.hasFields(body, ["email", "password", "role", "lastName"], cb) &&
                vld.checkFields(body, ["email", "firstName", "lastName", "password", "role", "termsAccepted"], cb) &&
                vld.chain(body.role === 0 || admin, Validator_1.Tags.forbiddenRole, null)
                    .chain((body.termsAccepted && body.termsAccepted === true) || admin, Validator_1.Tags.noTerms, null)
                    .chain(body.password || admin, Validator_1.Tags.missingField, ['password'])
                    .chain(body.email, Validator_1.Tags.missingField, ['email'])
                    .chain(body.firstName.length <= 30, Validator_1.Tags.badValue, ['firstName'])
                    .chain(body.email.length <= 150, Validator_1.Tags.badValue, ['email'])
                    .chain(body.lastName.length <= 50, Validator_1.Tags.badValue, ['lastName'])
                    .chain(body.password.length <= 50, Validator_1.Tags.badValue, ['password'])
                    .check(body.role >= 0, Validator_1.Tags.badValue, ["role"], cb)) {
                cnn.chkQry('select * from Person where email = ?', body.email, cb);
            }
        },
        function (existingPrss, fields, cb) {
            if (vld.check(!existingPrss.length, Validator_1.Tags.dupEmail, null, cb)) {
                body.whenRegistered = new Date();
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
router.put('/:id', function (req, res) {
    var vld = req.validator;
    var body = req.body;
    var admin = req.session.isAdmin();
    var cnn = req.cnn;
    async_1.default.waterfall([
        function (cb) {
            if (vld.checkPrsOK(parseInt(req.params.id), cb) &&
                vld.checkFields(body, ["firstName", "lastName", "password", "role", "oldPassword"], cb) &&
                vld.chain(!("whenRegistered" in body), Validator_1.Tags.forbiddenField, ["whenRegistered"])
                    .chain(!("termsAccepted" in body), Validator_1.Tags.forbiddenField, ["termsAccepted"])
                    .chain((!("role" in body) || body.role === 0) || admin, Validator_1.Tags.badValue, ["role"])
                    .chain(!("password" in body) || (body.password !== null && body.password !== undefined &&
                    body.password !== "") && body.password.length <= 50, Validator_1.Tags.badValue, ["password"])
                    .chain(!("lastName" in body) || (body.lastName !== null && body.lastName !== undefined &&
                    body.lastName !== "") && body.lastName.length <= 50, Validator_1.Tags.badValue, ["lastName"])
                    .chain(!("email" in body), Validator_1.Tags.badValue, ["email"])
                    .check(!("firstName" in body) || (body.firstName !== null && body.firstName !== undefined)
                    && body.firstName.length <= 30, Validator_1.Tags.badValue, ["firstName"], cb))
                cnn.chkQry('select * from Person where id = ?', [req.params.id], cb);
        },
        (prss, fields, cb) => {
            if (vld.check(Boolean(prss.length), Validator_1.Tags.notFound, null, cb) &&
                vld.check((body.password && body.oldPassword) || !body.password || admin, Validator_1.Tags.noOldPwd, null, cb) &&
                vld.check(admin || body.oldPassword === prss[0].password || !body.password, Validator_1.Tags.oldPwdMismatch, ["pwdMismatch"], cb)) {
                delete body.id;
                delete body.oldPassword;
                if (Object.keys(body).length) {
                    cnn.chkQry('update Person set ? where id = ?', [req.body, req.params.id], cb);
                }
                else {
                    cb(null, null, null);
                }
            }
        },
        (updateResult, fields, cb) => {
            res.status(200).end();
            cb();
        }
    ], function (err) {
        cnn.release();
    });
});
router.get('/:id', function (req, res) {
    var vld = req.validator;
    async_1.default.waterfall([
        function (cb) {
            if (vld.checkPrsOK(parseInt(req.params.id), cb) || vld.checkAdmin(cb))
                req.cnn.chkQry('select * from Person where id = ?', [req.params.id], cb);
        },
        function (prsArr, fields, cb) {
            if (vld.check(Boolean(prsArr.length), Validator_1.Tags.notFound, null, cb)) {
                delete prsArr[0].password;
                res.json(prsArr);
                cb();
            }
        }
    ], (err) => {
        req.cnn.release();
    });
});
router.delete('/:id', function (req, res) {
    var vld = req.validator;
    var userId = req.params.id;
    async_1.default.waterfall([
        function (cb) {
            if (vld.checkAdmin(cb)) {
                Session_1.Session.deletedUser(userId);
                req.cnn.chkQry('Select * from Person where id = ?', [req.params.id], cb);
            }
        },
        function (result, fields, cb) {
            if (vld.check(result.length, Validator_1.Tags.notFound, null, cb)) {
                req.cnn.chkQry(' Update Message set numLikes = numLikes - 1 where id IN(Select msgId from Likes where prsId = ?);', [req.params.id], cb);
            }
        },
        function (result, fields, cb) {
            req.cnn.chkQry('Delete from Person where id = ?', [req.params.id], cb);
            res.end();
        }
    ], function (err) {
        req.cnn.release();
    });
});
module.exports = router;
