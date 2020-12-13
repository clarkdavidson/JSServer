var Express = require('express');
import { Request, Response } from 'express'
import { queryCallback } from 'mysql';
import { Tags } from '../Validator';
import async, { any } from 'async';
import mysql from 'mysql';
import { Session } from "../Session";
import { unescapeLeadingUnderscores } from 'typescript';

var router = Express.Router({ caseSensitive: true });

router.baseURL = '/Prss';


interface Person {
   id: number;
   firstName: String;
   lastName: String;
   password: String;
   role: number;
   termsAccepted: boolean;
}

interface Result {
   insertId: Number
   affectedRows: Number
}


//Remove Password from this return value!
router.get('/', function (req: Request, res: Response) {
   let email = req.query.email;

   var handler = function (err: Error, prsArr: Person[], fields: any) {
      for (let i = 0; i < prsArr.length; i++) {
         delete prsArr[i].password;
      }
      res.json(prsArr);
      req.cnn.release();
   };

   if (email && req.session.isAdmin()) {
      email += "%";
      req.cnn.chkQry("select id, email from Person where email LIKE ? ", [email],
         handler);
   }
   else if (req.session.isAdmin() && !email) {
      req.cnn.chkQry('select id, email from Person', null, handler);
   }
   else if (!req.session.isAdmin() && (req.session.email.includes(email as string) || !email)) {
      req.cnn.chkQry('select id,email from Person where email = ?', [req.session.email], handler);
   } else if (!req.session.isAdmin() && !req.session.email.includes(email as string)) {
      req.cnn.chkQry('select id, email from Person where email = null', null, handler);
   }

});

router.post('/', function (req: Request, res: Response) {
   var vld = req.validator; 
   var body = req.body; 
   var admin = req.session && req.session.isAdmin();
   var cnn = req.cnn;

   if (admin && !body.password)
      body.password = "*";                      
   if (!body.firstName)
      body.firstName = "";


   async.waterfall([
      function (cb: queryCallback) {
         if (vld.hasFields(body, ["email", "password", "role", "lastName"], cb) &&
            vld.checkFields(body, ["email", "firstName", "lastName", "password", "role", "termsAccepted"], cb) &&
            vld.chain(body.role === 0 || admin, Tags.forbiddenRole, null)
               .chain((body.termsAccepted && body.termsAccepted === true) || admin, Tags.noTerms, null)
               .chain(body.password || admin, Tags.missingField, ['password'])
               .chain(body.email, Tags.missingField, ['email'])
               .chain(body.firstName.length <= 30, Tags.badValue, ['firstName'])
               .chain(body.email.length <= 150, Tags.badValue, ['email'])
               .chain(body.lastName.length <= 50, Tags.badValue, ['lastName'])
               .chain(body.password.length <= 50, Tags.badValue, ['password'])
               .check(body.role >= 0, Tags.badValue, ["role"], cb)) {
            cnn.chkQry('select * from Person where email = ?', body.email, cb)
         }
      },
      function (existingPrss: Person[], fields: any, cb: queryCallback) { 
         if (vld.check(!existingPrss.length, Tags.dupEmail, null, cb)) {
            body.whenRegistered = new Date();
            body.termsAccepted = body.termsAccepted && new Date();
            cnn.chkQry('insert into Person set ?', body, cb);
         }
      },
      function (result: Result, fields: any, cb: Function) { 
         res.location(router.baseURL + '/' + result.insertId).end();
         cb();
      }],
      function (err: Error) {
         cnn.release();
      });
});

router.put('/:id', function (req: Request, res: Response) {
   var vld = req.validator;
   var body = req.body;
   var admin = req.session.isAdmin();
   var cnn = req.cnn;


   async.waterfall([
      function (cb: queryCallback) {
         if (vld.checkPrsOK(parseInt(req.params.id), cb) &&
            vld.checkFields(body, ["firstName", "lastName", "password", "role", "oldPassword"], cb) &&
            vld.chain(!("whenRegistered" in body), Tags.forbiddenField, ["whenRegistered"])
               .chain(!("termsAccepted" in body), Tags.forbiddenField, ["termsAccepted"])
               .chain((!("role" in body) || body.role === 0) || admin, Tags.badValue, ["role"])
               .chain(!("password" in body) || (body.password !== null && body.password !== undefined &&
                  body.password !== "") && body.password.length <= 50, Tags.badValue, ["password"])
               .chain(!("lastName" in body) || (body.lastName !== null && body.lastName !== undefined &&
                  body.lastName !== "") && body.lastName.length <= 50, Tags.badValue, ["lastName"])
               .chain(!("email" in body), Tags.badValue, ["email"])
               .check(!("firstName" in body) || (body.firstName !== null && body.firstName !== undefined)
                  && body.firstName.length <= 30,
                  Tags.badValue, ["firstName"], cb))
            cnn.chkQry('select * from Person where id = ?', [req.params.id], cb);
      },
      (prss: Person[], fields: any, cb: queryCallback) => {
         if (vld.check(Boolean(prss.length), Tags.notFound, null, cb) &&
            vld.check((body.password && body.oldPassword) || !body.password || admin, Tags.noOldPwd, null, cb) &&
            vld.check(admin || body.oldPassword === prss[0].password || !body.password, Tags.oldPwdMismatch, ["pwdMismatch"], cb)) {
            delete body.id;
            delete body.oldPassword;
            if (Object.keys(body).length) {
               cnn.chkQry('update Person set ? where id = ?', [req.body, req.params.id], cb);
            }
            else {
               cb(null, null, null);
            }
         }

      },
      (updateResult: any, fields: any, cb: Function) => {
         res.status(200).end();
         cb();
      }],
      function (err: Error) {
         cnn.release();
      });

});


router.get('/:id', function (req: Request, res: Response) {
   var vld = req.validator;

   async.waterfall([
      function (cb: queryCallback) {
         if (vld.checkPrsOK(parseInt(req.params.id), cb) || vld.checkAdmin(cb))
            req.cnn.chkQry('select * from Person where id = ?', [req.params.id],
               cb);
      },
      function (prsArr: Person[], fields: any, cb: Function) {
         if (vld.check(Boolean(prsArr.length), Tags.notFound, null, cb)) {
            delete prsArr[0].password;
            res.json(prsArr);
            cb();
         }
      }],
      (err: Error) => {
         req.cnn.release();
      });
});

router.delete('/:id', function (req: Request, res: Response) {
   var vld = req.validator;
   var userId = req.params.id;
   async.waterfall([
      function (cb: queryCallback) {
         if (vld.checkAdmin(cb)) {
            Session.deletedUser(userId);
            req.cnn.chkQry('Select * from Person where id = ?', [req.params.id], cb)
         }
      },
      function (result: any, fields: any, cb: queryCallback) {
         if (vld.check(result.length, Tags.notFound, null, cb)) {
            req.cnn.chkQry(' Update Message set numLikes = numLikes - 1 where id IN(Select msgId from Likes where prsId = ?);', [req.params.id], cb)
         }
      },
      function (result: any, fields: any, cb: queryCallback) {
         req.cnn.chkQry('Delete from Person where id = ?', [req.params.id], cb)
         res.end();
      }
   ],
      function (err) {
         req.cnn.release();
      });
});
module.exports = router;

