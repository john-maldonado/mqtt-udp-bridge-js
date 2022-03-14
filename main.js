// Require dotenv and read settings from local .env file
require('dotenv').config()

// Get hostname to create unique but human readable clientID
var os = require("os");
var hostname = os.hostname();

// Require FS to read passed connection file
const fs = require('fs');

// Require MQTT to create client to connect to MQTT Broker
const mqtt = require('mqtt');

// Require dgram to create local UDP server to brige MQTT data to app
const udp = require('dgram');

// Read MQTT Settings
const mqttSettingsPath = './mqtt_settings.json';
let mqttSettings = JSON.parse(fs.readFileSync(mqttSettingsPath));
mqttSettings.username = process.env.MQTT_UNAME;
mqttSettings.password = process.env.MQTT_PWORD;
mqttSettings.clientId = `${hostname}-mqtt-udp-brige-js`;

// Read UDP Settings
const udpSettingsPath = './udp_settings.json';
let udpSettings = JSON.parse(fs.readFileSync(udpSettingsPath));

// Read MQTT Subscription
const subscriptionsPath = './subscriptions.json';
let subscriptions = JSON.parse(fs.readFileSync(subscriptionsPath));

// Track first call of connect event
let connectFirstCall = true;

// Create empty subscriptionData object
let subscriptionData = {};

// Create MQTT client and connect
const client = mqtt.connect(mqttSettings.address, mqttSettings);

// Define MQTT Connect Callback
client.on('connect', function () {
    // When MQTT connects
    console.log('MQTT Connected');

    // Subscribe to topics if listed in connect.json
    if (subscriptions) {
        subscriptions.forEach(subscription => {
            client.subscribe(subscription);
        });
    };
    
    // On first connect event
    if (connectFirstCall) {
        // Bind UPD server and start listening
        updServer.bind({
            address: udpSettings.serverAddress,
            port: udpSettings.serverPort,
            exclusive: udpSettings.exclusive
        });
    };

    // Set first call to false
    connectFirstCall = false;
});

// Define MQTT Message Callback
client.on('message', function (topic, message) {
    // message is Buffer
    console.log(message.toString());
    subscriptionData[topic] = message.toString();
    console.log(subscriptionData);
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
    if ('clientPort' in udpSettings) {
        updServer.send('READY', udpSettings.clientPort, udpSettings.clientAddress);
    };
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

    // Handle status request
    if (msg.toString() == 'STATUS') {
        var udpStatus = true;
        var mqttStatus = true;
        var statusMsg = {
            udp: udpStatus,
            mqtt: mqttStatus
        };
        updServer.send(JSON.stringify(statusMsg), info.port, info.address);
    };

    // Handle close request
    if (msg.toString() == 'CLOSE') {
        console.log('UDP Closing');
        client.end();
        updServer.close();
    };

    // Handle get request
    if (msg.toString() == 'GET') {
        updServer.send(JSON.stringify(subscriptionData), info.port, info.address);
    };
});