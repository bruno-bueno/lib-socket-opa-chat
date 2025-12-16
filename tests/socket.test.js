const SocketOpaChat = require('../index');
const io = require('socket.io-client');

// Mock socket.io-client module
jest.mock('socket.io-client');

describe('SocketOpaChat Lib', () => {
    let chat;
    let mockSocket;

    const config = {
        url: 'http://teste-giga.com',
        opa_token: 'token-teste',
        opa_user: 'user-teste',
        opa_tipo: 'page'
    };

    beforeEach(() => {
        // Reset mocks before each test
        mockSocket = {
            on: jest.fn(),
            emit: jest.fn(),
            disconnect: jest.fn(),
            connected: false,
            onAny: jest.fn()
        };

        io.mockReturnValue(mockSocket);

        chat = new SocketOpaChat(config);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // --- Initialization Tests ---

    test('should initialize with provided configuration', () => {
        expect(chat.url).toBe(config.url);
        // Check if query params are correctly assembled
        expect(chat.options.query.opa_token).toBe(config.opa_token);
        expect(chat.options.query.opa_user).toBe(config.opa_user);
    });

    // --- Connection Tests ---

    test('connect() should initialize socket connection and register listeners', () => {
        chat.connect();

        // Verify io() was called with correct URL and options
        expect(io).toHaveBeenCalledWith(config.url, expect.objectContaining({
            path: '/socket.io',
            transports: ['websocket']
        }));

        // Verify listeners were attached
        expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
        expect(mockSocket.onAny).toHaveBeenCalledWith(expect.any(Function));
    });

    test('connect() should not reconnect if already associated', () => {
        chat.connect();
        mockSocket.connected = true;
        chat.socket = mockSocket; // Ensure the instance has the socket

        chat.connect(); // Second call
        expect(io).toHaveBeenCalledTimes(1); // Should not call io() again
    });

    // --- Sending Messages ---

    test('sendMessage() should emit "mensagem" with correct payload', () => {
        chat.connect();
        mockSocket.connected = true; // Simulate active connection

        const msgText = "Olá mundo";
        chat.sendMessage(msgText);

        expect(mockSocket.emit).toHaveBeenCalledWith(
            "mensagem",
            "",
            "",
            { tipo: "texto", conteudo: msgText }
        );
    });

    test('sendMessage() should not emit if disconnected', () => {
        chat.connect();
        mockSocket.connected = false; // Disconnected

        chat.sendMessage("Fail");
        expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    // --- Events Reception (Message) ---

    test('should emit "message" (real-time) and "chat_message" (formatted) on receiving "Message"', (done) => {
        chat.connect();

        // Capture the onAny callback function
        const onAnyHandler = mockSocket.onAny.mock.calls[0][0];

        const fakePayload = { mensagem: "Mensagem Recebida" };
        // Args pattern mimics what comes from the server: [EventName, status, ..., payload]
        const incomingArgs = ["Message", "recebida", {}, fakePayload];

        let eventsCaltched = 0;
        const checkDone = () => {
            eventsCaltched++;
            if (eventsCaltched === 2) done();
        };

        // 1. Test real-time raw listener
        chat.onMessage((...args) => {
            try {
                expect(args).toEqual(incomingArgs); // Should receive exactly the args
                checkDone();
            } catch (e) { done(e); }
        });

        // 2. Test formatted listener
        chat.on('chat_message', (text) => {
            try {
                expect(text).toBe("Mensagem Recebida");
                checkDone();
            } catch (e) { done(e); }
        });

        // Simulate the event coming from Socket.IO
        onAnyHandler('Message', ...incomingArgs);
    });

    // --- Events Reception (History) ---

    test('should emit "history_log" when receiving "Messages"', (done) => {
        chat.connect();
        const onAnyHandler = mockSocket.onAny.mock.calls[0][0];

        const fakeHistory = [{ id: 1, text: "antiga" }, { id: 2, text: "antiga 2" }];
        const incomingArgs = [fakeHistory]; // 'Messages' usually sends the list as first arg

        chat.on('history_log', (list) => {
            try {
                expect(list).toEqual(fakeHistory);
                done();
            } catch (e) { done(e); }
        });

        onAnyHandler('Messages', ...incomingArgs);
    });

    test('should validate the structure of history items (Analyze Response)', (done) => {
        chat.connect();
        const onAnyHandler = mockSocket.onAny.mock.calls[0][0];

        // Mock of a complete history item as received from the server
        const complexHistoryItem = {
            _id: "675cafa...",
            id_atendimento: "12345",
            mensagem: "Olá, sou o histórico",
            data_envio: "2024-12-15T10:00:00.000Z",
            remetente: { tipo: "cliente", id: "user-123" }
        };

        chat.on('history_log', (list) => {
            try {
                console.log("---------------------------------------------------");
                console.log(" [TEST LOG] History Received:", JSON.stringify(list, null, 2));
                console.log("---------------------------------------------------");

                // Analyzing the response (Array)
                expect(Array.isArray(list)).toBe(true);
                expect(list.length).toBe(1);

                // Analyzing the Item
                const item = list[0];
                expect(item).toHaveProperty('_id');
                expect(item).toHaveProperty('mensagem', 'Olá, sou o histórico');
                expect(item.remetente).toEqual({ tipo: "cliente", id: "user-123" });

                done();
            } catch (e) { done(e); }
        });

        onAnyHandler('Messages', [complexHistoryItem]);
    });

    test('should simulate full conversation flow (Send -> Ack Enviada -> Received Reply)', (done) => {
        chat.connect();
        mockSocket.connected = true;
        const onAnyHandler = mockSocket.onAny.mock.calls[0][0];

        const sentText = "Minha mensagem enviada";
        chat.sendMessage(sentText);

        // 1. Verify SEND emit
        expect(mockSocket.emit).toHaveBeenCalledWith(
            "mensagem", "", "", { tipo: "texto", conteudo: sentText }
        );

        let step = 0;

        chat.onMessage((...args) => {
            try {
                const eventName = args[0];
                const status = args[1];
                const payload = args[3];

                console.log(` [TEST LOG] Real-time Event [Step ${step + 1}]:`, eventName, status, payload);

                if (step === 0) {
                    // 2. Expect ACK (Enviada) - The server echoing back what we sent
                    expect(eventName).toBe("Message");
                    expect(status).toBe("enviada");
                    // Assuming server returns 'conteudo' for sent messages or mirrors payload
                    expect(payload.conteudo).toBe(sentText);
                    step++;

                    // Trigger next step: Server sends a Reply
                    const replyArgs = ["Message", "recebida", {}, { mensagem: "Resposta do servidor" }];
                    onAnyHandler('Message', ...replyArgs);

                } else if (step === 1) {
                    // 3. Expect REPLY (Recebida)
                    expect(eventName).toBe("Message");
                    expect(status).toBe("recebida");
                    expect(payload.mensagem).toBe("Resposta do servidor");
                    done();
                }
            } catch (e) { done(e); }
        });

        // Trigger the ACK event (Simulating server response immediately after send)
        const ackArgs = ["Message", "enviada", {}, { conteudo: sentText }];
        onAnyHandler('Message', ...ackArgs);
    });
});
