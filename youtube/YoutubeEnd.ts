import * as rx from 'rxjs'
import * as op from 'rxjs/operators'
import { google, youtube_v3 } from 'googleapis'
import { YoutubeAuth } from './YoutubeAuth'
import { MessageFormatter } from '../util/MessageFormatter'

const YOUTUBE_MAX_MESSAGE_LENGTH = 200

export { youtube_v3 }
type YoutubeAPI = youtube_v3.Youtube

/**
 * a stream end of youtube live chat,
 * refactor youtube api just like twitch message interface - tmi.js
 * 
 */
export class YoutubeEnd {

	readonly auth: YoutubeAuth
	readonly api: YoutubeAPI
	readonly pullChatRate: number

	constructor(auth: YoutubeAuth, opts: {
		api?: YoutubeAPI,
		pullChatRate?: number,
	}) {
		// caller must provide an auth
		this.auth = auth;

		// use the a defined instance or create a new one
		this.api = opts.api ?? google.youtube("v3");

		// frequency of pull chat message, default is 5000 millisecond
		this.pullChatRate = opts.pullChatRate ?? 5000;
	}

	/**
	 * many stream is start with auth
	 */
	auth$() {
		// 一定要在从固定的值开始，否则retry时不会执行loadTokensFromFile
		return rx.of(1).pipe(
			op.switchMap(() => this.auth.loadTokensFromFile())
		)
	}

	loadAuthToken() {
		return this.auth.loadTokensFromFile()
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
			.then(data => data.items!)
	}

	/**
	 * list liveChatMessages request
	 * @param chatId broadcast chat id
	 * @param pageToken every page have next page token
	 * @return the page instance
	 */
	list_liveChatMessages(chatId: string, pageToken?: string) {
		let request: youtube_v3.Params$Resource$Livechatmessages$List = {
			auth: this.auth.getAuth(),
			part: ["snippet", "authorDetails"],
			liveChatId: chatId,
			pageToken: pageToken,
			// maxResults: 500, // default maxResults is 500
		}
		return this.api.liveChatMessages.list(request).then(res => res.data)
	}

	/**
	 * get a stream of chat message of a certain broadcast.
	 * @param broadcast the target broadcast instance
	 */
	getChatMessage$(broadcast: youtube_v3.Schema$LiveBroadcast) {
		let snippet = broadcast.snippet!;

		console.log('get chat message stream of:', snippet.title)
		console.log('live chat id is:', snippet.liveChatId)

		let pageToken: string | undefined = undefined
		return rx.interval(this.pullChatRate).pipe(
			op.tap(() => console.log('pulling chat message...')),
			op.exhaustMap(() => {
				return this.list_liveChatMessages(snippet.liveChatId!, pageToken)
					.then(data => {
						pageToken = data.nextPageToken ?? undefined;
						return data.items!;
					})
			})
		)
	}

	/**
	 * this may be send in a sequence, so use rx stream
	 * @param message text message
	 * @param chatId live chat id
	 */
	insert_liveChatMessages$(message: string, chatId: string) {
		let messageParts = MessageFormatter.createMessageParts(
			message,
			YOUTUBE_MAX_MESSAGE_LENGTH
		)
		return rx.from(messageParts).pipe(
			op.concatMap(part => {
				let request: youtube_v3.Params$Resource$Livechatmessages$Insert = {
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
				}
				return this.api.liveChatMessages.insert(request)
			})
		)
	}

}