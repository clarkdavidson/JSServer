var Express = require('express');
import { Router, Request, Response } from 'express'
import { queryCallback } from 'mysql';
import { Tags } from '../Validator';
import { Session } from "../Session";
var router = Express.Router({ caseSensitive: true });
import async from 'async';


router.baseURL = '/Cnvs';

router.get('/', function (req: Request, res: Response) {
   let owner = req.query.owner;

   if (owner) {
      req.cnn.chkQry('select * from Conversation where ownerId = ?', [owner],
         function (err, cnvs) {
            if (!err)
               res.json(cnvs);
            req.cnn.release();
         });
   } else {
      req.cnn.chkQry('select * from Conversation', null,
         function (err, cnvs) {
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

interface Conversation {
   id: number
   ownerId: number,
   title: String,
   lastMessage: Date
}

interface Result {
   insertId: Number
   affectedRows: Number
}

router.post('/', function (req: Request, res: Response) {
   var vld = req.validator;
   var body = req.body;
   var cnn = req.cnn;

   var array = Session.getSessionsById();
   var owner = array[array.length - 1];

   async.waterfall([
      function (cb: queryCallback) {
         if (vld.hasFields(body, ["title"], cb) &&
            vld.check((body.title.length <= 80), Tags.badValue, ["title"], cb))
            cnn.chkQry('select * from Conversation where title = ?', body.title, cb);
      },
      function (existingCnv: Conversation[], fields: any, cb: queryCallback) {
         if (vld.check(!existingCnv.length, Tags.dupTitle, null, cb))
            cnn.chkQry("insert into Conversation set title = ?, ownerId = ? ",
               [body.title, owner.prsId], cb);
      },
      function (insRes: Result, fields: any, cb: Function) {
         res.location(router.baseURL + '/' + insRes.insertId).end();
         cb();
      }],
      function (err: Error) {
         cnn.release();
      });
});

router.put('/:cnvId', function (req: Request, res: Response) {
   var vld = req.validator;
   var body = req.body;
   var cnn = req.cnn;
   var cnvId = req.params.cnvId;

   var array = Session.getSessionsById();
   var owner = array[array.length - 1];

   async.waterfall([
      function (cb: queryCallback) {
         if (vld.hasFields(body, ["title"], cb) &&
            vld.check(body.title.length <= 80, Tags.badValue, ["title"], cb))
            cnn.chkQry('select * from Conversation where id = ?', [cnvId], cb);
      },
      function (cnvs: Conversation[], fields: any, cb: queryCallback) {

         if (vld.checkPrsOK(cnvs[0].ownerId, cb) &&
            vld.check(Boolean(cnvs.length), Tags.notFound, null, cb))
            cnn.chkQry('select * from Conversation where title = ?', [body.title], cb);
      },
      function (sameTtl: Conversation[], fields: any, cb: queryCallback) {

         if (vld.check(!(sameTtl.length) || ((sameTtl[0].id === parseInt(cnvId)) && (owner.prsId === sameTtl[0].ownerId)),
            Tags.dupTitle, null, cb)) {
            cnn.chkQry("update Conversation set title = ? where id = ?",
               [body.title, cnvId], cb);
            res.status(200).end();
         }
      }
   ],
      function (err: Error) {
         cnn.release();
      });
});

router.delete('/:cnvId', function (req: Request, res: Response) {
   var vld = req.validator;
   var cnvId = req.params.cnvId;
   var cnn = req.cnn;

   async.waterfall([
      function (cb: queryCallback) {
         cnn.chkQry('select * from Conversation where id = ?', [cnvId], cb);
      },
      function (cnvs: Conversation[], fields: any, cb: queryCallback) {
         if (vld.check(Boolean(cnvs.length), Tags.notFound, null, cb) &&
            vld.checkPrsOK(cnvs[0].ownerId, cb))
            cnn.chkQry('delete from Conversation where id = ?', [cnvId], cb);
         res.status(200).end();
      }],
      function (err: Error) {
         cnn.release();
      });
});

router.get('/:cnvId', function (req: Request, res: Response) {
   var vld = req.validator;
   var cnvId = req.params.cnvId;
   var cnn = req.cnn;

   async.waterfall([
      function (cb: queryCallback) {
         cnn.chkQry('select * from Conversation where id = ?', [cnvId], cb);
      },
      function (cnvs: Conversation[], fields: any, cb: queryCallback) {
         if (vld.check(Boolean(cnvs.length), Tags.notFound, null, cb))
            res.json(cnvs[0]);
         cb(null)
      }],
      function (err: Error) {
         cnn.release();
      });
});

router.get('/:cnvId/Msgs', function (req: Request, res: Response) {
   var vld = req.validator;
   var cnvId = req.params.cnvId;
   var cnn = req.cnn;


   var dateTime = parseInt(req.query.dateTime as string);
   var checkDate = new Date(dateTime);

   var num = req.query.num || null;



   async.waterfall([
      function (cb: queryCallback) {
         cnn.chkQry('Select * from Conversation where id = ?', [cnvId], cb)
      },
      function (exisitingCnv: Conversation[], fields: any, cb: queryCallback) {
         if (vld.check(Boolean(exisitingCnv.length), Tags.notFound, null, cb)) {
            if (num) {
               cnn.chkQry('Select M.id, P.email, M.content, M.whenMade, M.numLikes From Message M Inner Join Person P ON M.prsId = P.id where M.cnvId = ? ORDER BY M.whenMade, P.id LIMIT ?'
                  , [cnvId, parseInt(num as string)], cb);
            }
            else if (dateTime) {
               cnn.chkQry('select M.id, P.email, M.content, M.whenMade, M.numLikes From Message M Inner Join Person P ON M.prsId = P.id where whenMade >=  ? ORDER BY M.whenMade, P.id',
                [checkDate], cb)
            }
            else {
               cnn.chkQry(' Select M.id, P.email, M.content, M.whenMade, M.numLikes From Message M Inner Join Person P ON M.prsId = P.id where M.cnvId = ? ORDER BY M.whenMade, P.id ',
                [cnvId], cb)
            }
         }
      }],
      function (err: any, result: any) {
         if (!err) {
            for (var i = 0; i < result.length; i++) {
               
               result[i].whenMade = Date.parse(result[i].whenMade);
           

            }
            res.json(result);
         }
         cnn.release();
      }
   )
});

router.post('/:cnvId/Msgs', function (req: Request, res: Response) {
   var vld = req.validator;
   var cnvId = req.params.cnvId;
   var cnn = req.cnn;
   var body = req.body;
   var time = new Date();
   var array = Session.getSessionsById();
   var owner = array[array.length - 1];

   async.waterfall([
      function (cb: queryCallback) {
         if (vld.hasFields(body, ["content"], cb)
            && vld.check(body.content.length <= 5000, Tags.badValue, ["content"], cb)) {
            cnn.chkQry('insert into Message set cnvId = ?, prsId = ?, whenMade = ? , content = ?, numLikes = 0',
               [cnvId, owner.prsId, time, body.content], cb)
         }
      },
      function (result: Result, field: any, cb: queryCallback) {
         res.location(router.baseURL + '/' + result.insertId).end();
         cnn.chkQry('update Conversation set lastMessage = ? where id = ?', [time, cnvId], cb);
      }],
      function (err: Error) {
         cnn.release()
      });

});

module.exports = router;
