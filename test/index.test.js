/*jshint immed:false,es3:false,nonew:false,newcap:false,proto:true,expr:true,node:true,globalstrict:true*/
/*global describe, it, beforeEach, afterEach*/
'use strict';

var chai = require('chai'),
  sinon = require('sinon'),
  sinonChai = require('sinon-chai'),
  request = require('request'),
  nock = require('nock');

chai.should();
chai.use(sinonChai);

var PiwikProxy = require('../index.js');

describe('PiwikProxy()', function() {
  it('should return a PiwikProxy even if it is not called with the new keyword', function() {
    (function() {
      PiwikProxy();
    }).should.throw(/must be provided/);
  });

  it('should throw if no parameters provided', function() {
    (function() {
      new PiwikProxy();
    }).should.throw(/must be provided/);
  });

  it('should throw if no piwikUrl is provided', function() {
    (function() {
      new PiwikProxy(null);
    }).should.throw(/piwik URL/);
  });

  it('should throw if no tokenAuth is provided', function() {
    (function() {
      new PiwikProxy('piwikUrl', null);
    }).should.throw(/token auth/);
  });

  it('should have properties piwikUrl/tokenAuth/options', function() {
    var piwik = new PiwikProxy('http://example.com/piwik.php', 'xyz');
    piwik.piwikUrl.should.equal('http://example.com/piwik.php');
    piwik.tokenAuth.should.equal('xyz');
    piwik.options.should.be.an('object').and.be.empty;
  });

  it('should have options object if it was passed', function() {
    var piwik = new PiwikProxy('http://example.com/piwik.php', 'xyz', {'key': 'value'});
    piwik.piwikUrl.should.equal('http://example.com/piwik.php');
    piwik.tokenAuth.should.equal('xyz');
    piwik.options.should.have.property('key').and.equal('value');
  });

});

describe('#process() - Get and serve piwik.js', function() {
  var httpMock, httpSpy, piwik, req = {}, res = {};

  beforeEach(function() {
    piwik = new PiwikProxy('http://localhost/', 'xyz');
    res.setHeader = function() {};
  });

  afterEach(function() {
    piwik = null;
  });

  it('should throw without req/res parameters', function() {
    (function() {
      piwik.process();
    }).should.throw(/must be provided/);
  });

  it('should call request.get(piwik.js) function if no GET query exists', function(done) {
    var first = true;
    res.send = function() {
      if (!first) { done(); }
      first = false;
    };
    httpSpy = sinon.spy(request, 'get');
    piwik.process(req, res);
    piwik.process(req, res);
    httpSpy.should.have.been.calledTwice.and.have.been.calledWith('http://localhost/piwik.js');
    httpSpy.restore();
  });

  it('should return 200 if no GET query exists and file found', function(done) {
    res.send = function(httpStatus) {
      httpStatus.should.equal(200);
      done();
    };
    httpMock = nock('http://localhost').get('/piwik.js').reply(200);
    piwik.process(req, res);
  });

  it('should return 404 if no GET query exists but file not found', function(done) {
    res.send = function(httpStatus) {
      httpStatus.should.equal(404);
      done();
    };
    piwik = new PiwikProxy('http://localhost/invalidDomain', 'xyz');
    piwik.process(req, res);
  });

  it('should return 500 if no GET query exists but there was a request error', function(done) {
    res.send = function(httpStatus) {
      httpStatus.should.equal(500);
      done();
    };
    piwik = new PiwikProxy('http://', 'xyz');
    piwik.process(req, res);
  });

  it('should return 304 after striping trailing data from if-modified-since header', function(done) {
    req.headers = { 'if-modified-since': new Date() + ';text' };
    res.send = function(httpStatus) {
      httpStatus.should.equal(304);
      done();
    };
    piwik.process(req, res);
  });

  it('should return 200 if-modified-since header is older than lastModified date', function(done) {
    req.headers = { 'if-modified-since': new Date(Date.now() - 864000000).toGMTString() };
    res.send = function(httpStatus) {
      httpStatus.should.equal(200);
      done();
    };
    httpMock = nock('http://localhost').get('/piwik.js').reply(200);
    piwik.process(req, res);
  });

});

describe('#process() - Make a tracking request to piwik.php', function() {
  var httpMock, httpSpy, piwik, req = {}, res = {};

  beforeEach(function() {
    piwik = new PiwikProxy('http://localhost/', 'xyz');
    res.setHeader = function() {};
    req.query = { idsite: 1, rec: 1 };
    req.ip = '127.0.0.1';
  });

  afterEach(function() {
    piwik = null;
  });

  it('should throw without req/res parameters', function() {
    (function() {
      piwik.process();
    }).should.throw(/must be provided/);
  });

  it('should call request.get(piwik.php?query) function if GET query exists', function(done) {
    delete req.ip; //Test req._remoteAdress instead of req.ip
    req._remoteAddress = '127.0.0.1';

    Object.defineProperty(req.query.__proto__, 'protoProperty',
      {value: '', writable: true, enumerable: true}); //Try adding a not own property in req.query

    res.send = function() { done(); };
    httpSpy = sinon.spy(request, 'get');
    piwik.process(req, res);
    httpSpy.should.have.been.calledWith('http://localhost/piwik.php?cip=127.0.0.1&token_auth=xyz&idsite=1&rec=1&');
    httpSpy.restore();
  });

  it('should return 200 if GET query exists and file found', function(done) {
    res.send = function(httpStatus) {
      httpStatus.should.equal(200);
      done();
    };
    httpMock = nock('http://localhost').get('/piwik.php?cip=127.0.0.1&token_auth=xyz&idsite=1&rec=1&').reply(200);
    piwik.process(req, res);
  });

  it('should return 404 if GET query exists but file not found', function(done) {
    res.send = function(httpStatus) {
      httpStatus.should.equal(404);
      done();
    };
    piwik = new PiwikProxy('http://localhost/invalidDomain', 'xyz');
    piwik.process(req, res);
  });

  it('should return 500 if no GET query exists but there was a request error', function(done) {
    res.send = function(httpStatus) {
      httpStatus.should.equal(500);
      done();
    };
    piwik = new PiwikProxy('http://', 'xyz');
    piwik.process(req, res);
  });

});
