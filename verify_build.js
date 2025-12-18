const { SocketOpaChat, SocketOpaEvent } = require('./dist/index.js');
console.log('SocketOpaChat:', typeof SocketOpaChat);
console.log('SocketOpaEvent:', SocketOpaEvent);

try {
    const chat = new SocketOpaChat({
        url: 'https://google.com',
        opa_token: '123',
        opa_user: '123'
    });
    console.log('Chat instance created.');
    chat.connect();
    console.log('Called connect. Socket exists?', !!chat.socket);

    // Test send (will fail connection check but we can see if it crashes)
    chat.sendMessage("Test");
} catch (e) {
    console.error(e);
}
