"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketOpaEvent = void 0;
var SocketOpaEvent;
(function (SocketOpaEvent) {
    SocketOpaEvent["CONNECTED"] = "connected";
    SocketOpaEvent["DISCONNECTED"] = "disconnected";
    SocketOpaEvent["ERROR"] = "error";
    SocketOpaEvent["MESSAGE"] = "message";
    SocketOpaEvent["CHAT_MESSAGE"] = "chat_message";
    SocketOpaEvent["CHAT_MEDIA"] = "chat_media";
    SocketOpaEvent["HISTORY_LOG"] = "history_log";
    SocketOpaEvent["RAW_EVENT"] = "raw_event";
})(SocketOpaEvent || (exports.SocketOpaEvent = SocketOpaEvent = {}));
