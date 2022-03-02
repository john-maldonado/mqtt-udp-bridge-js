const mqtt = require('mqtt');

// creating mqtt client
//const client  = mqtt.connect('mqtt://test.mosquitto.org');

const client = mqtt.connect('mqtts://b2c17fc672704678b04ea26cf0527305.s2.eu.hivemq.cloud', {
    port: 8883,
    username: 'labview-mqtt-bridge-js',
    password: 'svP5S4mERwx8wDR',
    rejectUnauthorized: false,
    clientId: 'labview-mqtt-bridge-js-C8308'
});


const udp = require('dgram');

// creating a udp server
const updServer = udp.createSocket('udp4');

client.on('connect', function () {
    console.log('MQTT Connected');
    client.subscribe('flat-mqtt/iMonnit/CDC/Shop/Temperature/#');
});

client.on('message', function (topic, message) {
    // message is Buffer
    console.log(message.toString());
    subs[topic] = message.toString();
    console.log(subs);
})

client.on('error', function (err) {
    console.log(err);
});

client.on('close', function (err) {
    console.log("MQTT Closed");
})

// emits when any error occurs
updServer.on('error', function (error) {
    console.log('Error: ' + error);
    updServer.close();
});

//emits when socket is ready and listening for datagram msgs
updServer.on('listening', function () {
    var address = updServer.address();
    var port = address.port;
    var family = address.family;
    var ipaddr = address.address;
    console.log('Server is listening at port ' + port);
    console.log('Server ip :' + ipaddr);
    console.log('Server is IP4/IP6 : ' + family);
});

//emits after the socket is closed using socket.close();
updServer.on('close', function () {
    console.log('Socket is closed !');
});

updServer.on('message', function (msg, info) {
    console.log(msg.toString());
    if (msg.toString() == 'close') {
        console.log('UDP Closing');
        client.end();
        updServer.close();
    };
    if (msg.toString() == 'get') {
        updServer.send(JSON.stringify(subs), 61559, 'localhost');
    };
});

var subs = {};

updServer.bind(61558);