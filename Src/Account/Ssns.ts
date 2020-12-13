var Express = require('express');
import { Tags } from '../Validator';
import { Session } from '../Session';
import { Request, Response } from 'express'

var router = Express.Router({ caseSensitive: true });

router.baseURL = '/Ssns';

router.get('/', function (req: Request, res: Response) {
   var body: { id: number; prsId: number; loginTime: number; }[] = [], ssn;

   if (req.validator.checkAdmin(null)) {
      Session.getAllIds().forEach((id) => {
         ssn = Session.findById(id);
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
            res.location(router.baseURL + '/' + ssn.id).end();
         }
         cnn.release();
      });
});
router.delete('/:id', function (req: Request, res: Response) {
   var vld = req.validator;
   var ssn = Session.findById(req.params.id);
   if (vld.check(Boolean(ssn), Tags.notFound, null, null) && vld.checkPrsOK(ssn.prsId, null)) {
      ssn.logOut();
      res.end();
   }
   req.cnn.release();
});

router.get('/:id', function (req: Request, res: Response) {
   var vld = req.validator;
   var ssn = Session.findById(req.params.id);

   if ((vld.check(Boolean(ssn), Tags.notFound, null, null) && vld.checkPrsOK(ssn.prsId, null))
      || vld.checkAdmin(null)) {
      res.json({ id: ssn.id, prsId: ssn.prsId, loginTime: ssn.loginTime });
   }
   req.cnn.release();
});

module.exports = router;
