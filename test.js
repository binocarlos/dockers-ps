var cp = require('child_process')
var dockerps = require('./')
var tape     = require('tape')
var async = require('async')

var allServers = [{
  hostname:'node1',
  docker:'192.168.8.120:2375'
},{
  hostname:'node2',
  docker:'192.168.8.121:2375'
},{
  hostname:'node3',
  docker:'192.168.8.122:2375'
}]


var cluster = dockerps(function(done){
  done(null, allServers)
})

var jobs = ['test.1', 'test.2', 'test.3']

function getTestCommand(name, server){
  return 'docker -H tcp://' + server + ' run --name ' + name + ' -d binocarlos/bring-a-ping --timeout 1000'
}

function runContainers(t, done){
  
  var counter = 0
  async.forEachSeries(jobs, function(job, nextJob){

    var server = allServers[counter]
    counter++

    var command = getTestCommand(job, server.docker)
    cp.exec(command, function(err, stdout, stderr){
      nextJob()
    })
    
  }, function(err){
    if(err) return done(err)
    done()
  })
}

function killContainers(t, done){
  var counter = 0
  async.forEachSeries(jobs, function(job, nextJob){
    var server = allServers[counter]
    counter++
    cp.exec('docker -H tcp://' + server.docker + ' stop ' + job, function(){
      cp.exec('docker -H tcp://' + server.docker + ' rm ' + job, function(){
        nextJob()
      })
    })
  }, function(){
    done()
  })
}

tape('start containers', function(t){
  runContainers(t, function(){
    t.end()
  })
})

tape('ps should list all containers', function(t){
  cluster.ps(function(err, list){

    var nameshit = {}
    var servernameshit = {}

    list.forEach(function(job){
      nameshit[job.Names[0]] = true
      servernameshit[job.Names[1]] = true
    })

    t.ok(nameshit['/test.1'], 'test 1')
    t.ok(nameshit['/test.2'], 'test 2')
    t.ok(nameshit['/test.3'], 'test 3')
    t.ok(servernameshit['/test.1@node1'], 'test1@node1')
    t.ok(servernameshit['/test.2@node2'], 'test2@node2')
    t.ok(servernameshit['/test.3@node3'], 'test3@node3')
    t.end()
  })
})


tape('find containers', function(t){

  var correct = {
    'test.1':'node1',
    'test.2':'node2',
    'test.3':'node3'
  }
  async.forEachSeries(jobs, function(job, nextJob){
    cluster.find(job, function(err, server){
      if(!server){
        err = 'no server'
      }
      if(err){
        t.fail(err, 'server find')
        t.end()
        return
      }
      t.equal(server.hostname, correct[job], job + ' = ' + server.hostname)
      nextJob()
    })
  }, function(err){
    if(err){
      t.fail(err, 'find containers')
      t.end()
      return
    }
    t.end()
  })
  
})

function findName(jobs, name){
  var hit = false
  jobs.forEach(function(job){
    job.Names.forEach(function(name){
      if(name==name){
        hit = true
      }
    })
  })
  return hit
}

tape('collection has server to containers map', function(t){
  cluster.ps(function(err, list, collection){
    
    t.ok(collection.servers, 'has a servers property in the collection')

    t.ok(collection.servers.node1, 'node 1 is there')
    t.ok(collection.servers.node2, 'node 2 is there')
    t.ok(collection.servers.node3, 'node 3 is there')

    t.ok(findName(collection.servers.node1.jobs, '/test.1'), 'test 1 is on node1')
    t.ok(findName(collection.servers.node2.jobs, '/test.2'), 'test 2 is on node2')
    t.ok(findName(collection.servers.node3.jobs, '/test.3'), 'test 3 is on node3')

    t.equal(collection.servers.node1.hostname, 'node1', 'node1 hostname')
    t.equal(collection.servers.node2.hostname, 'node2', 'node2 hostname')
    t.equal(collection.servers.node3.hostname, 'node3', 'node3 hostname')

    t.equal(collection.servers.node1.docker, '192.168.8.120:2375', 'node1 docker')
    t.equal(collection.servers.node2.docker, '192.168.8.121:2375', 'node2 docker')
    t.equal(collection.servers.node3.docker, '192.168.8.122:2375', 'node3 docker')
    
    t.end()
  })
})


tape('stop containers', function(t){
  killContainers(t, function(){
    t.end()
  })
})