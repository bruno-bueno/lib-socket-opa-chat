export enum SocketOpaEvent {
    CONNECTED = 'connected',
    DISCONNECTED = 'disconnected',
    ERROR = 'error',
    MESSAGE = 'message',
    CHAT_MESSAGE = 'chat_message',
    CHAT_MEDIA = 'chat_media',
    HISTORY_LOG = 'history_log',
    RAW_EVENT = 'raw_event'
}

export interface SocketOpaChatConfig {
    /**
     * URL of the socket.io server (e.g., "https://giganet-sac.com.br")
     */
    url: string;

    /**
     * Authentication token
     */
    opa_token: string;

    /**
     * User ID for the chat session
     */
    opa_user: string;

    /**
     * Connection type (default: "page")
     */
    opa_tipo?: string;

    /**
     * Custom socket.io path (default: "/socket.io")
     */
    path?: string;

    /**
     * Transports to use (default: ["websocket"])
     */
    transports?: string[];

    /**
     * Additional query parameters
     */
    query?: Record<string, unknown>;
}

export interface MediaFile {
    /**
     * Name of the file (e.g., "image.png")
     */
    nomeArquivo: string;

    /**
     * Base64 data string of the file
     */
    data: string;
}
