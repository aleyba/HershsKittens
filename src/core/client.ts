import chalk = require("chalk");
import * as Discord from "discord.js";
import CommandManager from "../managers/commandManager";
import DatabaseManager from "../managers/databaseManager";
import EventManager from "../managers/eventManager";
import CatStoreManager from "../managers/catstoreManager";
import CatContestManager from "../managers/catcontestManager";
import QuestManager from "../managers/questManager";

export default class ManiClient extends Discord.Client {
	private _commands: CommandManager;
	private _events: EventManager;
	private _database: DatabaseManager;
	private _catstore: CatStoreManager;
	private _contest: CatContestManager;
	private _quests: QuestManager;

	public constructor(options: Discord.ClientOptions) {
		super(options);

		this._commands = new CommandManager();
		this._events = new EventManager();
		this._database = new DatabaseManager();
		this._catstore = new CatStoreManager();
		this._contest = new CatContestManager();
		this._quests = new QuestManager();

		this._init();		
	}

	get commands() { return this._commands; }
	get events() { return this._events; }
	get database() { return this._database; }
	get catstore() { return this._catstore; }
	get contest() { return this._contest; }
	get quests() { return this._quests; }

	private async _init() {		
			
		if (await this._events.loadEvents(this)) 
			console.log('events loaded...');

		// await this._commands.deploySlashCommands();				
	}
}