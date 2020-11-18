var Express = require('express');
var Tags = require('../Validator.js').Tags;
var { Session, router } = require('../Session.js');
import { Router, Request, Response } from 'express'
var router = Express.Router({ caseSensitive: true });

router.baseURL = '/Ssns';

router.get('/', function (req: Request, res: Response) {
   var body: { id: number; prsId: number; loginTime: Date; }[] = [], ssn;

   if (req.validator.checkAdmin(null)) {
      Session.getAllIds().forEach((id: number) => {
         ssn = Session.findById(id);
         //console.log(ssn);
         body.push({ id: ssn.id, prsId: ssn.prsId, loginTime: ssn.loginTime });
      });
      res.json(body);
      req.cnn.release();
   } else {
      req.cnn.release();
   }
});

router.post('/', function (req: Request, res: Response) {
   var ssn;
   var cnn = req.cnn;

   cnn.chkQry('select * from Person where email = ?', [req.body.email],
      function (err, result) {
         if (req.validator.check(result.length && result[0].password ===
            req.body.password, Tags.badLogin, null, null)) {
            ssn = new Session(result[0], res);
            //console.log(result[0]);
            res.location(router.baseURL + '/' + ssn.id).end();
         }
         cnn.release();
      });
});
//Program This
router.delete('/:id', function (req: Request, res: Response) {
   var vld = req.validator;
   console.log("vld set");
   console.log("Req Query ID " + req.params.id);
   //var newarray = Session.getSessionsById();
   //console.log(Session.getSessionsById());
   var ssn = Session.findById(req.params.id);
   //console.log(ssn);
   console.log("ssn set");

   if (vld.check(ssn, Tags.notFound, null, null) && vld.checkPrsOK(ssn.prsId, null)) {
      ssn.logOut();
      console.log("ssn Logout Occured");
      res.end();
   }
   req.cnn.release();
   console.log("Connection Released");
});

router.get('/:id', function (req: Request, res: Response) {
   var vld = req.validator;
   console.log(req.params.id);
   var ssn = Session.findById(req.params.id);
   console.log(ssn);

   //Added check for admin. <----------------

   if ((vld.check(ssn, Tags.notFound, null, null) && vld.checkPrsOK(ssn.id, null))
   || vld.checkAdmin(null)) {
      res.json({ id: ssn.id, prsId: ssn.prsId, loginTime: ssn.loginTime });
   }
   req.cnn.release();
});

module.exports = router;
