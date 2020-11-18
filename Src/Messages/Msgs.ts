var Express = require('express');
var Tags = require('../Validator.js').Tags;
var { Session, router } = require('../Session.js');
var router = Express.Router({ caseSensitive: true });
import { Router, Request, Response } from 'express'
import { queryCallback } from 'mysql';
var async = require('async');
var mysql = require('mysql');

router.baseURL = '/Msgs';

interface Message {
    whenMade: Date,
    email: String,
    content: String,
    numLikes: number
}

interface Like {
    id: number,
    firstName: String,
    lastName: String
}

interface Result {
    insertId: Number
    affectedRows: Number
}
interface Person {
    id: number,
    firstName: string,
    lastName: string,

}

router.get('/:msgId', function (req: Request, res: Response) {
    var vld = req.validator;
    var msgId = req.params.msgId;
    var cnn = req.cnn;

    async.waterfall([
        function (cb: queryCallback) {
            cnn.chkQry(" Select M.whenMade,P.email,M.content From Message M Inner Join Person P ON M.prsId = P.Id where M.id = ?;", [msgId], cb);
            console.log('Sql Statment Done');
        },
        function (msgArr: Message[], fields: any, cb: Function) {
            if (vld.check(Boolean(msgArr.length), Tags.notFound, null, cb)) {
                (msgArr[0].whenMade as unknown as number) = msgArr[0].whenMade.getTime();
                res.json(msgArr[0]).end();
                cb();
            }
        }],
        function (err: Error) {
            console.log("Connection Is Released");
            req.cnn.release();
        });
});

router.post('/:msgId/Likes', function (req: Request, res: Response) {
    var vld = req.validator;
    var msgId = req.params.msgId;
    var cnn = req.cnn;

    var owners = Session.getAllIds().forEach((id: number) => {
        Session.findById(id);
    });

    async.waterfall([
        function (cb: queryCallback) {
            cnn.chkQry('select * from Message where id = ?', [msgId], cb);
        },
        function (existingMsg: Message[], fields: any, cb: queryCallback) {
            if (vld.check(Boolean(existingMsg.length), Tags.notFound, null, cb)) {
                cnn.chkQry("select * from Likes where msgId = ? && prsId = ?", [msgId, owners.prsId], cb)
            }
            console.log("Second Statement Done");
        },
        function (existingLike: Like[], field: any, cb: queryCallback) {
            if (vld.check(!existingLike.length, null, null, cb)) {
                cnn.chkQry('Insert Into Likes set prsId = ?, msgId = ?', [owners.prsId, msgId], cb)
            }
        },
        function (result: Result, fields: any, cb: queryCallback) {
            cnn.chkQry('UPDATE Message set numLikes = numLikes + 1 where id = ?', [msgId], cb);
            res.location(router.baseURL + '/' + result.insertId).end();
        }],
        function (err: Error) {
            cnn.release();
        }
    )
});


router.get('/:msgId/Likes', function (req: Request, res: Response) {
    var vld = req.validator;
    var msgId = req.params.msgId;
    var cnn = req.cnn;

    var num = parseInt(req.query.num as string);

    var handler = function (err: Error, prsArr: Person, fields: any) {
        res.json(prsArr);
        req.cnn.release();
    }

    if (num) {
        req.cnn.chkQry("Select L.id, P.firstName, P.lastName from Likes L Inner Join Person P ON L.prsId = P.id where msgId = ? ORDER BY P.lastName Limit ?",
            [msgId, num], handler);
    } else {
        req.cnn.chkQry("Select L.id, P.firstName, P.lastName from Likes L Inner Join Person P ON L.prsId = P.id where msgId = ? ORDER BY P.lastName",
            [msgId, num], handler)
    };
})


module.exports = router;