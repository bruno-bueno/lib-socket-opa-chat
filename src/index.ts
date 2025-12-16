import { io, Socket } from "socket.io-client";
import { EventEmitter } from "events";
import { SocketOpaChatConfig, MediaFile, SocketOpaEvent } from "./types";

export * from "./types";

export class SocketOpaChat extends EventEmitter {
    private config: SocketOpaChatConfig;
    public socket: Socket | null;

    constructor(config: SocketOpaChatConfig) {
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
    connect(): void {
        const { url, opa_token, opa_user, opa_tipo, path, transports, query } = this.config;

        // Build query object
        const finalQuery = {
            opa_tipo: opa_tipo,
            opa_token: opa_token,
            opa_user: opa_user,
            ...query
        };

        const options: any = {
            query: finalQuery,
            transports: transports || ['websocket']
        };

        if (path) {
            options.path = path;
        }

        this.socket = io(url, options);

        this._registerInternalListeners();
    }

    /**
     * Internal listener registration
     */
    private _registerInternalListeners(): void {
        if (!this.socket) return;

        this.socket.on("connect", () => {
            if (this.socket) {
                this.emit(SocketOpaEvent.CONNECTED, this.socket.id);
            }
        });

        this.socket.on("disconnect", (reason: string) => {
            this.emit(SocketOpaEvent.DISCONNECTED, reason);
        });

        this.socket.on("connect_error", (error: Error) => {
            this.emit(SocketOpaEvent.ERROR, error);
            console.error("[SocketOpaChat] Connection Error:", error);
        });

        // Listen to all events to filter for "Message", "Messages", e.g.
        this.socket.onAny((event: string, ...args: any[]) => {
            this.emit(SocketOpaEvent.RAW_EVENT, { event, args });

            if (event === "Message") {
                this._handleSingleMessage(args);
                // Also emit generic message event for easier consumption
                this.emit(SocketOpaEvent.MESSAGE, ...args);
            } else if (event === "Messages") {
                this._handleHistoryMessages(args);
            }
        });
    }

    /**
     * Cleanly disconnect
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    /**
     * Send a plain text message
     * @param text Message content
     */
    sendMessage(text: string): any[] | undefined {
        if (!this._checkConnection()) return;

        // Structure required by server: ["mensagem", "", "", { "tipo": "texto", "mensagem": "..." }]
        const payload = {
            tipo: "texto",
            conteudo: text
        };

        const args: [string, string, string, any] = ["mensagem", "", "", payload];
        this.socket?.emit(...args);
        return args;
    }

    /**
     * Send a media/file message
     * @param fileData { nomeArquivo, data }
     */
    sendMedia(fileData: MediaFile): any[] | undefined {
        if (!this._checkConnection()) return;

        const payload = {
            tipo: "midia",
            conteudo: fileData
        };
        const args: [string, string, string, any] = ["mensagem", "", "", payload];

        this.socket?.emit(...args);
        return args;
    }

    /**
     * Emit a raw event array
     * @param argsArray e.g. ["event", data]
     */
    emitRaw(argsArray: any[]): void {
        if (!this._checkConnection()) return;
        if (!Array.isArray(argsArray)) {
            console.error("[SocketOpaChat] emitRaw expects an array.");
            return;
        }
        this.socket?.emit(...(argsArray as [string, ...any[]]));
    }

    /**
     * Request chat history
     */
    getHistory(): void {
        if (!this._checkConnection()) return;
        this.socket?.emit("get_mensagens_atendimento_web_chat");
    }

    /**
     * End chat session
     */
    endChat(): void {
        if (!this._checkConnection()) return;
        this.socket?.emit("encerrarAtendimento");
    }

    /**
     * Helper to listen to 'message' event directly
     */
    onMessage(callback: (...args: any[]) => void): void {
        this.on(SocketOpaEvent.MESSAGE, callback);
    }

    /**
     * Check if socket is connected
     */
    private _checkConnection(): boolean {
        if (!this.socket || !this.socket.connected) {
            console.warn("[SocketOpaChat] Socket not connected.");
            return false;
        }
        return true;
    }

    /**
     * Parse single message
     */
    private _handleSingleMessage(args: any[]): void {
        try {
            // args example: ["Message", "routeId", "status", { ... }]
            // Find payload: looks for object with 'mensagem' or specific 'tipo'
            const payload = args.find(a => typeof a === 'object' && (a.mensagem || a.tipo || a.conteudo));

            if (payload) {
                // Check for Media
                if (payload.tipo === 'midia' && (payload.objeto || payload.conteudo)) {
                    this.emit(SocketOpaEvent.CHAT_MEDIA, payload.objeto || payload.conteudo);
                }
                // Check for Text
                else if (payload.mensagem || payload.conteudo) {
                    let text = payload.mensagem || payload.conteudo;
                    // Handle menu objects or other complex text structures
                    if (typeof text === 'object') {
                        text = (text as any).titulo || JSON.stringify(text);
                    }
                    this.emit(SocketOpaEvent.CHAT_MESSAGE, text);
                }
            }
        } catch (error) {
            console.error("[SocketOpaChat] Parse Error (Message):", error);
        }
    }

    /**
     * Handle header/history messages
     */
    private _handleHistoryMessages(args: any[]): void {
        // args[1] usually contains the array of messages
        const historyList = args[1];
        if (Array.isArray(historyList)) {
            this.emit(SocketOpaEvent.HISTORY_LOG, historyList);
        }
    }
}

export default SocketOpaChat;
