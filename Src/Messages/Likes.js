var Express = require('express');
var Tags = require('../Validator.js').Tags;
var { Session, router } = require('../Session.js');
var router = Express.Router({ caseSensitive: true });
var async = require('async');
var mysql = require('mysql');


router.baseURL = '/'
