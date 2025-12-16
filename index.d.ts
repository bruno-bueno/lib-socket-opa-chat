import { EventEmitter } from 'events';

export interface SocketOpaChatConfig {
    url: string;
    opa_token: string;
    opa_user: string;
    opa_tipo?: string;
    path?: string;
    transports?: string[];
    query?: Record<string, unknown>;
}

export interface MediaFile {
    nomeArquivo: string;
    data: string;
}

export class SocketOpaChat extends EventEmitter {
    constructor(config: SocketOpaChatConfig);

    connect(): void;
    disconnect(): void;

    sendMessage(text: string): unknown[] | undefined;
    sendMedia(fileData: MediaFile): unknown[] | undefined;

    emitRaw(argsArray: unknown[]): void;
    getHistory(): void;
    endChat(): void;

    onMessage(callback: (...args: unknown[]) => void): void;

    on(event: 'connected', listener: (id: string) => void): this;
    on(event: 'disconnected', listener: (reason: string) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;

    on(event: 'message', listener: (...args: unknown[]) => void): this;
    on(event: 'chat_message', listener: (message: string) => void): this;
    on(event: 'chat_media', listener: (media: MediaFile | unknown) => void): this;
    on(event: 'history_log', listener: (messages: unknown[]) => void): this;
    on(event: 'raw_event', listener: (data: { event: string; args: unknown[] }) => void): this;

    on(event: string | symbol, listener: (...args: unknown[]) => void): this;
}

export default SocketOpaChat;
