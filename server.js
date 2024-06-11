const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const perguntas = JSON.parse(fs.readFileSync('perguntas.json', 'utf-8'));

app.use(express.static('public'));

let playerPontuacoes = {};
let playerPerguntas = {};

//MUITAS FUNÇOES WS UHUUL \O/ :O
wss.on('connection', (ws) => {
    console.log('Cliente conectado.');

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);

        if (parsedMessage.type === 'newPlayer') {
            const player = parsedMessage.player;
            if (!playerPontuacoes[player]) {
                playerPontuacoes[player] = 0;
                playerPerguntas[player] = new Set();
            }
            ws.playerName = player;
            enviarPergunta(ws, player);
            enviarPontuacoes();
        }

        if (parsedMessage.type === 'resposta') {
            const player = parsedMessage.player;
            const resposta = parsedMessage.data;
            const perguntaObj = perguntas.find(q => q.pergunta === parsedMessage.pergunta);
            const respostaCorreta = perguntaObj.resposta;

            if (resposta === respostaCorreta) {
                playerPontuacoes[player] += 1;
                ws.send(JSON.stringify({ type: 'result', data: 'correta' }));
            } else {
                ws.send(JSON.stringify({ type: 'result', data: 'errada' }));
            }

            playerPerguntas[player].add(parsedMessage.pergunta);

            enviarPontuacoes();

            if (playerPontuacoes[player] >= 6) {
                enviarFimDeJogo(player, true);
                setTimeout(resetGame, 10000);
            } else {
                const remainingQuestions = perguntas.filter(q => !playerPerguntas[player].has(q.pergunta));
                if (remainingQuestions.length === 0 && playerPontuacoes[player] < 6) {
                    enviarFimDeJogo(player, false);
                    setTimeout(resetGame, 10000);
                } else {
                    enviarPergunta(ws, player);
                }
            }
        }
    });

    ws.on('close', () => {
        console.log('Cliente desconectado.');
    });
});

function enviarPergunta(ws, player) {
    const pergunta = getRandomQuestion(player);
    ws.send(JSON.stringify({ type: 'question', data: pergunta }));
}

function enviarPontuacoes() {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'pontuação', data: playerPontuacoes }));
        }
    });
}

function getRandomQuestion(player) {
    const remainingQuestions = perguntas.filter(q => !playerPerguntas[player].has(q.pergunta));
    const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
    const pergunta = remainingQuestions[randomIndex];
    return {
        pergunta: pergunta.pergunta,
        alternativas: pergunta.alternativas
    };
}

function enviarFimDeJogo(player, venceu) {
    const maxPoints = Math.max(...Object.values(playerPontuacoes));
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            const clientPlayer = client.playerName;
            if (clientPlayer === player) {
                client.send(JSON.stringify({ type: 'end', data: venceu ? 'ganhador' : 'perdedor', venceu: venceu }));
            } else {
                client.send(JSON.stringify({ type: 'end', data: maxPoints === playerPontuacoes[clientPlayer] ? 'ganhador' : 'perdedor', venceu: maxPoints === playerPontuacoes[clientPlayer] }));
            }
        }
    });
}

function resetGame() {
    playerPontuacoes = {};
    playerPerguntas = {};
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'reset' }));
        }
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando. Porta: ${PORT}`);
});
