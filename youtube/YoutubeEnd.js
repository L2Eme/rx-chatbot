"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const googleapis_1 = require("googleapis");
exports.youtube_v3 = googleapis_1.youtube_v3;
const MessageFormatter_1 = require("../util/MessageFormatter");
const YOUTUBE_MAX_MESSAGE_LENGTH = 200;
/**
 * a stream end of youtube live chat,
 * refactor youtube api just like twitch message interface - tmi.js
 *
 */
class YoutubeEnd {
    constructor(auth, opts) {
        var _a, _b;
        // caller must provide an auth
        this.auth = auth;
        // use the a defined instance or create a new one
        this.api = (_a = opts.api) !== null && _a !== void 0 ? _a : googleapis_1.google.youtube("v3");
        // frequency of pull chat message, default is 5000 millisecond
        this.pullChatRate = (_b = opts.pullChatRate) !== null && _b !== void 0 ? _b : 5000;
    }
    /**
     * many stream is start with auth
     */
    auth$() {
        // 一定要在从固定的值开始，否则retry时不会执行loadTokensFromFile
        return rx.of(1).pipe(op.switchMap(() => this.auth.loadTokensFromFile()));
    }
    loadAuthToken() {
        return this.auth.loadTokensFromFile();
    }
    /**
     * this will list all liveBroadcasts you have,
     * in general, there is only 1 in your own list
     */
    list_my_liveBroadcast() {
        return this.api.liveBroadcasts.list({
            auth: this.auth.getAuth(),
            part: ["snippet"],
            mine: true,
        }).then(res => res.data)
            .then(data => data.items);
    }
    /**
     * list liveChatMessages request
     * @param chatId broadcast chat id
     * @param pageToken every page have next page token
     * @return the page instance
     */
    list_liveChatMessages(chatId, pageToken) {
        let request = {
            auth: this.auth.getAuth(),
            part: ["snippet", "authorDetails"],
            liveChatId: chatId,
            pageToken: pageToken,
        };
        return this.api.liveChatMessages.list(request).then(res => res.data);
    }
    /**
     * get a stream of chat message of a certain broadcast.
     * @param broadcast the target broadcast instance
     */
    getChatMessage$(broadcast) {
        let snippet = broadcast.snippet;
        console.log('get chat message stream of:', snippet.title);
        console.log('live chat id is:', snippet.liveChatId);
        let pageToken = undefined;
        return rx.interval(this.pullChatRate).pipe(op.tap(() => console.log('pulling chat message...')), op.exhaustMap(() => {
            return this.list_liveChatMessages(snippet.liveChatId, pageToken)
                .then(data => {
                var _a;
                pageToken = (_a = data.nextPageToken) !== null && _a !== void 0 ? _a : undefined;
                return data.items;
            });
        }));
    }
    /**
     * this may be send in a sequence, so use rx stream
     * @param message text message
     * @param chatId live chat id
     */
    insert_liveChatMessages$(message, chatId) {
        let messageParts = MessageFormatter_1.MessageFormatter.createMessageParts(message, YOUTUBE_MAX_MESSAGE_LENGTH);
        return rx.from(messageParts).pipe(op.concatMap(part => {
            let request = {
                auth: this.auth.getAuth(),
                part: ["snippet"],
                requestBody: {
                    snippet: {
                        type: "textMessageEvent",
                        liveChatId: chatId,
                        textMessageDetails: {
                            messageText: part
                        }
                    }
                }
            };
            return this.api.liveChatMessages.insert(request);
        }));
    }
}
exports.YoutubeEnd = YoutubeEnd;
