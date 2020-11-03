"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const async_1 = require("async");
const Validator_1 = require("../Validator");
exports.router = express_1.Router({ caseSensitive: true });
const Tags = Validator_1.Validator.Tags;
const baseURL = '/Cnvs';
const kMaxTitle = 80;
const kShortContent = 80;
const kMaxContent = 5000;
;
exports.router.get('/', function (req, res) {
    req.cnn.chkQry('select id, title, ownerId from Conversation', null, function (err, cnvs) {
        if (!err) {
            res.json(cnvs);
        }
        req.cnn.release();
    });
});
exports.router.post('/', function (req, res) {
    let vld = req.validator;
    let body = req.body;
    let cnn = req.cnn;
    async_1.waterfall([
        function (cb) {
            cnn.chkQry('select * from Conversation where title = ?', body.title, cb);
        },
        function (existingCnv, fields, cb) {
            if (vld.check(!existingCnv.length, Tags.dupTitle, null, cb))
                cnn.chkQry("insert into Conversation set ?", body, cb);
        },
        function (insRes, fields, cb) {
            res.location(baseURL + '/' + insRes.insertId).end();
        }
    ], function () {
        cnn.release();
    });
});
exports.router.delete('/:cnvId', function (req, res) {
    let vld = req.validator;
    let cnvId = req.params.cnvId;
    let cnn = req.cnn;
    async_1.waterfall([
        function (cb) {
            cnn.chkQry('select * from Conversation where id = ?', [cnvId], cb);
        },
        function (cnvs, fields, cb) {
            if (vld.check(cnvs.length > 0, Tags.notFound, null, cb) &&
                vld.checkPrsOK(cnvs[0].ownerId, cb))
                cnn.chkQry('delete from Conversation where id = ?', [cnvId], cb);
        }
    ], function (err) {
        if (!err)
            res.status(200);
        cnn.release();
    });
});
