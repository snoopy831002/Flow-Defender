var fs = require("fs");
var http = require('http');

var keys = 'inputifindex,ethernetprotocol,ipprotocol,ipsource';
var value = 'frames';
var filter = 'outputifindex!=discard';
var thresholdValue = 2;
var metricName = 'ddos';

// mininet mapping between sFlow ifIndex numbers and switch/port names
var ifindexToPort = {};
var nameToPort = {};
var path = '/sys/devices/virtual/net/';
var devs = fs.readdirSync(path); //read local files
for(var i = 0; i < devs.length; i++) {
  var dev = devs[i];
  var parts = dev.match(/(.*)-(.*)/);
  if(!parts) continue;
  var ifindex = fs.readFileSync(path + dev + '/ifindex');
  var port = {"switch":parts[1],"port":dev};
  ifindexToPort[parseInt(ifindex).toString()] = port;
  nameToPort[dev] = port;
}

var fl = { hostname: 'localhost', port: 8080 };
var groups = {'external':['0.0.0.0/0'],'internal':['10.0.0.4/32']};
var rt = { hostname: 'localhost', port: 8008 };
var flows = {'keys':keys,'value':value,'filter':filter};
var threshold = {'metric':metricName,'value':thresholdValue};

function extend(destination, source) {
  for (var property in source) {
    if (source.hasOwnProperty(property)) {
      destination[property] = source[property];
    }
  }
  return destination;
}

function jsonGet(target,path,callback) {
  var options = extend({method:'GET',path:path},target);
  var req = http.request(options,function(resp) {
    var chunks = [];
    resp.on('data', function(chunk) { chunks.push(chunk); });
    resp.on('end', function() { callback(JSON.parse(chunks.join(''))); });
  });
  req.end();
};

function jsonPut(target,path,value,callback) {
  var options = extend({method:'PUT',headers:{'content-type':'application/json'},path:path},target);
  var req = http.request(options,function(resp) {
    var chunks = [];
    resp.on('data', function(chunk) { chunks.push(chunk); });
    resp.on('end', function() { callback(chunks.join('')); });
  });
  req.write(JSON.stringify(value));
  req.end();
};

function jsonPost(target,path,value,callback) {
  var options = extend({method:'POST',headers:{'content-type':'application/json'},"path":path},target);
  var req = http.request(options,function(resp) {
    var chunks = [];
    resp.on('data', function(chunk) { chunks.push(chunk); });
    resp.on('end', function() { callback(chunks.join('')); });
  });
  req.write(JSON.stringify(value));
  req.end();
}

function jsonDelete(target,path,value,callback) {
  var options = extend({method:'DELETE',headers:{'content-type':'application/json'},"path":path},target);
  var req = http.request(options,function(resp) {
    var chunks = [];
    resp.on('data', function(chunk) { chunks.push(chunk); });
    resp.on('end', function() { callback(chunks.join('')); });
  });
  req.write(JSON.stringify(value));
  req.end();
}

function lookupOpenFlowPort(agent,ifIndex) {
  return ifindexToPort[ifIndex];
}

function blockFlow(agent,dataSource,topKey) {
  console.log('blockFlow');
  var parts = topKey.split(',');
  var port = lookupOpenFlowPort(agent,parts[0]);
  if(!port || !port.dpid) return;
  var message = {"switch":port.dpid,
                 "name":"dos-1",
                 "in-port":port.portNumber.toString,
                 "eth_type":parts[1],
                 "ip_proto":parts[2],
                 "ipv4_src":parts[3],
                 "priority":"32767",
                 "active":"true"};
  console.log("message=" + JSON.stringify(message));
  jsonPost(fl,'/wm/staticflowpusher/json',message,
      function(response) {
         console.log("result=" + JSON.stringify(response));
      });
  
}

function getTopFlows(event) {
  console.log('getTopFlows');
  jsonGet(rt,'/metric/' + event.agent + '/' + event.dataSource + '.' + event.metric + '/json',
    function(metrics) {
      if(metrics && metrics.length == 1) {
        var metric = metrics[0];
        if(metric.metricValue > thresholdValue
           && metric.topKeys
           && metric.topKeys.length > 0) {
            var topKey = metric.topKeys[0].key;
            blockFlow(event.agent,event.dataSource,topKey);
        }
      }
    }
  );  
}

function getEvents(id) {
  console.log('getEvents');
  jsonGet(rt,'/events/json?maxEvents=10&timeout=60&eventID='+ id,
    function(events) {
      var nextID = id;
      if(events.length > 0) {
        nextID = events[0].eventID;
        events.reverse();
        for(var i = 0; i < events.length; i++) {
          if(metricName == events[i].thresholdID) getTopFlows(events[i]);
        }
      }
      getEvents(nextID);  
    }
  );
}

// use port names to link dpid and port numbers from Floodlight
function getSwitches() {
  console.log('getSwitches');
  jsonGet(fl,'/wm/core/switch/all/port-desc/json',
    function(switches) { 
      var dpids = Object.keys(switches);
      for(var i = 0; i < dpids.length; i++) {
        var sw = switches[dpids[i]];
        var ports = sw['port_desc'];
        for(var j = 0; j < ports.length; j++) {
          var port = nameToPort[ports[j].name];
          if(port) {
            port.dpid = dpids[i];
            port.portNumber = ports[j].port_number;
          }
        }
        setGroup();
      }
      
    }
  );
}

function setGroup() {
  console.log('setGroup');
  jsonPut(rt,'/group/json',
    groups,
    function() { setFlows(); }
  );
}

function setFlows() {
  console.log('setFlows');
  jsonPut(rt,'/flow/' + metricName + '/json',
    flows,
    function() { setThreshold(); }
  );
}

function setThreshold() {
  console.log('setThreshold');
  jsonPut(rt,'/threshold/' + metricName + '/json',
    threshold,
    function() { getEvents(-1); }
  ); 
}

function initialize() {
  getSwitches();
}

initialize();