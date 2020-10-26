// Create a validator that draws its session from |req|, and reports

const CnnPool = require("./CnnPool");

// errors on |res|
var Validator = function (req, res) {
   this.errors = [];   // Array of error objects having tag and params
   this.session = req.session;
   this.res = res;
};

// List of errors, and their corresponding resource string tags
Validator.Tags = {
   noLogin: "noLogin",              // No active session/login
   noPermission: "noPermission",    // Login lacks permission.
   missingField: "missingField",    // Field missing. Params[0] is field name
   badValue: "badValue",            // Bad field value.  Params[0] is field name
   notFound: "notFound",            // Entity not present in DB
   badLogin: "badLogin",            // Email/password combination invalid
   dupEmail: "dupEmail",            // Email duplicates an existing email
   noTerms: "noTerms",              // Acceptance of terms is required.
   forbiddenRole: "forbiddenRole",  // Cannot set to this role
   oldPwdMismatch: "oldPwdMismatch",            // Password change requires old password
   dupTitle: "dupTitle",            // Title duplicates an existing cnv title
   queryFailed: "queryFailed",
   forbiddenField: "forbiddenField"
};

// Check |test|.  If false, add an error with tag and possibly empty array
// of qualifying parameters, e.g. name of missing field if tag is
// Tags.missingField.
//
// Regardless, check if any errors have accumulated, and if so, close the
// response with a 400 and a list of accumulated errors, and throw
//  this validator as an error to |cb|, if present.  Thus,
// |check| may be used as an "anchor test" after other tests have run w/o
// immediately reacting to accumulated errors (e.g. checkFields and chain)
// and it may be relied upon to close a response with an appropriate error
// list and call an error handler (e.g. a waterfall default function),
// leaving the caller to cover the "good" case only.
Validator.prototype.check = function (test, tag, params, cb) {
   if (!test)
      this.errors.push({ tag: tag, params: params });

   if (this.errors.length) {
      if (this.res) {
         if (this.errors[0].tag === Validator.Tags.noPermission) {
            console.log('Hitting 403');
            this.res.status(403).end();
         }
         else
            this.res.status(400).json(this.errors);
         this.res = null;   // Preclude repeated closings
      }
      if (cb)
         cb(this);
   }
   return !this.errors.length;
};

// Somewhat like |check|, but designed to allow several chained checks
// in a row, finalized by a check call.
Validator.prototype.chain = function (test, tag, params) {
   if (!test) {
      this.errors.push({ tag: tag, params: params });
   }
   return this;
};

Validator.prototype.checkAdmin = function (cb) {
   console.log('Checking for Admin');
   console.log(this.session.isAdmin());
   return this.check(this.session && this.session.isAdmin(),
      Validator.Tags.noPermission, null, cb);
};

// Validate that AU is the specified person or is an admin
Validator.prototype.checkPrsOK = function (prsId, cb) {
   // console.log(this.session);
   // console.log("Is user a Admin? " + this.session.isAdmin());
   // console.log("User PrsID " + this.session.prsId);
   // console.log(prsId);
   // console.log(parseInt(this.session.prsId) === parseInt(prsId));

   result = this.check(this.session &&
      (this.session.isAdmin() || Number(this.session.prsId) === Number(prsId)),
      Validator.Tags.noPermission, null, cb);

   //console.log(result);

   return result;
};

Validator.prototype.checkFieldLength = function(body, cb){
   if (body.password) {
      console.log(body.password <= 50);
      return (this.check(body.password <= 50),
         Validator.Tags.badValue, ["password"], cb);
   }
};

// Check presence of truthy property in |obj| for all fields in fieldList
Validator.prototype.hasFields = function (obj, fieldList, cb) {
   var self = this;

   fieldList.forEach(function (name) {
      self.chain(obj.hasOwnProperty(name), Validator.Tags.missingField, [name]);
   });

   // console.log(Object.values(obj));
   // values = Object.values(obj)
   // start = 0;
   // values.forEach(function(start){
   //    self.chain(values[start] !== null || values[start] !== "")
   // }, Validator.Tags.missingField, ["stuff"]);
   // console.log(obj.roll);
   // console.log(obj.roll !== null && obj.roll !== undefined);

   return this.check(true, null, null, cb);
};

module.exports = Validator;
