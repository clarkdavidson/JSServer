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
            //console.log(ssn);
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
            //console.log(result[0]);
            res.location(router.baseURL + '/' + ssn.id).end();
        }
        cnn.release();
    });
});
//Program This
router.delete('/:id', function (req, res) {
    var vld = req.validator;
    console.log("vld set");
    console.log("Req Query ID " + req.params.id);
    //var newarray = Session.getSessionsById();
    //console.log(Session.getSessionsById());
    var ssn = Session_1.Session.findById(req.params.id);
    //console.log(ssn);
    console.log("ssn set");
    if (vld.check(Boolean(ssn), Validator_1.Tags.notFound, null, null) && vld.checkPrsOK(ssn.prsId, null)) {
        ssn.logOut();
        console.log("ssn Logout Occured");
        res.end();
    }
    req.cnn.release();
    console.log("Connection Released");
});
router.get('/:id', function (req, res) {
    var vld = req.validator;
    console.log(req.params.id);
    var ssn = Session_1.Session.findById(req.params.id);
    console.log(ssn);
    //Added check for admin. <----------------
    if ((vld.check(Boolean(ssn), Validator_1.Tags.notFound, null, null) && vld.checkPrsOK(ssn.id, null))
        || vld.checkAdmin(null)) {
        res.json({ id: ssn.id, prsId: ssn.prsId, loginTime: ssn.loginTime });
    }
    req.cnn.release();
});
module.exports = router;
