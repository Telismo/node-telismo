var version = 0.5;
var ddp_server = "telismo.com";
var ddp_port = 3000;
var DDPClient = require("ddp");
var debug_mode = false;

var Telismo_instance = function(apiKey) {

	var self = this;

	var Telismo_DDP = new DDPClient({
	  host: ddp_server, 
	  port: ddp_port,
	  auto_reconnect: true,
	  auto_reconnect_timer: 500,
	  use_ejson: true
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
					callback(null, result.data);
				}
			}	
		});

	}

	this._cancel = function(id, callback) {
		Telismo_DDP.call("api/cancel", [apiKey, {id: id}], function(err,result) {
			if(result && result.success == true) {
				callback(null, result);
			}else{
				callback(result);
			}
		});

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

	this.cancel = function(params, callback) {
		var queued = function() {
			self._cancel(params, callback);
		}

		if(connected) {
			queued();
		}else{
			self._enqueue(queued);
		}
	}

	this.callback = function(callData) {

	}

	return this;
}

var Telismo = function(apiKey) {
	return new Telismo_instance(apiKey);
}

module.exports = Telismo;