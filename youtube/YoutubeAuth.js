"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const googleapis_1 = require("googleapis");
const file = require("../util/file");
const OAuth2 = googleapis_1.google.auth.OAuth2;
// Permissions needed to view and submit live chat comments
const DEFAULT_SCOPE = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.force-ssl"
];
class YoutubeAuth {
    constructor({ clientId, clientSecret, redirectURI, tokenFilePath, scope = DEFAULT_SCOPE, }) {
        this.auth = new OAuth2(clientId, clientSecret, redirectURI);
        this.auth.on("tokens", this.saveTokens.bind(this));
        this.scope = scope;
        this.tokenFilePath = tokenFilePath;
    }
    getAuth() {
        return this.auth;
    }
    /**
     * save tokens to local file
     * @param {*} tokens
     */
    saveTokens(tokens) {
        if (tokens.refresh_token) {
            file.save(this.tokenFilePath, JSON.stringify(tokens));
        }
    }
    /**
     * express getCode will redirect to google OAuth page.
     * may use a express Response instance to redirect to the auth page
     *
     * 方法的设计有问题，依赖一个没有引入的response概念，而且getCode的名字不太容易理解
     * getAuthUrl() => string
     * 让调用方拿到url之后，再决定如何使用
     *
     * @param {*} response to open the url
     */
    getCode(response) {
        const authUrl = this.auth.generateAuthUrl({
            access_type: "offline",
            scope: this.scope
        });
        response.redirect(authUrl);
    }
    /**
     * express open one url to listen google OAuth callback.
     * once the callback url is reach, call this function to get tokens
     *
     * @param {string} code google OAuth return a code
     */
    getTokensWithCode(code) {
        return __awaiter(this, void 0, void 0, function* () {
            // 获取到的是getToken的response，response中才有token
            const response = yield this.auth.getToken(code);
            this.auth.setCredentials(response.tokens);
            // save tokens in file
            yield file.save(this.tokenFilePath, JSON.stringify(response.tokens));
        });
    }
    /**
     * load token from file
     */
    loadTokensFromFile() {
        return __awaiter(this, void 0, void 0, function* () {
            const file_contents = yield file.read(this.tokenFilePath);
            const tokens = JSON.parse(file_contents);
            if (tokens) {
                this.auth.setCredentials(tokens);
            }
            else {
                throw new Error("No tokens set for Youtube OAuth");
            }
        });
    }
}
exports.YoutubeAuth = YoutubeAuth;
