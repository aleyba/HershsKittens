import * as Discord from "discord.js";
import * as glob from "glob";
import * as util from "util";
import ManiClient from "../core/client";
import { IBotEvent } from "../core/event";

export interface IEventManager {
	loadEvents(client: ManiClient): Promise<boolean>;
}

export default class EventManager implements IEventManager {
	private _events: Discord.Collection<string, IBotEvent>;

	public constructor() {
		this._events = new Discord.Collection<string, IBotEvent>();		
	}

	public async loadEvents(client: ManiClient): Promise<boolean> {
		await util.promisify(glob)(`${__dirname}/../events/**/*{.ts,.js}`).then(eventFiles => {
			eventFiles.map(file => {
				const EventClass = require(file).default;
				const event: IBotEvent = new EventClass as IBotEvent;
				this._events.set(event.name, event);
				client.on(event.name, event.onEvent.bind(event, client));
			})
		}).catch(err => {
			console.log(`[EventManager.loadEvents] ${err}`);
		});
				
		return this._events.size > 0;
	}
}