var version = 0.5;
var ddp_server = "telismo.com";
var DDPClient = require("ddp");
var debug_mode = false;

var Telismo_instance = function(apiKey) {

	var self = this;
	var Telismo_DDP = new DDPClient({
	  host: ddp_server, 
	  port: 443,
	  auto_reconnect: true,
	  auto_reconnect_timer: 500,
	  use_ejson: true,
	  use_ssl: true,
      use_ssl_strict: false
	});

	var connected = false;
	var _opsqueue = [];
	var api_ok = false;

	Telismo_DDP.connect(function(error) {
		if (error) {
			if(debug_mode) console.log('Cannot connect to Telismo Server!');
			return;
		}

		Telismo_DDP.call("api/login", [apiKey], function(err,result) {
			api_ok = true;
		});

		if(debug_mode) console.log('Connected to Telismo Server');

		Telismo_DDP.subscribe('api', [], function() {
			if(debug_mode) console.log('Ready. When you are ready to end the session please use ctrl+c');
		});

		connected = true;

		//Run Queued Tasks
		for(var i = 0; i < _opsqueue.length; i++) {
			_opsqueue[i]();
			delete _opsqueue[i];
		}
	});

	var _callbacks = [];

	Telismo_DDP.on('socket-close', function(code, message) {
		connected = false;
		console.log("Close: %s %s", code, message);
	});

	Telismo_DDP.on('socket-error', function(error) {
	  console.log("Error: %j", error);
	  console.log(error);
	});
	
	Telismo_DDP.on('message', function(msg) {
		var JSONMessage = JSON.parse(msg);
		if(JSONMessage.msg == "added" && JSONMessage.collection == "calls") {
			var doc = JSONMessage.fields;
			doc._id = JSONMessage.id;

			if(doc._id in _callbacks) {
				var callback = _callbacks[doc._id];
				if(doc.error) {
					if(callback) callback({errors: doc.error, status: doc.status});
				}else{
					if(callback) callback(null, doc.output);
				}
			}
			else {
				if(doc.error) {
					if(self.callback) self.callback({errors: doc.error, status: doc.status});
				}else{
					if(self.callback) self.callback(null, doc);
				}
			}

		}
	});

	this._enqueue = function(method) {
		_opsqueue.push(method);
	}

	this._call = function(params, callback) {
		Telismo_DDP.call("api/new", [apiKey, params], function(err,result) {
			if(result && result.success == true) {
				if(result.id instanceof Array) {
					for(var i = 0; i<result.id.length; i++) {
						_callbacks[result.id] = callback
					}
				}else{
					_callbacks[result.id] = callback;
				}
			}else{
				if(result && result.test) {
					callback(null, result);
				}
			}	
		});

	}

	this._cancel = function(id, callback) {
		console.log("Cancel Task");
		Telismo_DDP.call("api/cancel", [apiKey, id], function(err,result) {
			console.log(err,result);
			if(result && result.success == true) {
				callback(null, result);
			}else{
				callback(result);
			}
		});

	}

	this.cancel = function(id, callback) {
		var queued = function() {
			self._cancel(id, callback);
		}

		if(connected) {
			queued();
		}else{
			self._enqueue(queued);
		}
	}

	this.call = function(params, callback) {
		var queued = function() {
			self._call(params, callback);
		}

		if(connected) {
			queued();
		}else{
			self._enqueue(queued);
		}
	}

	this.quote = function(params, callback) {
		var queued = function() {
			self._quote(params, callback);
		}

		if(connected) {
			queued();
		}else{
			self._enqueue(queued);
		}
	}

	this._quote = function(params, callback) {
		Telismo_DDP.call("api/quote", [apiKey, params], function(err,result) {
			if(result && result.success == true) {
				callback(null, result);
			}else{
				if(err) {
					callback(err, null);
				}else{
					callback(result, null);
				}
			}
		});
	}

	this.list = function(params, callback) {
		var queued = function() {
			self._list(params, callback);
		}

		if(connected) {
			queued();
		}else{
			self._enqueue(queued);
		}
	}

	this._list = function(params, callback) {
		Telismo_DDP.call("api/list", [apiKey, params], function(err,result) {
			if(err) {
				callback(err, null);
			}else{
				if(result) {
					callback(null, result);
				}else{
					callback({error: ["Authentication Failed. Please make sure your API key is correct"], code: 403}, null);
				}
			}
		});
	}

	this.getBalance = function(callback) {
		var queued = function() {
			self._getBalance(callback);
		}

		if(connected) {
			queued();
		}else{
			self._enqueue(queued);
		}
	}

	this._getBalance = function(callback) {
		Telismo_DDP.call("api/balance", [apiKey], function(err,result) {
			if(err) {
				callback(err, null);
			}else{
				if(result) {
					callback(null, result);
				}else{
					callback({error: ["Authentication Failed. Please make sure your API key is correct"], code: 403}, null);
				}
			}
		});
	}



	this.calls = function() {
		return CallDocs;
	}

	this.callback = function(callData) {

	}

	return this;
}

var Telismo = function(apiKey, options) {
	if(options) {
		debug_mode = ('debug_mode' in options) ? options.debug_mode : false; 
	}
	return new Telismo_instance(apiKey);
}

module.exports = Telismo;
