var serialport = require('serialport');

function welleSerial(decoder, msgCallback, debug){
	this.decoder = decoder || null;
	this.msgCallback = msgCallback || null;
	this.connectedPort = null;
	this.reconnectTask = null;
    this.debug = true;
    if (debug === false){
        this.debug = false;
    }
};

welleSerial.prototype.setDebug = function(flag){
    if (flag === true){
        this.debug = true;
    }
    else if(flag === false){
        this.debug = false;
    }
}

welleSerial.prototype.isConnected = function(){
	if (this.connectedPort){
		return true;
	}
	else {
		return false;
	}
}

welleSerial.prototype.connectToDevice = function(openClb, closeClb, errorClb){
	var self = this;
	serialport.list(function (err, ports) {
        for (var i = 0; i < ports.length; i++) {
            var port = ports[i];
            var portManufacturer = port.manufacturer;
            var portName = port.comName;
            // console.log(JSON.stringify(port))
            if (portManufacturer && portManufacturer.indexOf("STMicroelectronics") >= 0 ) {
                var myPort = new serialport(portName, {
                    baudrate: 115200,
                    buffersize: 4096 * 10
                });
                self.registerPortFunctionality(myPort, openClb, closeClb, errorClb);
                return;
            }
        }
    });
}

welleSerial.prototype.registerPortFunctionality = function(port, openClb, closeClb, errorClb){
    var self = this;
    this.connectedPort = port;

    clearInterval(this.reconnectTask);
    this.reconnectTask = null;

    port.on('data', function(data) {
        if (self.debug){
            console.log('Recieving: ', self.buf2hex(data));
        }
        var ret = self.decoder.decode(data);
        if (ret){
            self.msgCallback && self.msgCallback(ret);
        }
    });

    port.on('open', function(){
    	self.flush();
    	if (openClb){
            openClb()
        }
        else {
            console.log('Port Open!');
        }
    });
    port.on('close', function(){
    	self.connectedPort = null;
    	self.periodicConnect(openClb, closeClb, errorClb);
    	if (closeClb){
            closeClb();
        }
        else {
            console.log('Port Close!');
        }
    });
    port.on('error', function(){
    	self.connectedPort = null;
    	self.periodicConnect(openClb, closeClb, errorClb);
    	if (errorClb){
            errorClb();
        }
        else {
            console.log('Port Close!');
        }
    });

}

welleSerial.prototype.periodicConnect = function(openClb, closeClb, errorClb){
	var self = this;
	if(!this.reconnectTask) {
		this.reconnectTask = setInterval(function(){
			self.connectToDevice(openClb, closeClb, errorClb);
			console.log("Search Welle COM Ports");
		}, 3000);
	}
}

welleSerial.prototype.flush = function(){
	if (this.connectedPort){
		this.connectedPort.flush(function() {
	        // console.log('Port flushed!');
	    });
	}
	else {
		console.log('No available port')
	}
	
}

welleSerial.prototype.write = function(data){
    var self = this;
	if (this.connectedPort){
        this.connectedPort.write(data, function(){
            if (self.debug){
                console.log('Writing: ', self.buf2hex(data));
            }
        })
    }
    else {
        console.log('No available port');
    }
}

welleSerial.prototype.toArrayBuffer = function(buf) {
    var view = new Uint8Array(buf.length);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return view;
}

welleSerial.prototype.buf2hex = function(buffer) {
  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

module.exports =  welleSerial;