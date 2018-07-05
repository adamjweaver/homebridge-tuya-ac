const tuya = require('tuyapi');
const debug = require('debug')('homebridge-tuya');

const TUYA_PROPERTY_CURRENT_TEMP = 3;
const TUYA_PROPERTY_MODE = 101;

const TUYA_AC_MODE_COOL = 1;
const TUYA_AC_MODE_HEAT = 2;
const TUYA_AC_MODE_DEHUMIDIFY = 3;
const TUYA_AC_MODE_FAN = 5;


module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-tuya-ac", "TuyaAC", TuyaAC);
}

function TuyaAC(log, config) {
  this.log = log;
  this.name = config.name;
  if (config.ip != undefined) {
    this.tuya = new tuya({type: 'ac', ip: config.ip, id: config.devId, key: config.localKey});
  }
  else {
    this.tuya = new tuya({type: 'ac', id: config.devId, key: config.localKey});
    this.tuya.resolveId();
  }

  this._service = new Service.HeaterCooler(this.name);
  this._service.getCharacteristic(Characteristic.Active)
            .on('get', this.getActive.bind(this))
            .on('set', this.setActive.bind(this));

            this._service.getCharacteristic(Characteristic.CurrentTemperature)
            .setProps({
                minValue: 0,
                maxValue: 30,
                minStep: 1
            })
            .on('get', this.getCurrentTemperature.bind(this));

  this._service.getCharacteristic(Characteristic.CurrentHeaterCoolerState)
  .on('get', this.getCurrentHeaterCoolerState.bind(this));

  this._service.getCharacteristic(Characteristic.TargetHeaterCoolerState)
  .on('get', this.getTargetHeaterCoolerState.bind(this))
  .on('set', this.setTargetHeaterCoolerState.bind(this));
}

TuyaAC.prototype.getActive = function (callback) {
  this.tuya.get().then(status => {
    if (status)  {
      callback(null, Characteristic.Active.ACTIVE);
    } else {
      callback(null, Characteristic.Active.INACTIVE);
    }
  });
}

TuyaAC.prototype.setActive = function (state, callback) {
  var bl = false;
  if (state == Characteristic.Active.ACTIVE) {
    bl = true;  
  } 
  this.tuya.set({set: bl}).then(() => {
    callback();
  });
}

TuyaAC.prototype.getCurrentTemperature = function (callback) {
  this.tuya.get({dps: TUYA_PROPERTY_CURRENT_TEMP}).then(temp => {
    callback(null, temp)
  });
}

TuyaAC.prototype.getCurrentHeaterCoolerState = function (callback) {
  
  this.tuya.get({dps: TUYA_PROPERTY_MODE}).then(mode => {
    if (mode == TUYA_AC_MODE_COOL) {
      callback(null, Characteristic.CurrentHeaterCoolerState.COOLING);
    } else if (mode == TUYA_AC_MODE_HEAT) {
      callback(null, Characteristic.CurrentHeaterCoolerState.HEATING);
    } else if (mode == TUYA_AC_MODE_FAN) {
      callback(null, Characteristic.CurrentHeaterCoolerState.IDLE);
    } else {
      callback(null, Characteristic.CurrentHeaterCoolerState.INACTIVE);
    }
  });

}

TuyaAC.prototype.getTargetHeaterCoolerState = function (callback) {
  
  this.tuya.get({dps: TUYA_PROPERTY_MODE}).then(mode => {
    if (mode == TUYA_AC_MODE_COOL) {
      callback(null, Characteristic.TargetHeaterCoolerState.COOL);
    } else if (mode == TUYA_AC_MODE_HEAT) {
      callback(null, Characteristic.TargetHeaterCoolerState.HEAT);
    } else if (mode == TUYA_AC_MODE_FAN) {
      callback(null, Characteristic.TargetHeaterCoolerState.AUTO);
    } else {
      callback(null, null);
    }
  });

}

TuyaAC.prototype.setTargetHeaterCoolerState = function (state, callback) {
  
  var targetMode = null;

  switch (state) {
    case Characteristic.TargetHeaterCoolerState.COOL:
        targetMode = TUYA_AC_MODE_COOL;
        break;
    case Characteristic.TargetHeaterCoolerState.HEAT:
        targetMode = TUYA_AC_MODE_HEAT;
        break;
    case Characteristic.TargetHeaterCoolerState.AUTO:
        targetMode = TUYA_AC_MODE_FAN;
        break;
}

  this.tuya.set({dps:TUYA_PROPERTY_MODE, set: targetMode}).then(() => {
    callback();
  });

}

// TuyaAC.prototype._setOn = function(on, callback) {
//   debug("Setting device to " + on);

//   this.tuya.set({set: on}).then(() => {
//     return callback(null, true);
//   }).catch(error => {
//     return callback(error, null);
//   });
// }

// TuyaAC.prototype._get = function(callback) {
//   debug("Getting device status...");
//   this.tuya.get().then(status => {
//     return callback(null, status);
//   }).catch(error => {
//     callback(error, null);
//   });
// }

TuyaAC.prototype.getServices = function() {
  return [this._service];
}

TuyaAC.prototype.identify = function (callback) {
  debug(this.name + " was identified.");
  callback();
};
