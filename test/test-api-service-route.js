var request = require('supertest');
var assert = require('assert');
var express = require('express');
var passport = require('passport');
var mockPassport = require('passport-mock');
var storageFactory = require('../lib/storage/storage-factory');
var storage = storageFactory.getStorageInstance('test');

var app = require('../webserver/app')(storage);

describe('service route', function () {

  var server;
  var PORT = 3355;

  var USERS = [
    {id: 1, email: 'admin@domain.com', isAdmin: true},
    {id: 2, email: 'user@domain.com', isAdmin: false}
  ];
  var agent = request.agent(app);

  var VALID_SERVICE = {
    name: 'my new service',
    pingServiceName: 'http-head',
    url: 'http://apple.com',
    timeout: 10000,
    port: 80,
    interval: 60000,
    failureInterval: 30000,
    warningThreshold: 30000
  };

  before(function (done) {

    app.use(passport.initialize());
    app.use(passport.session());

    var mock = mockPassport(passport, USERS);
    mock(app);

    server = app.listen(PORT, function () {
      if (server.address()) {
        console.log('starting server in port ' + PORT);
        done();
      } else {
        console.log('something went wrong... couldn\'t listen to that port.');
        process.exit(1);
      }
    });
  });

  after(function () {
    server.close();
  });

  describe('adding service', function () {

    describe('with an anonymous user', function () {

      before(function (done) {
        agent.get('/logout').expect(302, done);
      });

      it('should require auth', function (done) {
        var body = {
          name: 'my new service',
          interval: 1000
        };
        agent
            .post('/api/services')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(401)
            .send(body)
            .end(function (err) {
              done(err);
            });
      });
    });

    describe('with an authenticated admin user', function () {
      before(function (done) {
        agent.get('/login/test/1').expect(200, done);
      });

      it('should return 400 if the service does not validate', function (done) {

        var body = {
          name: 'my new service',
          interval: 1000
        };

        agent
            .post('/api/services')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(400)
            .send(body)
            .end(function (err) {
              done(err);
            });
      });

      it('should add the service if properties are correct', function (done) {

        agent
            .post('/api/services')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200)
            .send(VALID_SERVICE)
            .end(function (err, res) {
              if (err) {
                return done(err);
              }
              done();
            });
      });
    });

    describe('with an authenticated normal user', function () {
      before(function (done) {
        agent.get('/login/test/2').expect(200, done);
      });

      it('should not have permissions', function (done) {
        var body = {
          name: 'my new service',
          interval: 1000
        };
        agent
            .post('/api/services')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(401)
            .send(body)
            .end(function (err) {
              done(err);
            });
      });
    });
  });

  describe('deleting a service', function () {

    describe('with an anonymous user', function () {

      before(function (done) {
        agent.get('/logout').expect(302, done);
      });

      it('should require auth', function (done) {
        agent
            .delete('/api/services/222')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(401)
            .send()
            .end(function (err, res) {
              done(err);
            });
      });
    });

    describe('with an authenticated admin user', function () {

      before(function (done) {
        agent.get('/login/test/1').expect(200, done);
      });

      it('should return 404 if service is not found', function (done) {
        agent
            .delete('/api/services/222')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(404)
            .send()
            .end(function (err) {
              done(err);
            });
      });

      it('should delete the service', function (done) {
        storage.addService(VALID_SERVICE, function (err, id) {
          assert.ifError(err);
          agent
              .delete('/api/services/' + id)
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(200)
              .send()
              .end(function (err, res) {
                if (err) {
                  return done(err);
                }

                assert.equal(res.body.id, id);

                storage.getService(id, function (err, service) {
                  assert.ifError(err);
                  assert.equal(service, null);
                  done();
                });
              });
        });
      });

    });

    describe('with an authenticated normal user', function () {

      before(function (done) {
        agent.get('/login/test/2').expect(200, done);
      });

      it('should not have permissions', function (done) {
        storage.addService(VALID_SERVICE, function (err, id) {
          assert.ifError(err);
          agent
              .delete('/api/services/' + id)
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(401)
              .send()
              .end(function (err) {
                done(err);
              });
        });
      });
    });
  });

  describe('resetting a service', function () {

    describe('with an anonymous user', function () {

      before(function (done) {
        agent.get('/logout').expect(302, done);
      });

      it('should require auth', function (done) {
        agent
            .post('/api/services/222/reset')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(401)
            .send()
            .end(function (err) {
              done(err);
            });
      });
    });

    describe('with an authenticated admin user', function () {

      before(function (done) {
        agent.get('/login/test/1').expect(200, done);
      });

      it('should return 404 if service is not found', function (done) {
        agent
            .post('/api/services/222/reset')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(404)
            .send()
            .end(function (err) {
              done(err);
            });
      });

      it('should reset the service', function (done) {
        storage.addService(VALID_SERVICE, function (err, id) {
          assert.ifError(err);
          agent
              .post('/api/services/' + id + '/reset')
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(200)
              .send()
              .end(function (err, res) {
                assert.equal(res.body.id, id);
                done(err);
                // TODO: add a ping to the service, then make sure reset has deleted all ping data.
              });
        });
      });
    });

    describe('with a normal user', function () {

      before(function (done) {
        agent.get('/login/test/2').expect(200, done);
      });

      it('should not have permissions', function (done) {
        agent
            .post('/api/services/222/reset')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(401)
            .send()
            .end(function (err) {
              done(err);
            });
      });
    });

  });

  describe('loading a service', function () {

    describe('with an anonymous user', function () {

      before(function (done) {
        agent.get('/logout').expect(302, done);
      });

      it('should not require auth', function (done) {
        storage.addService(VALID_SERVICE, function (err, id) {
          assert.ifError(err);
          agent
              .get('/api/services/' + id)
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(200)
              .send()
              .end(function (err, res) {
                assert.equal(res.body.interval, VALID_SERVICE.interval);
                done(err);
              });
        });
      });

      it('should return 404 if the service does not exist', function (done) {
        agent
            .get('/api/services/22222')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(404)
            .send()
            .end(function (err) {
              done(err);
            });
      });
    });
  });

  describe('loading all services', function () {

    describe('with an anonymous user', function () {

      before(function (done) {
        agent.get('/logout').expect(302, done);
      });

      it('should not require auth', function (done) {
        storage.flush_database(function () {
          storage.addService(VALID_SERVICE, function (err, id) {
            assert.ifError(err);
            agent
                .get('/api/services')
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(200)
                .send()
                .end(function (err, res) {
                  assert.equal(res.body.length, 1);
                  assert.equal(res.body[0].interval, VALID_SERVICE.interval);
                  done(err);
                });
          });
        });
      });
    });
  });

});