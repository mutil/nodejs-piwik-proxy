/**
 * Nodejs proxy to hide piwik URL
 * Read the instructions in README.md
 */

/*jshint curly:false,node:true,globalstrict:true*/
'use strict';

var request = require('request');

/**
 * @constructor
 * @param {String} piwikUrl  URL of piwik server
 * @param {String} tokenAuth Authentication token of piwik user
 * @param {Object} options   Optional configuration object
 * @returns {PiwikProxy}     Instance of PiwikProxy
 */
function PiwikProxy(piwikUrl, tokenAuth, options) {
  if (!(this instanceof PiwikProxy)) return new PiwikProxy(piwikUrl, tokenAuth, options);

  if (!piwikUrl || typeof piwikUrl !== 'string')
    throw new Error('A piwik URL must be provided');

  if (!tokenAuth || typeof tokenAuth !== 'string')
    throw new Error('A token auth must be provided');

  this.piwikUrl = piwikUrl;
  this.tokenAuth = tokenAuth;
  this.options = options || {};
}

/**
 * Executes the call to the piwik server URL
 *
 * Depending on the existence of GET query
 * either we serve the piwik.js file
 * or we make a track request to piwik.php
 *
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
PiwikProxy.prototype.process = function process(req, res) {
  if (!req || !res)
    throw new Error('Request and response object must be provided');

  req.query = req.query || {};
  req.headers = req.headers || {};

  if (!Object.keys(req.query).length) {
    var trailingIndex, modifiedSince, lastModified;

    if (req.headers['if-modified-since']) {
      // strip any trailing data appended to header
      if ((trailingIndex = req.headers['if-modified-since'].indexOf(';')) > 0)
        req.headers['if-modified-since'] = req.headers['if-modified-since'].slice(0, trailingIndex);

      modifiedSince = new Date(req.headers['if-modified-since']).getTime();
    }

    // re-download the piwik.js once a day maximum
    lastModified = new Date().getTime() - 86400000;

    // Returns 304 if not modified since
    if (modifiedSince && modifiedSince > lastModified) return res.send(304);

    // set HTTP response headers
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    res.setHeader('Vary', 'Accept-Encoding');

    // make request for the javascript file and send it to client
    request.get(this.piwikUrl + 'piwik.js', this.options, function(error, response, body) {
      if (error) return res.send(500, error.toString());
      if (response.statusCode >= 300) return res.send(response.statusCode);
      res.send(response.statusCode, body);
    });

  } else {
    var cip, key, url, value, _ref;

    // add key/value queries to piwik url
    cip = req.ip || req._remoteAddress; //|| req.socket.remoteAddress;
    url = this.piwikUrl + 'piwik.php?cip=' + cip + '&token_auth=' + this.tokenAuth + '&';
    _ref = req.query;
    for (key in _ref) {
      if (_ref.hasOwnProperty(key)) {
        value = _ref[key];
        url += key + '=' + encodeURIComponent(value) + '&';
      }
    }

    // set request options
    this.options.headers = this.options.headers || {};
    this.options.headers['User-Agent'] = req.headers['user-agent'] || '';
    this.options.headers['Accept-Language'] = req.headers['accept-language'] || '';

    // set HTTP response headers
    res.setHeader('Content-Type', 'image/gif');

    // make a tracking request to the piwik server
    request.get(url, this.options, function(error, response, body) {
      if (error) return res.send(500, error.toString());
      if (response.statusCode >= 300) return res.send(response.statusCode);
      res.send(response.statusCode, body);
    });
  }
};

module.exports = PiwikProxy;
