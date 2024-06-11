document.addEventListener('DOMContentLoaded', (event) => {
    const perguntaDiv = document.getElementById('pergunta');
    const alternativasDiv = document.getElementById('alternativas');
    const pontuacaoDiv = document.getElementById('pontuação');
    const messageDiv = document.getElementById('message');
    const messageContainer = document.getElementById('message-container');
    const nameFormContainer = document.getElementById('name-form-container');
    const chatContainer = document.getElementById('chat-container');
    let playerName = null;

    const nameForm = document.getElementById('name-form');

    nameForm.addEventListener('submit', (event) => {
        event.preventDefault();

        playerName = document.getElementById('player-name').value;

        if (playerName.trim() === '') {
            alert('Por favor, informe seu Nick.');
            return;
        }
        //SEM PERGUNTAS ATÉ QUE O CABA INFORME O NOME
        nameFormContainer.classList.add('hidden');
        chatContainer.style.display = 'flex';

        const socket = new WebSocket('ws://localhost:3000');

        socket.addEventListener('open', (event) => {
            console.log('Conectado.');
            socket.send(JSON.stringify({ type: 'newPlayer', player: playerName }));
        });

        socket.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            console.log('Mensagem do servidor:', message);

            if (message.type === 'question') {
                displayQuestion(message.data);
            } else if (message.type === 'result') {
                showMessage(message.data === 'correta' ? 'CORRETO!' : 'Resposta ERRADA.', message.data);
            } else if (message.type === 'pontuação') {
                updatePontuacao(message.data);
            } else if (message.type === 'end') {
                if (message.data === 'ganhador') {
                    mensagemVencedor();
                } else if (message.data === 'perdedor') {
                    mensagemPerdedor();
                }
                setTimeout(() => location.reload(), 10000);
            } else if (message.type === 'reset') {
                location.reload();
            }
        });

        function displayQuestion(perguntaData) {
            perguntaDiv.textContent = perguntaData.pergunta;
            alternativasDiv.innerHTML = '';

            perguntaData.alternativas.forEach(alternativa => {
                const alternativaDiv = document.createElement('div');
                alternativaDiv.className = 'alternativa';
                alternativaDiv.textContent = alternativa;
                alternativaDiv.addEventListener('click', () => sendResposta(perguntaData.pergunta, alternativa));
                alternativasDiv.appendChild(alternativaDiv);
            });
        }

        function sendResposta(pergunta, resposta) {
            const message = {
                type: 'resposta',
                player: playerName,
                pergunta: pergunta,
                data: resposta
            };
            socket.send(JSON.stringify(message));
        }

        function updatePontuacao(pontuacoes) {
            pontuacaoDiv.innerHTML = '';
            for (const player in pontuacoes) {
                const playerScoreDiv = document.createElement('div');
                playerScoreDiv.textContent = `${player}: ${pontuacoes[player]}`;
                pontuacaoDiv.appendChild(playerScoreDiv);
            }
        }
        //COMPARADOR
        function showMessage(messageText, messageType) {
            messageDiv.textContent = messageText;
            messageDiv.classList.remove('correta', 'errada', 'ganhador', 'perdedor');
            if (messageType === 'correta') {
                messageDiv.classList.add('correta');
            } else if (messageType === 'errada') {
                messageDiv.classList.add('errada');
            }
            messageContainer.style.display = 'flex';
        }
        //VENCEU NA VIDA
        function mensagemVencedor() {
            messageDiv.textContent = 'Você ganhou!';
            messageDiv.classList.remove('correta', 'errada');
            messageDiv.classList.add('ganhador');
            messageContainer.style.display = 'flex';
            setTimeout(() => location.reload(), 10000);
        }
        //FEZ O L
        function mensagemPerdedor() {
            messageDiv.textContent = 'Voce perdeu..';
            messageDiv.classList.remove('correta', 'errada');
            messageDiv.classList.add('perdedor');
            messageContainer.style.display = 'flex';
            setTimeout(() => location.reload(), 10000);
        }
    });
});
