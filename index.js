var service = require('./lib/service'),
    joi = require('joi'),
    schema = require('./lib/schema'),
    routes = require('./lib/routes'),
    config = {};

exports.register = function(server, options, next){
  config = options;
  var validation = joi.validate(options, schema)

  if(validation.error){
    var err = new Error("config validation error")
    err.inner = validation.error
    return next(err);
  }

  server.log(["discovery"], "registering discovery routes");
  server.route(routes(config));

  server.expose({
    announce: service.announce,
    unannounce: service.unannounce,
    find: service.find,
    findAll: service.findAll
  });

  if(config.gracefulShutdown){
    server.dependency('hapi-shutdown', function(_, done){
      var err = server.plugins['hapi-shutdown'].register({
        taskname: 'discovery-unannounce',
        task: function(){
          service.unannounce(function(){});
          // don't call done because we need to wait for the timeout
        },
        timeout: config.waitOnShutdown || 30 * 1000
      });

      done(err);
    });
  }

  service.init(server, config, function(){
    next();
  });
};

exports.register.attributes = {
  pkg: require('./package.json')
};
