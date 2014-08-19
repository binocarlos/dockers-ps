var EventEmitter = require('events').EventEmitter
var util = require('util')
var async = require('async')
var hyperquest = require('hyperquest')
var concat = require('concat-stream')

var psURL = '/containers/json?all=1'

function collectionKey(st, isName){
	return 'container:' + (isName ? '/' : '') + st
}

function blankCollection(){
	var ret = {
		names:{},
		shortids:{},
		ids:{}
	}
	return ret
}

function createCollection(backend, arr){
	var address = backend.docker
	var hostname = backend.hostname
	var ret = blankCollection()
	arr.forEach(function(proc){
		var shortId = proc.Id.substr(0,12)
		var procNames = proc.Names || []
		if(procNames.length>0){
			procNames.push(procNames[0] + '@' + hostname)
		}
		else{
			procNames.push(shortId + '@' + hostname)	
		}
		proc.Names = procNames
		procNames.forEach(function(name){
			ret.names[collectionKey(name)] = hostname
		})
		ret.ids[collectionKey(proc.Id)] = hostname
		ret.shortids[collectionKey(shortId)] = hostname
	})
	return ret
}

function mergeCollection(master, collection){
	Object.keys(collection.names || {}).forEach(function(key){
		master.names[key] = collection.names[key]
	})
	Object.keys(collection.shortids || {}).forEach(function(key){
		master.shortids[key] = collection.shortids[key]
	})
	Object.keys(collection.ids || {}).forEach(function(key){
		master.ids[key] = collection.ids[key]
	})
}

function searchCollection(collection, name){
	return collection.ids[collectionKey(name)] || collection.shortids[collectionKey(name)] || collection.names[collectionKey(name, true)]
}

function singleps(address, done){
	address = address.indexOf('http:')==0 ? address : 'http://' + address
	var req = hyperquest(address + psURL)
	.pipe(concat(function(result){
		result = result.toString()
		if(!result){
			result = '[]'
		}
		result = JSON.parse(result)
		done(null, result)
	}))
	req.on('error', done)
}

function ps(backends, done){
	async.map(backends, function(backend, next){
		singleps(backend.docker, next)
	}, function(err, multiarr){
		if(err) return done(err)
		var ret = []
		var collection = blankCollection()
		multiarr.forEach(function(arr, i){
			mergeCollection(collection, createCollection(backends[i], arr))
			ret = ret.concat(arr)
		})
		done(null, ret, collection)
	})
}

function getServerByHostname(servers, hostname){
	var backend = null
	servers.forEach(function(b){
		if(b.hostname==hostname){
			backend = b
		}
	})
	return backend
}

function getContainerServer(backends, id, done){
	ps(servers, function(err, result, collection){
		if(err){
			return done(err)
		}
		var hostname = searchCollection(collection, id)
		var backend = getServerByHostname(servers, hostname)
		if(!backend){
			return done()
		}
		done(null, backend)
	})
}

function DockersPS(inventoryfn){
	EventEmitter.call(this)
	if(!inventoryfn){
		throw new Error('dockers-ps needs an inventory function in its constructor')
	}
	this._inventoryfn = inventoryfn
}

util.inherits(DockersPS, EventEmitter)

DockersPS.prototype.ps = function(done){
	var self = this;
	self._inventoryfn(function(err, servers){
		if(err) return done(err)
		ps(servers, done)
	})
}

DockersPS.prototype.find = function(id, done){
	var self = this;
	self._inventoryfn(function(err, servers){
		if(err) return done(err)
		getContainerServer(servers, id, done)
	})
}

module.exports = function(inventoryfn){
	return new DockersPS(inventoryfn)
}