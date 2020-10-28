var Express = require('express');
var Tags = require('../Validator.js').Tags;
var { Session, router } = require('../Session.js');
var router = Express.Router({ caseSensitive: true });
var async = require('async');

router.baseURL = '/Msgs';

router.get('/:msgId', function (req, res) {
    var vld = req.validator;
    var msgId = req.params.msgId;
    var cnn = req.cnn;

    var handler = function (err, prsArr, fields) {
        if (!err) {
            for (i = 0; i < prsArr.length; i++) {
                prss[i].whenMade = prsArr[i].whenMade.getTime();
            }
            res.json(prsArr);
            req.cnn.release();
        } else {
            console.log(err.stack);
            req.cnn.release()
        }
    };
    //Most Likely have to do a left join...
    //
    cnn.chkQuery("SELECT * from Message", null, handler);
});

router.post('/:msgId/Likes', function (req, res) {
    var vld = req.validator;
    var msgId = req.params.msgId;
    var cnn = req.cnn;

    async.waterfall([
        function (cb) {
            cnn.chkQuery('select * from Message where id = ?', [msgId], cb);
        },
        function (existingMsg, fields, cb) {
            if (vld.check(existingMsg.length, Tags.notFound, null, cb))
                cnn.chkQuery('insert into Message set numLikes = numLikes + 1 Where id = ?'[msgId], cb);
        },
        function (result, field, cb) {
            res.location(router.baseURL + '/' + result.insertId).end();
        }],
        function (err) {
            cnn.release();
        })
});

modele.exports = router;
