var Express = require('express');
var Tags = require('../Validator.js').Tags;
var async = require('async');
var mysql = require('mysql');
var { Session, router } = require('../Session.js');


var router = Express.Router({ caseSensitive: true });

router.baseURL = '/Prss';
/*
//.../Prss?email=cstaley
router.get('/', function(req, res) {
   var email = req.session.isAdmin() && req.query.email ||
    !req.session.isAdmin() && req.session.email;
   var cnnConfig = {
      host     : 'localhost',
      user     : 'cstaley',
      password : 'CHSpw',
      database : 'cstaley'
   };

   var cnn = mysql.createConnection(cnnConfig);

   if (email)
      cnn.query('select id, email from Person where email = ?', [email],
      function(err, result) {
         if (err) {
            res.status(500).json("Failed query");
         }
         else {
            res.status(200).json(result);
         }
         cnn.destroy();
      });
   else
      cnn.query('select id, email from Person',
      function(err, result) {
         if (err) {
            res.status(500).json("Failed query");
         }
         else {
            res.status(200).json(result);
         }
         cnn.destroy();
      });
});

// Non-waterfall, non-validator, non-db automation version
router.post('/', function(req, res) {
   var body = req.body;
   var admin = req.session && req.session.isAdmin();
   var errorList = [];
   var qry;
   var noPerm;
   var cnnConfig = {
      host     : 'localhost',
      user     : 'clarkdavidson',
      password : 'asLebcz3!',
      database : 'cdavidson'
   };

   if (admin && !body.password)
      body.password = "*";                       // Blocking password
   body.whenRegistered = new Date();

   // Check for fields
   if (!body.hasOwnProperty('email'))
      errorList.push({tag: "missingField", params: "email"});
   if (!body.hasOwnProperty('password'))
      errorList.push({tag: "missingField", params: "password"});
   if (!body.hasOwnProperty('role'))
      errorList.push({tag: "missingField", params: "role"});

   // Do these checks only if all fields are there
   if (!errorList.length) {
      noPerm = body.role === 1 && !admin;
      if (!body.termsAccepted)
         errorList.push({tag: "noTerms"});
      if (body.role < 0 || body.role > 1)
         errorList.push({tag: "badVal", param: "role"});
   }

   // Post errors, or proceed with data fetches
   if (noPerm)
      res.status(403).end();
   else if (errorList.length)
      res.status(400).json(errorList);
   else {
      var cnn = mysql.createConnection(cnnConfig);

      // Find duplicate Email if any.
      cnn.query(qry = 'select * from Person where email = ?', body.email,
      function(err, dupEmail) {
         if (err) {
            cnn.destroy();
            res.status(500).json("Failed query " + qry);
         }
         else if (dupEmail.length) {
            cnn.destroy();
            res.status(400).json({tag: "dupEmail"});
         }
         else { // No duplicate, so make a new Person
            body.termsAccepted = body.termsAccepted && new Date();
            cnn.query(qry = 'insert into Person set ?', body,
            function(err, insRes) {
               cnn.destroy();
               if (err)
                  res.status(500).json("Failed query " + qry);
               else
                  res.location(router.baseURL + '/' + insRes.insertId).end();
            });
          }
      });
   }
});
*/
// Much nicer versions



// router.get('/', function (req, res) {
   // var vld = req.validator;
   // var admin = req.session && req.session.isAdmin();
   // var cnn = req.cnn;

   // var owners = Session.getAllIds().forEach(id => {
   //    ssn = Session.findById(id);
   // });

//    var email = req.query.email;

//    async.waterfall([
//       function (cb) {
//          if (vld.checkPrsOK(ssn.prsId, cb) && email) {
//             cnn.chkQry('select email,id from person where email LIKE ?', [email]);
//          } else if (req.session.isAdmin && !email) {
//             cnn.chkQry('Select email, id from person', null, cb);
//          } else if (!vld.checkPrsOK(ssn.prsId, cb))
//             cnn.chkQry('select * from person where id = null', null, cb)
//       },
//       function (prsArr, fields, cb) {
//          vld.check(prsArr.length, Tags.notFound, null, cb)
//          cb();
//       }],
//       function (err) {
//          if (!err, prsArr) {

//          }
//       }
//    )
// })

//Remove Password from this return value!
router.get('/', function (req, res) {
   var vld = req.validator;
   var admin = req.session && req.session.isAdmin();
   var cnn = req.cnn;

   var owners = Session.getAllIds().forEach(id => {
      ssn = Session.findById(id);
   });


   console.log("Query Email = " + req.query.email);
   console.log("Session Email = " + req.session.email);
   console.log("Is Person A Admin " + req.session.isAdmin());
   var email = req.query.email;
   console.log(req.query.email);
   console.log("First Test = " + req.session.isAdmin() && req.query.email);
   console.log("Second Test = " + !req.session.isAdmin() && req.query.email);


   var handler = function (err, prsArr, fields) {
      if (!err) {
         for (i = 0; i < prsArr.length; i++) {
            delete prsArr[i].password;
         }
         res.json(prsArr);
         //Assuming a connection is already there
         req.cnn.release();
      } else {
         res.json([]);
         req.cnn.release();
      }

   };

   console.log("Value of Email : " + email)

   if (email && vld.checkPrsOK(ssn.prsId, handler)) {
      //Using Handler as a Callback
      email += "%";
      req.cnn.chkQry("select id, email from Person where email LIKE ? ", [email],
         handler);
   }
   else if (!email && req.session.isAdmin()) {
      req.cnn.chkQry('select id, email from Person', null, handler);
   } else
      req.cnn.chkQry('select id, email from Person where email = ?', [req.session.email], handler);
});

