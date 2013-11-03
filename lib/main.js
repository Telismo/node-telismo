var version = 0.5;

var DDPClient = require("ddp");

var Telismo_DDP = new DDPClient({
  host: "localhost", 
  port: 3000,
  /* optional: */
  auto_reconnect: true,
  auto_reconnect_timer: 500,
  use_ejson: true  // default is false
});

Telismo_DDP.connect(function(error) {
  if (error) {
    console.log('Cannot connect to Telismo Server!');
    return;
  }

  console.log('Connected to Telismo Server');

  Telismo_DDP.subscribe('api', [], function() {
    console.log('Ready:');
    console.log(Telismo_DDP.collections.calls);
  });
});

var _callbacks = [];

Telismo = function(apiKey) {
	var self = this;

	Telismo_DDP.call("api/login", apiKey);

	// callbackHandle = CallDocs.find().observe({
	// 	added: function (document) {
	// 		if(!callbackHandle) return;
	// 		console.log(document);
	// 		if(document._id in _callbacks) {
	// 			var callback = _callbacks[document._id];
	// 			if(document.error) {
	// 				if(callback) callback({errors: document.error, status: document.status});
	// 			}else{
	// 				if(callback) callback(null, document.output);
	// 			}
	// 		}
	// 		else {
	// 			if(document.error) {
	// 				if(self.callback) self.callback({errors: document.error, status: document.status});
	// 			}else{
	// 				if(self.callback) self.callback(null, document);
	// 			}
	// 		}
	// 	}
	// });

	this.call = function(params, callback) {
		var result = Telismo_DDP.call("api/new", apiKey, params);
		if(result && result.success == true) {
			if(result.id instanceof Array) {
				for(var i = 0; i<result.id.length; i++) {
					_callbacks[result.id] = callback
				}
			}else{
				_callbacks[result.id] = callback;
			}
		}
		return result.id;
	}

	this.list = function() {
		var result = Telismo_DDP.call("api/list", apiKey, params);
		if(result && result.success == true) {
			return result; 
		}
		return [];
	}

	this.calls = function() {
		return CallDocs;
	}

	this.callback = function(callData) {

	}

	return this;
}

module.exports = Telismo;