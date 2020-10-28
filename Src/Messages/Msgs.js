var Express = require('express');
var Tags = require('../Validator.js').Tags;
var { Session, router } = require('../Session.js');
var router = Express.Router({ caseSensitive: true });
var async = require('async');
var mysql = require('mysql');

router.baseURL = '/Msgs';

router.get('/:msgId', function (req, res) {
    var vld = req.validator;
    var msgId = req.params.msgId;
    var cnn = req.cnn;

    async.waterfall([
        function (cb) {
            cnn.chkQry(" Select M.whenMade,P.email,M.content From Message M Inner Join Person P ON M.prsId = P.Id where M.id = ?;", [msgId], cb);
            console.log('Sql Statment Done');
        },
        function (msgArr, fields, cb) {
            if (vld.check(msgArr.length, Tags.notFound, null, cb)) {
                console.log(JSON.stringify(msgArr));
                msgArr[0].whenMade = msgArr[0].whenMade.getTime();
                console.log(msgArr);

                res.json(msgArr[0]).end();
            }
            cb();
        }],
        function (err) {
            console.log("Connection Is Released");
            req.cnn.release();
        }); 
});

router.post('/:msgId/Likes', function (req, res) {
    var vld = req.validator;
    var msgId = req.params.msgId;
    var cnn = req.cnn;

    async.waterfall([
        function (cb) {
            cnn.chkQry('select * from Message where id = ?', [msgId], cb);
        },
        function (existingMsg, fields, cb) {
            if (vld.check(existingMsg.length, Tags.notFound, null, cb))
                cnn.chkQry('insert into Message set numLikes = numLikes + 1 Where id = ?'[msgId], cb);
        },
        function (result, field, cb) {
            res.location(router.baseURL + '/' + result.insertId).end();
        }],
        function (err) {
            cnn.release();
        })
});


module.exports = router;
