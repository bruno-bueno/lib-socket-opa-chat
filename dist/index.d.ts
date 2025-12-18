import { Socket } from "socket.io-client";
import { EventEmitter } from "events";
import { SocketOpaChatConfig, MediaFile } from "./types";
export * from "./types";
export declare class SocketOpaChat extends EventEmitter {
    private config;
    socket: Socket | null;
    constructor(config: SocketOpaChatConfig);
    /**
     * Establish socket connection
     */
    connect(): void;
    /**
     * Internal listener registration
     */
    private _registerInternalListeners;
    /**
     * Cleanly disconnect
     */
    disconnect(): void;
    /**
     * Send a plain text message
     * @param text Message content
     */
    sendMessage(text: string): any[] | undefined;
    /**
     * Send a media/file message
     * @param fileData { nomeArquivo, data }
     */
    sendMedia(fileData: MediaFile): any[] | undefined;
    /**
     * Emit a raw event array
     * @param argsArray e.g. ["event", data]
     */
    emitRaw(argsArray: any[]): void;
    /**
     * Request chat history
     */
    getHistory(): void;
    /**
     * End chat session
     */
    endChat(): void;
    /**
     * Helper to listen to 'message' event directly
     */
    onMessage(callback: (...args: any[]) => void): void;
    /**
     * Check if socket is connected
     */
    private _checkConnection;
    /**
     * Parse single message
     */
    private _handleSingleMessage;
    /**
     * Handle header/history messages
     */
    private _handleHistoryMessages;
}
export default SocketOpaChat;
