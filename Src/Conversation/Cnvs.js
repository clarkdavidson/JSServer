var Express = require('express');
var Tags = require('../Validator.js').Tags;
var { Session, router } = require('../Session.js');
var router = Express.Router({ caseSensitive: true });
var async = require('async');


router.baseURL = '/Cnvs';

// Need to add ownerID search functionality
// Return Values ??
router.get('/', function (req, res) {
   owner = req.query.owner;
   console.log(owner);

   if (owner) {
      req.cnn.chkQry('select * from Conversation where ownerId = ?', owner,
         function (err, cnvs) {
            if (!err)
               res.json(cnvs);
            req.cnn.release();
         });
   } else {
      req.cnn.chkQry('select * from Conversation', null,
         function (err, cnvs) {
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
   var owners = Session.getAllIds().forEach(id => {
      ssn = Session.findById(id);
   });

   console.log(ssn.prsId);
   console.log(body.title);
   console.log(body.title.length <= 80);

   async.waterfall([
      function (cb) {
         if (vld.check((body.title.length <= 80), Tags.badValue, ["title"], cb) &&
            vld.check((body.title !== "" && body.title !== null), Tags.missingField, ["title"], cb))
            cnn.chkQry('select * from Conversation where title = ?', body.title, cb);
      },
      function (existingCnv, fields, cb) {
         console.log(existingCnv[0]);
         if (vld.check(!existingCnv.length, Tags.dupTitle, null, cb))
            cnn.chkQry("insert into Conversation set title = ?, ownerId = ? ",
               [body.title, ssn.prsId], cb);
      },
      function (insRes, fields, cb) {
         res.location(router.baseURL + '/' + insRes.insertId).end();
         cb()
      }],
      function (err) {
         cnn.release();
      });
});

router.put('/:cnvId', function (req, res) {
   var vld = req.validator;
   var body = req.body;
   var cnn = req.cnn;
   var cnvId = req.params.cnvId;
   var owners = Session.getAllIds().forEach(id => {
      ssn = Session.findById(id);
   });

   async.waterfall([
      function (cb) {
         //console.log(ssn.prsId);
         if (vld.check(body.title.length <= 80, Tags.badValue, ["title"], cb))
            cnn.chkQry('select * from Conversation where id = ?', [cnvId], cb);
      },
      function (cnvs, fields, cb) {
         //console.log(cnvs[0]);
         //console.log("Convo Length = " + cnvs.length);
         //console.log("Is Person Okay " + vld.checkPrsOK(cnvs[0].ownerId));
         if (vld.checkPrsOK(cnvs[0].ownerId, cb) &&
            vld.check(cnvs.length, Tags.notFound, null, cb))
            cnn.chkQry('select * from Conversation where title = ?', [body.title], cb);
      },
      function (sameTtl, fields, cb) {
         // console.log("sameTtl.legth = " + sameTtl.length);
         if (vld.check(!(sameTtl.length) || ((sameTtl[0].id === parseInt(cnvId)) && (ssn.prsId === sameTtl[0].ownerId)),
            Tags.dupTitle, null, cb)) {
            cnn.chkQry("update Conversation set title = ? where id = ?",
               [body.title, cnvId], cb);
            res.status(200).end();
         }
      }
   ],
      function (err) {
         cnn.release();
      });
});

router.delete('/:cnvId', function (req, res) {
   var vld = req.validator;
   var cnvId = req.params.cnvId;
   var cnn = req.cnn;

   async.waterfall([
      function (cb) {
         cnn.chkQry('select * from Conversation where id = ?', [cnvId], cb);
      },
      function (cnvs, fields, cb) {
         if (vld.check(cnvs.length, Tags.notFound, null, cb) &&
            vld.checkPrsOK(cnvs[0].ownerId, cb))
            cnn.chkQry('delete from Conversation where id = ?', [cnvId], cb);
         res.status(200).end();
      }],
      function (err) {
         cnn.release();
      });
});

router.get('/:cnvId', function (req, res) {
   var vld = req.validator;
   var cnvId = req.params.cnvId;
   var cnn = req.cnn;

   async.waterfall([
      function (cb) {
         cnn.chkQry('select * from Conversation where id = ?', cnvId, cb);
      },
      function (cnvs, fields, cb) {
         if (vld.check(cnvs.length, Tags.notFound, null, cb))
            res.json(cnvs);
         cb()
      }],
      function (err) {
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

   console.log(dateTime);
   console.log(typeof checkDate);

   var handler = function (err, prsArr, fields) {
      res.json(prsArr);
      req.cnn.release();
   };

   if (num) {
      console.log("Made It Here");
      cnn.chkQry(' Select M.id, P.email, M.content, M.whenMade From Message M Inner Join Person P ON M.prsId = P.id LIMIT ?'
      , [parseInt(num)], handler)
   } else if (dateTime) {
      cnn.chkQry('select * from Message where whenMade >=  ? ', [checkDate], handler)
   }
});

router.post('/:cnvId/Msgs', function (req, res) {
   var vld = req.validator;
   var cnvId = req.params.cnvId;
   var cnn = req.cnn;
   var body = req.body;
   var time = new Date();

   var owners = Session.getAllIds().forEach(id => {
      ssn = Session.findById(id);
   });


   async.waterfall([
      function (cb) {
         if (vld.check(body.content.length <= 5000, Tags.badValue, ["content"], cb))
            cnn.chkQry('insert into Message set cnvId = ?, prsId = ?, whenMade = ? , content = ?, numLikes = 0',
               [cnvId, ssn.prsId, time, body.content], cb)
      },
      function (result, field, cb) {
         res.location(router.baseURL + '/' + result.insertId).end();
         cb();
      }],
      function (err) {
         cnn.release()
      });

});

module.exports = router;
