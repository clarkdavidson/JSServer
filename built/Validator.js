"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tags = exports.Validator = void 0;
// Create a validator that draws its session from |req|, and reports
const CnnPool = require("./CnnPool");
class Validator {
    constructor(req, res) {
        this.errors = []; // Array of error objects having tag and params
        this.session = req.session;
        this.res = res;
    }
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
    check(test, tag, params, cb) {
        if (!test)
            this.errors.push({ tag: tag, params: params });
        if (this.errors.length) {
            if (this.res) {
                if (this.errors[0].tag === exports.Tags.noPermission) {
                    console.log('Hitting 403');
                    this.res.status(403).end();
                }
                else
                    this.res.status(400).json(this.errors);
                this.res = null; // Preclude repeated closings   
            }
            if (cb)
                cb(this);
        }
        return !this.errors.length;
    }
    ;
    // Somewhat like |check|, but designed to allow several chained checks
    // in a row, finalized by a check call.
    chain(test, tag, params) {
        if (!test) {
            this.errors.push({ tag: tag, params: params });
        }
        return this;
    }
    ;
    checkAdmin(cb) {
        console.log('Checking for Admin');
        console.log(this.session.isAdmin());
        console.log(this.session);
        return this.check(this.session && this.session.isAdmin(), exports.Tags.noPermission, null, cb);
    }
    ;
    // Validate that AU is the specified person or is an admin
    checkPrsOK(prsId, cb) {
        // console.log(this.session);
        // console.log("Is user a Admin? " + this.session.isAdmin());
        // console.log("User PrsID " + this.session.prsId);
        // console.log(prsId);
        // console.log(parseInt(this.session.prsId) === parseInt(prsId));
        let result = this.check(this.session &&
            (this.session.isAdmin() || this.session.prsId === prsId), exports.Tags.noPermission, null, cb);
        //console.log(result);
        return result;
    }
    ;
    // Check presence of truthy property in |obj| for all fields in fieldList
    hasFields(obj, fieldList, cb) {
        var self = this;
        fieldList.forEach(function (name) {
            console.log(name === null);
            self.chain(obj.hasOwnProperty(name), exports.Tags.missingField, [name])
                .chain(name !== undefined && name !== null, exports.Tags.badValue, [name]);
        });
        return this.check(true, null, null, cb);
    }
    ;
}
exports.Validator = Validator;
// List of errors, and their corresponding resource string tags
exports.Tags = {
    noLogin: "noLogin",
    noPermission: "noPermission",
    missingField: "missingField",
    badValue: "badValue",
    notFound: "notFound",
    badLogin: "badLogin",
    dupEmail: "dupEmail",
    noTerms: "noTerms",
    forbiddenRole: "forbiddenRole",
    oldPwdMismatch: "oldPwdMismatch",
    dupTitle: "dupTitle",
    queryFailed: "queryFailed",
    forbiddenField: "forbiddenField"
};
