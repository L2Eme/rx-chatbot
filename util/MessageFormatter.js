"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MessageFormatter {
    /**
     * to split the message into small piece, to fit the maxLength of a chat room.
     * this is usefull when you are sending English sentences.
     *
     * @param {string} str target string
     * @param {number} maxLength the length limit of a chat room
     */
    static createMessageParts(str, maxLength) {
        var partIndex = 0;
        var currentPart = "";
        const tokensSplitBySpaces = str.split(" ");
        return tokensSplitBySpaces.reduce((acc, token, idx) => {
            if (token.length > maxLength) {
                throw new Error(`Message part was longer than maxLength: ${maxLength}`);
            }
            else if (currentPart.length + token.length > maxLength) {
                currentPart = "";
                partIndex++;
            }
            else if (idx > 0) {
                currentPart += " ";
            }
            currentPart = currentPart + token;
            acc[partIndex] = currentPart;
            return acc;
        }, []);
    }
}
exports.MessageFormatter = MessageFormatter;
