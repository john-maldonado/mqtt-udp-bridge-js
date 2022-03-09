// Require FS to read passed connection file
const fs = require('fs');

// Require MQTT to create client to connect to MQTT Broker
const mqtt = require('mqtt');

// Require dgram to create local UDP server to brige MQTT data to app
const udp = require('dgram');

// Get connection file argument
const args = process.argv.splice(2);
const connectionFilePath = args[0];

// Read connection file
let connection = JSON.parse(fs.readFileSync(connectionFilePath));
//console.log(connection);

// Create MQTT client and connect
const client = mqtt.connect(connection.mqtt.address, {
    port: connection.mqtt.port,
    username: connection.mqtt.username,
    password: connection.mqtt.password,
    rejectUnauthorized: connection.mqtt.rejectUnauthorized,
    clientId: connection.mqtt.clientId
});

// Define MQTT Connect Callback
client.on('connect', function () {
    // When MQTT connects
    console.log('MQTT Connected');
    // Subscribe to topics
    connection.mqtt.subscriptions.forEach(subscription => {
        client.subscribe(subscription);
    });
});

// Define MQTT Message Callback
client.on('message', function (topic, message) {
    // message is Buffer
    console.log(message.toString());
    subs[topic] = message.toString();
    console.log(subs);
})

// Define MQTT Error Callback
client.on('error', function (err) {
    console.log(err);
});

// Define MQTT Close Callback
client.on('close', function (err) {
    console.log("MQTT Closed");
})

// Create UDP server
const updServer = udp.createSocket('udp4');

// Define UDP Error Callback
updServer.on('error', function (error) {
    console.log('Error: ' + error);
    updServer.close();
});

// Define UDP Listening Callback
updServer.on('listening', function () {
    var address = updServer.address();
    var port = address.port;
    var family = address.family;
    var ipaddr = address.address;
    console.log('Server is listening at port ' + port);
    console.log('Server ip :' + ipaddr);
    console.log('Server is IP4/IP6 : ' + family);
});

// Define UDP Close Callback
updServer.on('close', function () {
    console.log('Socket is closed !');
});

// Define UDP Message Callback
updServer.on('message', function (msg, info) {
    console.log("UDP message recieved.");
    console.log("Address: " + info.address);
    console.log("Family: " + info.family);
    console.log("Port: " + info.port);
    console.log(msg.toString());
    if (msg.toString() == 'close') {
        console.log('UDP Closing');
        client.end();
        updServer.close();
    };
    if (msg.toString() == 'get') {
        updServer.send(JSON.stringify("subs"), info.port, info.address);
    };
});

// Create empy subs object
var subs = {};

// Bind UPD server and start listening
updServer.bind({
    address: connection.udp.address,
    port: connection.udp.port,
    exclusive: connection.udp.exclusive
});