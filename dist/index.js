"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketOpaChat = void 0;
const socket_io_client_1 = require("socket.io-client");
const events_1 = require("events");
const types_1 = require("./types");
__exportStar(require("./types"), exports);
class SocketOpaChat extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.config = config || {};
        this.socket = null;
        if (!this.config.url) {
            throw new Error("[SocketOpaChat] Error: 'url' parameter is required in config.");
        }
        if (!this.config.opa_token) {
            throw new Error("[SocketOpaChat] Error: 'opa_token' parameter is required.");
        }
        if (!this.config.opa_user) {
            throw new Error("[SocketOpaChat] Error: 'opa_user' parameter is required.");
        }
        // Default values
        if (!this.config.opa_tipo) {
            this.config.opa_tipo = 'page';
        }
    }
    /**
     * Establish socket connection
     */
    connect() {
        const { url, opa_token, opa_user, opa_tipo, path, transports, query } = this.config;
        // Build query object
        const finalQuery = {
            opa_tipo: opa_tipo,
            opa_token: opa_token,
            opa_user: opa_user,
            ...query
        };
        const options = {
            query: finalQuery,
            transports: transports || ['websocket']
        };
        if (path) {
            options.path = path;
        }
        this.socket = (0, socket_io_client_1.io)(url, options);
        this._registerInternalListeners();
    }
    /**
     * Internal listener registration
     */
    _registerInternalListeners() {
        if (!this.socket)
            return;
        this.socket.on("connect", () => {
            if (this.socket) {
                this.emit(types_1.SocketOpaEvent.CONNECTED, this.socket.id);
            }
        });
        this.socket.on("disconnect", (reason) => {
            this.emit(types_1.SocketOpaEvent.DISCONNECTED, reason);
        });
        this.socket.on("connect_error", (error) => {
            this.emit(types_1.SocketOpaEvent.ERROR, error);
            console.error("[SocketOpaChat] Connection Error:", error);
        });
        // Listen to all events to filter for "Message", "Messages", e.g.
        this.socket.onAny((event, ...args) => {
            this.emit(types_1.SocketOpaEvent.RAW_EVENT, { event, args });
            if (event === "Message") {
                this._handleSingleMessage(args);
                // Also emit generic message event for easier consumption
                this.emit(types_1.SocketOpaEvent.MESSAGE, ...args);
            }
            else if (event === "Messages") {
                this._handleHistoryMessages(args);
            }
        });
    }
    /**
     * Cleanly disconnect
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
    /**
     * Send a plain text message
     * @param text Message content
     */
    sendMessage(text) {
        var _a;
        if (!this._checkConnection())
            return;
        // Structure required by server: ["mensagem", "", "", { "tipo": "texto", "mensagem": "..." }]
        const payload = {
            tipo: "texto",
            conteudo: text
        };
        const args = ["mensagem", "", "", payload];
        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.emit(...args);
        return args;
    }
    /**
     * Send a media/file message
     * @param fileData { nomeArquivo, data }
     */
    sendMedia(fileData) {
        var _a;
        if (!this._checkConnection())
            return;
        const payload = {
            tipo: "midia",
            conteudo: fileData
        };
        const args = ["mensagem", "", "", payload];
        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.emit(...args);
        return args;
    }
    /**
     * Emit a raw event array
     * @param argsArray e.g. ["event", data]
     */
    emitRaw(argsArray) {
        var _a;
        if (!this._checkConnection())
            return;
        if (!Array.isArray(argsArray)) {
            console.error("[SocketOpaChat] emitRaw expects an array.");
            return;
        }
        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.emit(...argsArray);
    }
    /**
     * Request chat history
     */
    getHistory() {
        var _a;
        if (!this._checkConnection())
            return;
        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.emit("get_mensagens_atendimento_web_chat");
    }
    /**
     * End chat session
     */
    endChat() {
        var _a;
        if (!this._checkConnection())
            return;
        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.emit("encerrarAtendimento");
    }
    /**
     * Helper to listen to 'message' event directly
     */
    onMessage(callback) {
        this.on(types_1.SocketOpaEvent.MESSAGE, callback);
    }
    /**
     * Check if socket is connected
     */
    _checkConnection() {
        if (!this.socket || !this.socket.connected) {
            console.warn("[SocketOpaChat] Socket not connected.");
            return false;
        }
        return true;
    }
    /**
     * Parse single message
     */
    _handleSingleMessage(args) {
        try {
            // args example: ["Message", "routeId", "status", { ... }]
            // Find payload: looks for object with 'mensagem' or specific 'tipo'
            const payload = args.find(a => typeof a === 'object' && (a.mensagem || a.tipo || a.conteudo));
            if (payload) {
                this.emit(types_1.SocketOpaEvent.CHAT_MESSAGE, payload);
            }
        }
        catch (error) {
            console.error("[SocketOpaChat] Parse Error (Message):", error);
        }
    }
    /**
     * Handle header/history messages
     */
    _handleHistoryMessages(args) {
        // args[1] usually contains the array of messages
        const historyList = args;
        if (Array.isArray(historyList)) {
            this.emit(types_1.SocketOpaEvent.HISTORY_LOG, historyList);
        }
    }
}
exports.SocketOpaChat = SocketOpaChat;
exports.default = SocketOpaChat;
