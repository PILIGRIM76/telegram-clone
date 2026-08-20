/**
 * Тесты для WebSocket логики
 */

const WebSocket = require('ws');
const http = require('http');

function создатьТестовыйСервер() {
    const express = require('express');
    const app = express();
    const server = http.createServer(app);
    const wss = new WebSocket.Server({ server });

    const пользователи = new Map();
    const группы = new Map();
    const офлайнСообщения = new Map();

    wss.on('connection', (ws, req) => {
        const uid = new URL(req.url, 'http://localhost').searchParams.get('uid');
        if (!uid || !пользователи.has(uid)) {
            ws.close();
            return;
        }

        const юзер = пользователи.get(uid);
        юзер.ws = ws;
        ws.uid = uid;

        if (офлайнСообщения.has(uid)) {
            офлайнСообщения.get(uid).forEach(с => ws.send(JSON.stringify(с)));
            офлайнСообщения.delete(uid);
        }

        ws.on('message', (данные) => {
            const msg = JSON.parse(данные);
            if (msg.кому) {
                const получатель = пользователи.get(msg.кому);
                if (получатель && получатель.ws && получатель.ws.readyState === WebSocket.OPEN) {
                    получатель.ws.send(JSON.stringify({ от: uid, ...msg }));
                } else {
                    if (!офлайнСообщения.has(msg.кому)) офлайнСообщения.set(msg.кому, []);
                    офлайнСообщения.get(msg.кому).push({ от: uid, ...msg });
                }
            } else if (msg.idГруппы) {
                const группа = группы.get(msg.idГруппы);
                if (группа) {
                    группа.участники.forEach(участникUid => {
                        if (участникUid !== uid) {
                            const участник = пользователи.get(участникUid);
                            if (участник && участник.ws && участник.ws.readyState === WebSocket.OPEN) {
                                участник.ws.send(JSON.stringify({ от: uid, ...msg }));
                            }
                        }
                    });
                }
            }
        });

        ws.on('close', () => {
            юзер.ws = null;
        });
    });

    return { server, wss, пользователи, группы, офлайнСообщения };
}

describe('WebSocket', () => {
    let testServer;
    let порт;
    let сервер;

    beforeAll((done) => {
        testServer = создатьТестовыйСервер();
        сервер = testServer.server;
        сервер.listen(0, () => {
            порт = сервер.address().port;
            done();
        });
    });

    afterAll((done) => {
        сервер.close(done);
    });
});