const { WebSocketServer } = require('ws');

class SocketService {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // bugUid -> Set of WebSocket connections
    }

    init(server) {
        this.wss = new WebSocketServer({ server });

        this.wss.on('connection', (ws, req) => {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const bugUid = url.searchParams.get('uid');

            if (bugUid) {
                if (!this.clients.has(bugUid)) {
                    this.clients.set(bugUid, new Set());
                }
                this.clients.get(bugUid).add(ws);

                ws.on('close', () => {
                    const bugClients = this.clients.get(bugUid);
                    if (bugClients) {
                        bugClients.delete(ws);
                        if (bugClients.size === 0) {
                            this.clients.delete(bugUid);
                        }
                    }
                });
            } else {
                ws.close(1008, 'Bug UID required');
            }
        });
    }

    sendUpdate(bugUid, data) {
        const bugClients = this.clients.get(bugUid);
        if (bugClients) {
            const message = JSON.stringify(data);
            bugClients.forEach(client => {
                if (client.readyState === 1) { // OPEN
                    client.send(message);
                }
            });
        }
    }
}

module.exports = new SocketService();
