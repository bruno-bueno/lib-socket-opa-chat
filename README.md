# Socket Opa Chat

Biblioteca cliente para integração com o serviço de socket do Opa Chat.

## Instalação

### Instalação Local (Pacote .tgz)
Se você gerou o pacote localmente com `npm pack`, instale usando o caminho absoluto:

```bash
npm install "C:\caminho\para\socket-opa-chat-1.0.0.tgz"
```

## Inicialização

Importe e instancie a classe. Agora você também pode importar o Enum de eventos.

```javascript
const { SocketOpaChat, SocketOpaEvent } = require('socket-opa-chat');

const chat = new SocketOpaChat({
    url: 'https://giganet-sac.com.br', // Obrigatório: URL do servidor
    opa_token: 'SEU_TOKEN_AQUI',       // Obrigatório
    opa_user: 'ID_DO_USUARIO',         // Obrigatório
    opa_tipo: 'page'                   // Opcional (padrão: 'page')
});
```

## Enum de Eventos `SocketOpaEvent`

Para evitar usar strings soltas ("magic strings"), utilize o Enum exportado:

*   `SocketOpaEvent.CONNECTED`: 'connected'
*   `SocketOpaEvent.DISCONNECTED`: 'disconnected'
*   `SocketOpaEvent.ERROR`: 'error'
*   `SocketOpaEvent.MESSAGE`: 'message'
*   `SocketOpaEvent.CHAT_MESSAGE`: 'chat_message'
*   `SocketOpaEvent.CHAT_MEDIA`: 'chat_media'
*   `SocketOpaEvent.HISTORY_LOG`: 'history_log'
*   `SocketOpaEvent.RAW_EVENT`: 'raw_event'

## Métodos Disponíveis

### `connect()`
Estabelece a conexão com o socket.

```javascript
chat.connect();
```

### `sendMessage(texto)`
Envia uma mensagem de texto simples para o atendimento.
*   **texto**: `String` - O conteúdo da mensagem.

```javascript
chat.sendMessage("Olá, preciso de ajuda!");
```

### `sendMedia(fileData)`
Envia uma mídia (imagem, arquivo, etc) para o atendimento.
*   **fileData**: `Object` - Objeto contendo nome e dados do arquivo.
    *   `nomeArquivo`: `String` - Nome do arquivo (ex: "documento.pdf", "foto.png").
    *   `data`: `String` - Conteúdo do arquivo em Base64 (Data URL).

```javascript
chat.sendMedia({
    nomeArquivo: "contrato.pdf",
    data: "data:application/pdf;base64,JVBERi0xLjQKJ..."
});
```

### `getHistory()`
Solicita o histórico de mensagens do atendimento atual.
*   **Retorno**: O histórico não é retornado diretamente, mas sim emitido através do evento `history_log` (ou `SocketOpaEvent.HISTORY_LOG`).

```javascript
chat.getHistory();
```

### `endChat()`
Envia solicitação para encerrar o atendimento atual.

```javascript
chat.endChat();
```

### `disconnect()`
Desconecta manualmente o socket.

```javascript
chat.disconnect();
```

### `emitRaw(argsArray)`
Permite emitir um evento customizado "cru" (raw) para o servidor. Útil para eventos que não possuem método específico.
*   **argsArray**: `Array` - Um array contendo o nome do evento e argumentos. Ex: `["evento", "dado"]`.

```javascript
chat.emitRaw(["meu_evento", { id: 123 }]);
```

### `onMessage(callback)`
Helper simplificado para escutar o evento `message` em tempo real.
*   **callback**: `Function` - Função que recebe os argumentos da mensagem.

```javascript
chat.onMessage((...args) => {
    console.log('Mensagem em tempo real:', args);
});
```

## Eventos (Listeners)

A classe extende `EventEmitter`, então você pode escutar eventos usando `.on()`. Recomendamos usar o `SocketOpaEvent`.

### `chat_message` (`SocketOpaEvent.CHAT_MESSAGE`)
Disparado quando uma nova mensagem de texto é recebida do servidor.

```javascript
chat.on(SocketOpaEvent.CHAT_MESSAGE, (mensagem) => {
    console.log('Nova mensagem recebida:', mensagem);
});
```

### `chat_media` (`SocketOpaEvent.CHAT_MEDIA`)
Disparado quando uma mensagem de mídia (imagem/arquivo) é recebida. Fornece o objeto da mídia contendo link local, thumb, etc.

```javascript
chat.on(SocketOpaEvent.CHAT_MEDIA, (mediaObject) => {
    // mediaObject.local contém o caminho relativo da imagem
    console.log('Mídia recebida:', mediaObject.local);
});
```

### `history_log` (`SocketOpaEvent.HISTORY_LOG`)
Disparado após chamar `getHistory()`, contendo a lista (array) de mensagens antigas.

```javascript
chat.on(SocketOpaEvent.HISTORY_LOG, (listaMensagens) => {
    console.log('Histórico carregado:', listaMensagens);
});
```

### `connected` (`SocketOpaEvent.CONNECTED`)
Disparado quando a conexão é estabelecida com sucesso.

```javascript
chat.on(SocketOpaEvent.CONNECTED, (socketId) => {
    console.log('Conectado! ID do Socket:', socketId);
});
```

### `disconnected` (`SocketOpaEvent.DISCONNECTED`)
Disparado quando a conexão cai ou é fechada.

```javascript
chat.on(SocketOpaEvent.DISCONNECTED, (motivo) => {
    console.log('Desconectado:', motivo);
});
```

### `error` (`SocketOpaEvent.ERROR`)
Disparado em caso de erro de conexão.

```javascript
chat.on(SocketOpaEvent.ERROR, (erro) => {
    console.error('Erro de conexão:', erro);
});
```

### `raw_event` (`SocketOpaEvent.RAW_EVENT`)
Disparado para **qualquer** evento que chegar do socket. Útil para debug ou para tratar eventos que a lib não parseia automaticamente.

```javascript
chat.on(SocketOpaEvent.RAW_EVENT, (dados) => {
    // dados = { event: "nomeDoEvento", args: [...] }
    console.log('Evento Cru:', dados.event, dados.args);
});
```

## Exemplo Completo

```javascript
const { SocketOpaChat, SocketOpaEvent } = require('socket-opa-chat');

const chat = new SocketOpaChat({
    url: 'https://giganet-sac.com.br',
    opa_token: '6834a5e7d9539dc9558ce2f0',
    opa_user: 'usuario_teste_123'
});

// Configurar listeners
chat.on(SocketOpaEvent.CONNECTED, (id) => {
    console.log('Online:', id);
    // Pede histórico ao conectar
    chat.getHistory();
});

// Usando o novo helper simplificado para mensagens
chat.onMessage((msg) => console.log('BOT:', msg));

chat.on(SocketOpaEvent.HISTORY_LOG, (msgs) => console.log('Total histórico:', msgs.length));

// Conectar
chat.connect();

// Enviar msg após 2 segundos
setTimeout(() => {
    chat.sendMessage("Oi, teste de lib!");
}, 2000);
```


