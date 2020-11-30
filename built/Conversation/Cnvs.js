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
// Need to add ownerID search functionality
// Return Values ??
router.get('/', function (req, res) {
    let owner = req.query.owner;
    console.log(owner);
    if (owner) {
        req.cnn.chkQry('select * from Conversation where ownerId = ?', [owner], function (err, cnvs) {
            if (!err)
                res.json(cnvs);
            req.cnn.release();
        });
    }
    else {
        req.cnn.chkQry('select * from Conversation', null, function (err, cnvs) {
            if (!err)
                console.log("Hitting Here");
            res.json(cnvs);
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
    console.log(owner.prsId);
    console.log(body.title);
    console.log(body.title.length <= 80);
    async_1.default.waterfall([
        function (cb) {
            if (vld.check((body.title.length <= 80), Validator_1.Tags.badValue, ["title"], cb) &&
                vld.check((body.title !== "" && body.title !== null), Validator_1.Tags.missingField, ["title"], cb))
                cnn.chkQry('select * from Conversation where title = ?', body.title, cb);
        },
        function (existingCnv, fields, cb) {
            console.log(existingCnv[0]);
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
    console.log(owner.prsId);
    async_1.default.waterfall([
        function (cb) {
            //console.log(ssn.prsId);
            if (vld.check(body.title.length <= 80, Validator_1.Tags.badValue, ["title"], cb))
                cnn.chkQry('select * from Conversation where id = ?', [cnvId], cb);
        },
        function (cnvs, fields, cb) {
            //console.log(cnvs[0]);
            //console.log("Convo Length = " + cnvs.length);
            //console.log("Is Person Okay " + vld.checkPrsOK(cnvs[0].ownerId));
            if (vld.checkPrsOK(cnvs[0].ownerId, cb) &&
                vld.check(Boolean(cnvs.length), Validator_1.Tags.notFound, null, cb))
                cnn.chkQry('select * from Conversation where title = ?', [body.title], cb);
        },
        function (sameTtl, fields, cb) {
            // console.log("sameTtl.legth = " + sameTtl.length);
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
    console.log(cnvId);
    console.log("YOU ARE IN A GET");
    async_1.default.waterfall([
        function (cb) {
            cnn.chkQry('Select * from Conversation where id = ?', [cnvId], cb);
        },
        function (exisitingCnv, fields, cb) {
            if (vld.check(Boolean(exisitingCnv.length), Validator_1.Tags.notFound, null, cb)) {
                if (num) {
                    cnn.chkQry(' Select M.id, P.email, M.content, M.whenMade, M.numLikes From Message M Inner Join Person P ON M.prsId = P.id where M.cnvId = ? ORDER BY M.whenMade LIMIT ?', [cnvId, parseInt(num)], cb);
                }
                else if (dateTime) {
                    cnn.chkQry('select M.id, P.email, M.content, M.whenMade, M.numLikes From Message M Inner Join Person P ON M.prsId = P.id where whenMade >=  ? ORDER BY M.whenMade', [checkDate], cb);
                }
            }
        }
    ], function (err, result) {
        if (!err) {
            res.json(result);
        }
        cnn.release();
    });
    // var handler = function (err, prsArr, fields) {
    //    res.json(prsArr);
    //    req.cnn.release();
    // };
    // if (num) {
    //    console.log("Made It Here");
    //    cnn.chkQry(' Select M.id, P.email, M.content, M.whenMade, M.numLikes From Message M Inner Join Person P ON M.prsId = P.id where cnvId = ? LIMIT ?'
    //       , [cnvId, parseInt(num)], handler)
    // } else if (dateTime) {
    //    console.log("Made it here 2");
    //    cnn.chkQry('select M.id, P.email, M.content, M.whenMade, M.numLikes From Message M Inner Join Person P ON M.prsId = P.id where whenMade >=  ? ', [checkDate], handler)
    // }
});
router.post('/:cnvId/Msgs', function (req, res) {
    var vld = req.validator;
    var cnvId = req.params.cnvId;
    var cnn = req.cnn;
    var body = req.body;
    var time = new Date();
    console.log("YOU ARE IN A POST");
    var array = Session_1.Session.getSessionsById();
    var owner = array[array.length - 1];
    async_1.default.waterfall([
        function (cb) {
            if (vld.check(body.content.length <= 5000, Validator_1.Tags.badValue, ["content"], cb))
                cnn.chkQry('insert into Message set cnvId = ?, prsId = ?, whenMade = ? , content = ?, numLikes = 0', [cnvId, owner.prsId, time, body.content], cb);
        },
        function (result, field, cb) {
            res.location(router.baseURL + '/' + result.insertId).end();
            cb(null);
        }
    ], function (err) {
        cnn.release();
    });
});
module.exports = router;