router.post('/', function (req, res) {
   var vld = req.validator;  // Shorthands
   var body = req.body; // Request Body
   var admin = req.session && req.session.isAdmin(); //Check for Admin
   var cnn = req.cnn; // Connection From Connection Pool

   if (admin && !body.password)
      body.password = "*";                       // Blocking password
   body.whenRegistered = new Date();

   async.waterfall([
      function (cb) { // Check properties and search for Email duplicates
         if (vld.hasFields(body, ["email", "password", "role"], cb) &&
            vld.chain(body.role === 0 || admin, Tags.forbiddenRole, null)
               //.chain(body.roll !== null || body.roll !== "", Tags.missingField, ['role'])
               .chain(body.termsAccepted || admin, Tags.noTerms, null)
               .chain(body.password || admin, Tags.missingField, 'password')
               .chain(body.email, Tags.missingField, ['email'])
               .chain(body.lastName, Tags.missingField, 'lastName')
               .chain(body.firstName.length <= 30, Tags.badValue, ['firstName'])
               .chain(body.email.length <= 150, Tags.badValue, ['email'])
               .chain(body.lastName.length <= 50, Tags.badValue, ['lastName'])
               .chain(body.password.length <= 50, Tags.badValue, ['password'])
               .check(body.role >= 0, Tags.badValue, ["role"], cb)) {
            cnn.chkQry('select * from Person where email = ?', body.email, cb)
         }
      },
      function (existingPrss, fields, cb) {  // If no duplicates, insert new Person
         if (vld.check(!existingPrss.length, Tags.dupEmail, null, cb)) {
            body.termsAccepted = body.termsAccepted && new Date();
            cnn.chkQry('insert into Person set ?', body, cb);
         }
      },
      function (result, fields, cb) { // Return location of inserted Person
         res.location(router.baseURL + '/' + result.insertId).end();
         cb();
      }],
      function (err) {
         cnn.release();
      });
});


/* Fill in this version */
router.put('/:id', function (req, res) {
   var vld = req.validator;
   var body = req.body;
   var admin = req.session.isAdmin();
   var cnn = req.cnn;


   async.waterfall([
      cb => {
         if (vld.checkPrsOK(req.params.id, cb) &&
            vld.chain(!("whenRegistered" in body), Tags.forbiddenField, ["whenRegistered"])
               .chain(!("termsAccepted" in body), Tags.forbiddenField, ["termsAccepted"])
               .chain(!("role" in body) || body.role === 0 || admin, Tags.badValue, ["role"])
               .chain(!("password" in body) || (body.password !== null && body.password !== "") && body.password.length <= 50, Tags.badValue, ["password"])
               .chain(admin || !body.password || body.oldPassword)
               .chain(!("lastName" in body) || body.lastName.length <= 50, Tags.badValue, ["lastName"])
               .chain(!("email" in body), Tags.badValue, ["email"])
               .check(!("firstName" in body) || body.firstName.length <= 30,
                  Tags.badValue, ["firstName"]), cb)
            cnn.chkQry('select * from Person where id = ?', [req.params.id], cb);
      },
      (prss, fields, cb) => {
         if (vld.check(prss.length, Tags.notFound, null, cb) &&
            vld.check(admin || body.oldPassword === prss.password, Tags.oldPwdMismatch, ["Password Does not Match Old Password"], cb)) {
            delete body.id;
            delete body.oldPassword;
            if (Object.keys(body).length) {
               cnn.chkQry('update Person set ? where id = ?', [req.body, req.params.id], cb);
            }
            else {
               console.log('try again');
               cb(false, null, null);
            }
         }

      },
      (updateResult, fields, cb) => {
         res.status(200).end();
         cb();
      }],
      function (err) {
         console.log('You Ended up here');
         cnn.release();
      });

});

//Remove Password from PrsArr

router.get('/:id', function (req, res) {
   var vld = req.validator;

   async.waterfall([
      function (cb) {
         if (vld.checkPrsOK(req.params.id, cb) || vld.checkAdmin())
            req.cnn.chkQry('select * from Person where id = ?', [req.params.id],
               cb);
      },
      function (prsArr, fields, cb) {
         if (vld.check(prsArr.length, Tags.notFound, null, cb)) {
            console.log(prsArr[0].password);
            delete prsArr[0].password;
            console.log(prsArr[0].password);
            res.json(prsArr);
            cb();
         }
      }],
      err => {
         req.cnn.release();
      });
});

/*
router.get('/:id', function(req, res) {
   var vld = req.validator;

   if (vld.checkPrsOK(req.params.id)) {
      req.cnn.query('select * from Person where id = ?', [req.params.id],
      function(err, prsArr) {
         if (vld.check(prsArr.length, Tags.notFound))
            res.json(prsArr);
         req.cnn.release();
      });
   }
   else {
      req.cnn.release();
   }
});
*/


// ________________________________//
//  Connection Not being Released \\
router.delete('/:id', function (req, res) {
   var vld = req.validator;

   async.waterfall([
      function (cb) {
         if (vld.checkAdmin(cb)) {
            console.log("Admin Check Cleared");
            console.log(vld.checkAdmin());
            req.cnn.chkQry('DELETE from Person where id = ?', [req.params.id], cb);
         }
      },
      function (result, fields, cb) {
         if (vld.check(result.affectedRows, Tags.notFound, null, cb)) {
            console.log("Person Deleted");
            res.end();
            cb();
         }
      }],
      function (err) {
         console.log('Connection Releaserd');
         req.cnn.release();
      });
});

module.exports = router;

