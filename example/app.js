/*jshint node:true,globalstrict:true*/
'use strict';

var express = require('express');
var app = express();
//app.set('trust proxy', true)

var config = require('./config');

var PiwikProxy = require('../index.js');
// Pass config.options as the third parameter if you need fine-tuning
var piwikProxy = new PiwikProxy(config.piwikUrl, config.tokenAuth, config.options);

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/piwik', function(req, res) {
  piwikProxy.process(req, res);
});

app.listen(3000, function() {
  console.log('Listening on port 3000');
});
