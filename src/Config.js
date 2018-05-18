'use strict';
var nconf = require('nconf');

nconf.env().argv();

module.exports = nconf;