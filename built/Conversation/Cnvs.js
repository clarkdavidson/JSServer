"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var Express = require('express');
const Validator_1 = require("../Validator");
const Session_1 = require("../Session");
var router = Express.Router({ caseSensitive: true });
const async_1 = __importDefault(require("async"));
router.baseURL = '/Cnvs';
router.get('/', function (req, res) {
    let owner = req.query.owner;
    if (owner) {
        req.cnn.chkQry('select * from Conversation where ownerId = ?', [owner], function (err, cnvs) {
            if (!err)
                res.json(cnvs);
            req.cnn.release();
        });
    }
    else {
        req.cnn.chkQry('select * from Conversation', null, function (err, cnvs) {
            if (!err) {
                for (var i = 0; i < cnvs.length; i++) {
                    cnvs[i].lastMessage = Date.parse(cnvs[i].lastMessage);
                }
                res.json(cnvs);
            }
            req.cnn.release();
        });
    }
});
router.post('/', function (req, res) {
    var vld = req.validator;
    var body = req.body;
    var cnn = req.cnn;
    var array = Session_1.Session.getSessionsById();
    var owner = array[array.length - 1];
    async_1.default.waterfall([
        function (cb) {
            if (vld.hasFields(body, ["title"], cb) &&
                vld.check((body.title.length <= 80), Validator_1.Tags.badValue, ["title"], cb))
                cnn.chkQry('select * from Conversation where title = ?', body.title, cb);
        },
        function (existingCnv, fields, cb) {
            if (vld.check(!existingCnv.length, Validator_1.Tags.dupTitle, null, cb))
                cnn.chkQry("insert into Conversation set title = ?, ownerId = ? ", [body.title, owner.prsId], cb);
        },
        function (insRes, fields, cb) {
            res.location(router.baseURL + '/' + insRes.insertId).end();
            cb();
        }
    ], function (err) {
        cnn.release();
    });
});
router.put('/:cnvId', function (req, res) {
    var vld = req.validator;
    var body = req.body;
    var cnn = req.cnn;
    var cnvId = req.params.cnvId;
    var array = Session_1.Session.getSessionsById();
    var owner = array[array.length - 1];
    async_1.default.waterfall([
        function (cb) {
            if (vld.hasFields(body, ["title"], cb) &&
                vld.check(body.title.length <= 80, Validator_1.Tags.badValue, ["title"], cb))
                cnn.chkQry('select * from Conversation where id = ?', [cnvId], cb);
        },
        function (cnvs, fields, cb) {
            if (vld.checkPrsOK(cnvs[0].ownerId, cb) &&
                vld.check(Boolean(cnvs.length), Validator_1.Tags.notFound, null, cb))
                cnn.chkQry('select * from Conversation where title = ?', [body.title], cb);
        },
        function (sameTtl, fields, cb) {
            if (vld.check(!(sameTtl.length) || ((sameTtl[0].id === parseInt(cnvId)) && (owner.prsId === sameTtl[0].ownerId)), Validator_1.Tags.dupTitle, null, cb)) {
                cnn.chkQry("update Conversation set title = ? where id = ?", [body.title, cnvId], cb);
                res.status(200).end();
            }
        }
    ], function (err) {
        cnn.release();
    });
});
router.delete('/:cnvId', function (req, res) {
    var vld = req.validator;
    var cnvId = req.params.cnvId;
    var cnn = req.cnn;
    async_1.default.waterfall([
        function (cb) {
            cnn.chkQry('select * from Conversation where id = ?', [cnvId], cb);
        },
        function (cnvs, fields, cb) {
            if (vld.check(Boolean(cnvs.length), Validator_1.Tags.notFound, null, cb) &&
                vld.checkPrsOK(cnvs[0].ownerId, cb))
                cnn.chkQry('delete from Conversation where id = ?', [cnvId], cb);
            res.status(200).end();
        }
    ], function (err) {
        cnn.release();
    });
});
router.get('/:cnvId', function (req, res) {
    var vld = req.validator;
    var cnvId = req.params.cnvId;
    var cnn = req.cnn;
    async_1.default.waterfall([
        function (cb) {
            cnn.chkQry('select * from Conversation where id = ?', [cnvId], cb);
        },
        function (cnvs, fields, cb) {
            if (vld.check(Boolean(cnvs.length), Validator_1.Tags.notFound, null, cb))
                res.json(cnvs[0]);
            cb(null);
        }
    ], function (err) {
        cnn.release();
    });
});
router.get('/:cnvId/Msgs', function (req, res) {
    var vld = req.validator;
    var cnvId = req.params.cnvId;
    var cnn = req.cnn;
    var dateTime = parseInt(req.query.dateTime);
    var checkDate = new Date(dateTime);
    var num = req.query.num || null;
    async_1.default.waterfall([
        function (cb) {
            cnn.chkQry('Select * from Conversation where id = ?', [cnvId], cb);
        },
        function (exisitingCnv, fields, cb) {
            if (vld.check(Boolean(exisitingCnv.length), Validator_1.Tags.notFound, null, cb)) {
                if (num) {
                    cnn.chkQry('Select M.id, P.email, M.content, M.whenMade, M.numLikes From Message M Inner Join Person P ON M.prsId = P.id where M.cnvId = ? ORDER BY M.whenMade, P.id LIMIT ?', [cnvId, parseInt(num)], cb);
                }
                else if (dateTime) {
                    cnn.chkQry('select M.id, P.email, M.content, M.whenMade, M.numLikes From Message M Inner Join Person P ON M.prsId = P.id where whenMade >=  ? ORDER BY M.whenMade, P.id', [checkDate], cb);
                }
                else {
                    cnn.chkQry(' Select M.id, P.email, M.content, M.whenMade, M.numLikes From Message M Inner Join Person P ON M.prsId = P.id where M.cnvId = ? ORDER BY M.whenMade, P.id ', [cnvId], cb);
                }
            }
        }
    ], function (err, result) {
        if (!err) {
            for (var i = 0; i < result.length; i++) {
                result[i].whenMade = Date.parse(result[i].whenMade);
            }
            res.json(result);
        }
        cnn.release();
    });
});
router.post('/:cnvId/Msgs', function (req, res) {
    var vld = req.validator;
    var cnvId = req.params.cnvId;
    var cnn = req.cnn;
    var body = req.body;
    var time = new Date();
    var array = Session_1.Session.getSessionsById();
    var owner = array[array.length - 1];
    async_1.default.waterfall([
        function (cb) {
            if (vld.hasFields(body, ["content"], cb)
                && vld.check(body.content.length <= 5000, Validator_1.Tags.badValue, ["content"], cb)) {
                cnn.chkQry('insert into Message set cnvId = ?, prsId = ?, whenMade = ? , content = ?, numLikes = 0', [cnvId, owner.prsId, time, body.content], cb);
            }
        },
        function (result, field, cb) {
            res.location(router.baseURL + '/' + result.insertId).end();
            cnn.chkQry('update Conversation set lastMessage = ? where id = ?', [time, cnvId], cb);
        }
    ], function (err) {
        cnn.release();
    });
});
module.exports = router;
