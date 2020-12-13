var Express = require('express');
import {Tags} from '../Validator';
import { Session } from "../Session";
var router = Express.Router({ caseSensitive: true });
import {  Request, Response } from 'express'
import { queryCallback } from 'mysql';
import async from 'async';
import mysql from 'mysql';

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
            cnn.chkQry(" Select M.whenMade,P.email,M.content, M.numLikes From Message M Inner Join Person P ON M.prsId = P.Id where M.id = ?;", [msgId], cb);
        },
        function (msgArr: Message[], fields: any, cb: Function) {
            if (vld.check(Boolean(msgArr.length), Tags.notFound, null, cb)) {
                (msgArr[0].whenMade as unknown as number) = msgArr[0].whenMade.getTime();
                res.json(msgArr[0]).end();
                cb();
            }
        }],
        function (err: Error) {
            req.cnn.release();
        });
});

router.post('/:msgId/Likes', function (req: Request, res: Response) {
    var vld = req.validator;
    var msgId = req.params.msgId;
    var cnn = req.cnn;

    var array = Session.getSessionsById();
    var owner = array[array.length - 1];

    async.waterfall([
        function (cb: queryCallback) {
            cnn.chkQry('select * from Message where id = ?', [msgId], cb);
        },
        function (existingMsg: Message[], fields: any, cb: queryCallback) {
            if (vld.check(Boolean(existingMsg.length), Tags.notFound, null, cb)) {
                cnn.chkQry("select * from Likes where msgId = ? && prsId = ?", [msgId, owner.prsId], cb)
            }
        },
        function (existingLike: Like[], field: any, cb: queryCallback) {
            if (vld.check(!existingLike.length, null, null, cb)) {
                cnn.chkQry('Insert Into Likes set prsId = ?, msgId = ?', [owner.prsId, msgId], cb)
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
        cnn.chkQry(" Select L.id, P.firstName, P.lastName from Likes L Inner Join Person P ON L.prsId = P.id where msgId = ? ORDER BY L.id DESC, P.lastName LIMIT 1",
            [msgId, num], handler);
    } else {
        cnn.chkQry("Select L.id, P.firstName, P.lastName from Likes L Inner Join Person P ON L.prsId = P.id where msgId = ? ORDER BY P.lastName",
            [msgId, num], handler)
    };
})


module.exports = router;