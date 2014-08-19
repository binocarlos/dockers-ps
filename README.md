dockers-ps
----------

get a list of containers that are running across multiple docker hosts

## install

```
$ npm install dockers-ps
```

## usage

```js
var dockersps = require('dockers-ps')

var servers = [{
	hostname:'node1',
	docker:'192.168.8.120:2375'
},{
	hostname:'node2',
	docker:'192.168.8.121:2375'
},{
	hostname:'node3',
	docker:'192.168.8.122:2375'
}]

// create a cluster by passing a function that will list our inventory of servers
var cluster = dockersps(function(done){
	done(null, servers)	
})

// get a list of containers running across all servers
cluster.ps(function(err, containers){
	// an extra name exists for each container - name@hostname	
})

// find what server a certain job is running on
cluster.search('jobname', function(err, server){
	// server is null if no job was found	
})
```

## api

#### `var cluster = dockersps(inventoryfn)`

Create a cluster by passing a function that will list our inventory.

The function has a signature of `function(done){}`

You call the done callback with an array of objects one per server.

Each server object has 2 important keys:

 * hostname - the hostname
 * docker - the IP:PORT of the docker server running on the host

#### `cluster.ps(function(err, list, collection){})`

Get an array of all containers running across the cluster

Each container has an extra name which is the original name of the container + '@hostname'

So - if we have a container named `test` running on `host3` - its extra name (as well as just 'test') would be:

```
test@host3
```

If the container has no name - the id will be used instead.

`collection` is an object that has the following keys:

 * names
 * shortids
 * ids

The keys of these objects are the names and ids of containers and the values are the hostnames of the server they are running on

There is another key of the collection:

 * servers

this maps the server hostname onto an array of containers running on that server

#### `cluster.find(id, function(err, server){})`

Find which server a container is running on - id can either be the container name or its id.

The server returned is the object from the inventory

## license

MIT