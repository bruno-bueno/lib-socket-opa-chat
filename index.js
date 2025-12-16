const io = require("socket.io-client");
const EventEmitter = require('events');

class SocketOpaChat extends EventEmitter {
    constructor(config) {
        super();
        this.config = config || {};
        this.socket = null;

        // URL is now expected in config, no specific default
        this.url = this.config.url;

        // Dynamic query params from config
        const defaultQuery = {
            opa_tipo: this.config.opa_tipo || "page",
            opa_token: this.config.opa_token,
            opa_user: this.config.opa_user,
            EIO: 4
        };

        // Validate required params (optional but good for debugging)
        if (!this.url) console.warn("[SocketOpaChat] Warning: 'url' not provided in config.");
        if (!defaultQuery.opa_token) console.warn("[SocketOpaChat] Warning: 'opa_token' not provided in config.");
        if (!defaultQuery.opa_user) console.warn("[SocketOpaChat] Warning: 'opa_user' not provided in config.");

        this.options = {
            path: this.config.path || "/socket.io",
            transports: this.config.transports || ["websocket"],
            query: { ...defaultQuery, ...this.config.query }
        };
    }

    connect() {
        if (this.socket && this.socket.connected) {
            return;
        }

        console.log(`[SocketOpaChat] Connecting to ${this.url}...`);
        this.socket = io(this.url, this.options);

        this.socket.on("connect", () => {
            this.emit("connected", this.socket.id);
        });

        this.socket.on("disconnect", (reason) => {
            this.emit("disconnected", reason);
        });

        this.socket.on("connect_error", (error) => {
            this.emit("error", error);
        });

        // Catch-all watcher
        this.socket.onAny((event, ...args) => {
            // Re-emit everything for raw logging
            this.emit("raw_event", { event, args });

            // Specific parsing logic copied from app.js
            if (event === 'Message') {
                this.emit("message", ...args); // Emitir evento 'message' em tempo real
                this._handleSingleMessage(args);
            } else if (event === 'Messages') {
                this._handleHistoryMessages(args);
            }
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    /**
     * Send a standard text message
     * Corresponds to: ["mensagem", "", "", { "tipo": "texto", "conteudo": "..." }]
     */
    sendMessage(text) {
        if (!this._checkConnection()) return;

        const payload = {
            tipo: "texto",
            conteudo: text
        };
        const args = ["mensagem", "", "", payload];

        this.socket.emit(...args);
        return args; // Return sent data for UI logging
    }

    /**
     * Send a media/file message
     * @param {Object} fileData - { nomeArquivo: string, data: string(base64) }
     */
    sendMedia(fileData) {
        if (!this._checkConnection()) return;

        const payload = {
            tipo: "midia",
            conteudo: fileData
        };
        const args = ["mensagem", "", "", payload];

        this.socket.emit(...args);
        return args;
    }

    /**
     * Send a specific raw event/args (like the input field in the original app)
     * @param {Array} argsArray - e.g. ["evento", "arg1", ...]
     */
    emitRaw(argsArray) {
        if (!this._checkConnection()) return;

        if (!Array.isArray(argsArray) || argsArray.length === 0) {
            throw new Error("emitRaw expects an array with at least event name");
        }

        this.socket.emit(...argsArray);
    }


    /**
     * Listen for 'Message' events exclusively
     * @param {Function} callback 
     */
    onMessage(callback) {
        this.on("message", callback);
    }

    endChat() {
        if (!this._checkConnection()) return;
        this.socket.emit("encerrarAtendimento");
    }

    getHistory() {
        if (!this._checkConnection()) return;
        this.socket.emit("get_mensagens_atendimento_web_chat");
    }

    // --- Private Helpers to parse incoming data from Giga ---

    _handleSingleMessage(args) {
        try {
            // args example: ["Message", "routeId", "status", { ... }]
            const status = args[1];

            // Find payload: looks for object with 'mensagem' or specific 'tipo'
            const payload = args.find(a => typeof a === 'object' && (a.mensagem || a.tipo));

            if (payload) {
                // Check for Media
                if (payload.tipo === 'midia' && payload.objeto) {
                    this.emit("chat_media", payload.objeto);
                }
                // Check for Text
                else if (payload.mensagem || payload.conteudo) {
                    let text = payload.mensagem || payload.conteudo;
                    // Handle menu objects or other complex text structures
                    if (typeof text === 'object') {
                        text = text.titulo || JSON.stringify(text);
                    }
                    console.log("[SocketOpaChat] chat_message:", payload);
                    this.emit("chat_message", payload);
                }
            }
        } catch (error) {
            console.error("[SocketOpaChat] Parse Error (Message):", error);
        }
    }

    _handleHistoryMessages(args) {
        try {
            const list = args[0];
            if (Array.isArray(list)) {
                this.emit("history_log", list);
            }
        } catch (error) {
            console.error("[SocketOpaChat] Parse Error (History):", error);
        }
    }

    _checkConnection() {
        if (!this.socket || !this.socket.connected) {
            console.warn("[SocketOpaChat] Socket not connected.");
            return false;
        }
        return true;
    }
}

module.exports = SocketOpaChat;
