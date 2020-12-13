"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Express = require('express');
const Validator_1 = require("../Validator");
const Session_1 = require("../Session");
var router = Express.Router({ caseSensitive: true });
router.baseURL = '/Ssns';
router.get('/', function (req, res) {
    var body = [], ssn;
    if (req.validator.checkAdmin(null)) {
        Session_1.Session.getAllIds().forEach((id) => {
            ssn = Session_1.Session.findById(id);
            body.push({ id: ssn.id, prsId: ssn.prsId, loginTime: ssn.loginTime });
        });
        res.json(body);
        req.cnn.release();
    }
    else {
        req.cnn.release();
    }
});
router.post('/', function (req, res) {
    var ssn;
    var cnn = req.cnn;
    cnn.chkQry('select * from Person where email = ?', [req.body.email], function (err, result) {
        if (req.validator.check(result.length && result[0].password ===
            req.body.password, Validator_1.Tags.badLogin, null, null)) {
            ssn = new Session_1.Session(result[0], res);
            res.location(router.baseURL + '/' + ssn.id).end();
        }
        cnn.release();
    });
});
router.delete('/:id', function (req, res) {
    var vld = req.validator;
    var ssn = Session_1.Session.findById(req.params.id);
    if (vld.check(Boolean(ssn), Validator_1.Tags.notFound, null, null) && vld.checkPrsOK(ssn.prsId, null)) {
        ssn.logOut();
        res.end();
    }
    req.cnn.release();
});
router.get('/:id', function (req, res) {
    var vld = req.validator;
    var ssn = Session_1.Session.findById(req.params.id);
    if ((vld.check(Boolean(ssn), Validator_1.Tags.notFound, null, null) && vld.checkPrsOK(ssn.prsId, null))
        || vld.checkAdmin(null)) {
        res.json({ id: ssn.id, prsId: ssn.prsId, loginTime: ssn.loginTime });
    }
    req.cnn.release();
});
module.exports = router;
