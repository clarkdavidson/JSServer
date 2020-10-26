var Express = require('express');
var Tags = require('../Validator.js').Tags;
var { Session, router } = require('../Session.js');
var router = Express.Router({ caseSensitive: true });

router.baseURL = '/Ssns';

router.get('/', function (req, res) {
   var body = [], ssn;

   if (req.validator.checkAdmin()) {
      Session.getAllIds().forEach(id => {
         ssn = Session.findById(id);
         //console.log(ssn);
         body.push({ id: ssn.id, prsId: ssn.prsId, loginTime: ssn.loginTime });
      });
      res.json(body);
      req.cnn.release();
   }else{
      req.cnn.release();
   }
});

router.post('/', function (req, res) {
   var ssn;
   var cnn = req.cnn;

   cnn.chkQry('select * from Person where email = ?', [req.body.email],
      function (err, result) {
         if (req.validator.check(result.length && result[0].password ===
            req.body.password, Tags.badLogin)) {
            ssn = new Session(result[0], res);
            //console.log(result[0]);
            res.location(router.baseURL + '/' + ssn.id).end();
         }
         cnn.release();
      });
});
//Program This
router.delete('/:id', function (req, res) {
   var vld = req.validator;
   console.log("vld set");
   console.log("Req Query ID " + req.params.id);
   //var newarray = Session.getSessionsById();
   //console.log(Session.getSessionsById());
   var ssn = Session.findById(req.params.id);
   //console.log(ssn);
   console.log("ssn set");

   if (vld.check(ssn, Tags.notFound) && vld.checkPrsOK(ssn.prsId)) {
      ssn.logOut();
      console.log("ssn Logout Occured");
      res.end();
   }
   req.cnn.release();
   console.log("Connection Released");
});

router.get('/:id', function (req, res) {
   var vld = req.validator;
   console.log(req.params.id);
   var ssn = Session.findById(req.params.id);
   console.log(ssn);

   //Added check for admin. <----------------

   if ((vld.check(ssn, Tags.notFound) && vld.checkPrsOK(ssn.id)) || vld.checkAdmin()) {
      res.json({ id: ssn.id, prsId: ssn.prsId, loginTime: ssn.loginTime });
   }
   req.cnn.release();
});

module.exports = router;
