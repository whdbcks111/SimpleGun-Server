const net = require('net');

let clients = {};

let server = net.createServer(function (client) {
    console.log('connection : %s', client.remoteAddress);
    let uuid = createNewUUID();
    send(client, 'UUID', uuid);
    clients[uuid] = client;
    sendAllExcept(client, 'NEW_PLAYER', uuid);

    client.on('data', data => {
        let spl = data.toString().split(' ');
        let type = spl[0];
        let msg = spl.slice(1).join(' ');
        processPacket(client, uuid, type, msg);
    });

    client.on('end', () => {
        deletePlayer(uuid);
    });

    client.on('timeout', () => {
        deletePlayer(uuid);
        client.end();
    });

    client.on('error', err => {
        deletePlayer(uuid);
        client.end();
    });
});

function processPacket(client, uuid, type, msg) {
    switch(type) {
        case 'POSITION':
            sendAllExcept(client, 'POSITION', uuid + ' ' + msg);
            break;
        case 'SHOOT':
            sendAllExcept(client, 'SHOOT', uuid + ' ' + msg);
            break;
        case 'HP_CHANGED':
            sendAllExcept(client, 'HP_CHANGED', uuid + ' ' + msg);
            break;
    }
}

function send(client, type, msg) {
    let dataBytes = new TextEncoder().encode(type + ' ' + msg);
    let lengthBytes = new Uint8Array([dataBytes.byteLength]);
    client.write(mergeBytes(lengthBytes, dataBytes));
}

function sendAll(type, msg) {
    Object.keys(clients).forEach(uuid => {
        send(clients[uuid], type, msg);
    });
}

function sendAllExcept(client, type, msg) {
    Object.keys(clients).forEach(uuid => {
        if(clients[uuid] === client || uuid === client) return;
        send(clients[uuid], type, msg);
    });
}

function mergeBytes(bytes1, bytes2) {
    let merged = new Uint8Array(bytes1.length + bytes2.length);
    merged.set(bytes1);
    merged.set(bytes2, bytes1.length);
    return merged;
}

function createNewUUID() {
    let uuid;
    do {
        uuid = new Array(10).fill(0).map(_ => Math.floor(Math.random() * 36).toString(36).toUpperCase()).join('');
    }
    while(clients[uuid]);
    return uuid;
}

function deletePlayer(uuid) {
    console.log('connection error : %s', clients[uuid].remoteAddress);
    delete clients[uuid];
    sendAll('DELETE_PLAYER', uuid);
}

server.listen(5050, () => {
    console.log('server listening on : ' + JSON.stringify(server.address()));

    server.on('close', () => {
        console.log('server closed');
    });

    server.on('error', err => {
        console.error(err);
    });
});

process.on('uncaughtException', err => {
    console.error(err);
});