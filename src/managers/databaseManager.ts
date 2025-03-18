import * as Mongoose from "mongoose";
import config from "../config";
import { createPlayer, IPlayerCat } from "../database/model/playerModel";
import { IPlayerDocument } from "../database/model/playerModel";
import userSchema from "../database/schema/playerSchema";
import { getRandomModifiers, ICat, ICatDocument } from "../database/model/catModel";
import catSchema from "../database/schema/catSchema";
import { IItem, IItemDocument } from "../database/model/itemModel";
import itemSchema from "../database/schema/itemSchema";
import { IGlobalsDocument } from "../database/model/globalsModel";
import globalsSchema from "../database/schema/globalsSchema";

export interface IDatabaseManager {
	connectToDB(): Promise<void | typeof Mongoose>;
	closeConnection(): Promise<void>;
}

export default class DatabaseManager {
	private _playersInserting: Set<string>;

	public constructor() {
		this._playersInserting = new Set();
	}

	private async connectToDB(): Promise<boolean> {
		let connected: boolean = false;

		if (Mongoose.connection.readyState > 0) return true;

		await Mongoose.connect(config.dbUrl, {
			// useNewUrlParser: true,
			// useUnifiedTopology: true,
			// useFindAndModify: false
		}).then(db => {
			connected = true;
		}).catch(err => {
			console.log(`[DatabaseManager.connectToDB] ${err}`);
		})

		return connected;
	}

	private async closeConnection(): Promise<void> {
		await Mongoose.connection.close();
	}

	public async testConnection(): Promise<boolean> {
		let succeeded: boolean = false;
		if (await this.connectToDB()) {						
			succeeded = true;
		}

		return succeeded;
	}

	public async addOrGetUser(id: string, name: string): Promise<IPlayerDocument | null> {
		let player!: IPlayerDocument | null;

		if (await this.connectToDB()) {
			try {
				await userSchema.findById(id).then(data => {
					player = data;
					
					if (player) {
						player.name = name;
						for (let i = 0; i < player.cats.length; i++) {
							let cat: IPlayerCat = player.cats[i];
							if (cat.stats.genetics.value > 100) {
								cat.stats.genetics.value = Math.ceil( (cat.stats.genetics.A + cat.stats.genetics.B) / 2 );
							}
							if (cat.stats.genetics.beautyModifier < 1) {
								// console.log(`generating modifiers for ${cat.name}`);
								let modifiers = getRandomModifiers(cat.stats.genetics.A, cat.stats.genetics.B);
								cat.stats.genetics.beautyModifier = modifiers[0];
								cat.stats.genetics.cutenessModifier = modifiers[1];
								cat.stats.genetics.postureModifier = modifiers[2];
								cat.stats.genetics.tricksModifier = modifiers[3];				
							}				
						}
					}

					if (!player && !(id in this._playersInserting)) {
						this._playersInserting.add(id);				
						player = new userSchema(createPlayer(id, name));
						// player.fetchCatData(this);
						// player.fetchInventoryData(this);
						player.save().catch(err => console.log(`[DatabaseManager.addOrGetUser] ${err}`));
						console.log(`User Created: ${id} ${name}`);
					}
				}).catch(err => console.log(`[DatabaseManager.addOrGetUser] ${err}`));				
			}
			finally {
				// this.closeConnection();
			}
		}
	
		return player;
	}

	public async getPlayer(id: string): Promise<IPlayerDocument | null> {
		let player!: IPlayerDocument | null;

		if (await this.connectToDB()) {
			try {
				await userSchema.findById(id).then(data => player = data).catch(err => console.log(err));
			}
			finally {
				// this.closeConnection();
			}
		}
	
		return player;
	}
	
	public async updatePlayer(player: IPlayerDocument): Promise<boolean> {
		let succeeded: boolean = false;

		if (await this.connectToDB()) {
			try {
				await userSchema.findByIdAndUpdate(player._id, player);
				succeeded = true;
			}
			finally {
				// this.closeConnection();
			}
		}
	
		return succeeded;		
	}

	public async updatePlayers(players: IPlayerDocument[]): Promise<boolean> {
		let succeeded: boolean = false;

		if (await this.connectToDB()) {
			try {
				let bulkWriteOperations: Mongoose.AnyBulkWriteOperation[] = []
				players.forEach( player => { 
				  let updateDoc = {
					'updateOne': {
					  'filter': { '_id': player._id },
					  'update': player,
					  'upsert': false
					 }
				  }  
				  bulkWriteOperations.push(updateDoc)
				})
				let result = await userSchema.bulkWrite(bulkWriteOperations);				
				succeeded = result.modifiedCount === players.length;
			}
			finally {
				// this.closeConnection();
			}
		}
	
		return succeeded;		
	}	

	public async getGlobals(): Promise<IGlobalsDocument | null> {
		let globals!: IGlobalsDocument | null;

		if (await this.connectToDB()) {
			try {
				await globalsSchema.findById('globals').then(data => {
					globals = data;

					if (!globals) {			
						globals = new globalsSchema({ _id: 'globals' });
						globals.save().catch(err => console.log(`[DatabaseManager.createGlobals] ${err}`));
						console.log(`Globals Created!`);
					}
				}).catch(err => console.log(err));
			}
			finally {
				// this.closeConnection();
			}
		}
	
		return globals;
	}

	public async updateGlobals(globals: IGlobalsDocument): Promise<boolean> {
		let succeeded: boolean = false;

		if (await this.connectToDB()) {
			try {
				await globalsSchema.findByIdAndUpdate(globals._id, globals);
				succeeded = true;
			}
			finally {
				// this.closeConnection();
			}
		}
	
		return succeeded;		
	}	

	public async insertOrUpdateCats(cats: ICat[], logToConsole: boolean): Promise<boolean> {
		let succeeded: boolean = false;

		if (await this.connectToDB()) {
			try {
				let bulkWriteOperations: Mongoose.AnyBulkWriteOperation[] = []
				cats.forEach( cat => { 
				  let updateDoc = {
					'updateOne': {
					  	'filter': { '_id': cat._id },
					  	'update': cat,
					  	'upsert': true
					 }
				  }  
				  bulkWriteOperations.push(updateDoc)
				})
				let result = await catSchema.bulkWrite(bulkWriteOperations);				

				if (result.modifiedCount + result.upsertedCount + result.insertedCount === cats.length) {
					succeeded = true;

					if (logToConsole) {
						console.log(`cats updated: ${result.modifiedCount}`);
						if(result.upsertedCount > 0) {
							console.log(`cats inserted: ${result.upsertedCount}`);
							console.log(result.upsertedIds);
						}
					}					
				}
			}
			finally {
				// this.closeConnection();
			}
		}
	
		return succeeded;		
	}	

	public async getCat(id: string): Promise<ICatDocument | null> {
		let cat!: ICatDocument | null;

		if (await this.connectToDB()) {
			try {
				await catSchema.findById(id).then(data => cat = data).catch(err => console.log(err));
			}
			finally {
				// this.closeConnection();
			}
		}
	
		return cat;
	}	

	public async getCats(ids: string[]): Promise<ICatDocument[]> {
		let cats: ICatDocument[] = [];

		if (await this.connectToDB()) {
			try {
				cats = await catSchema.find({ '_id': { $in: ids } });
			}
			finally {
				// this.closeConnection();
			}
		}
	
		return cats;
	}		

	public async insertOrUpdateItems(items: IItem[], logToConsole: boolean): Promise<boolean> {
		let succeeded: boolean = false;

		if (await this.connectToDB()) {
			try {
				let bulkWriteOperations: Mongoose.AnyBulkWriteOperation[] = []
				items.forEach( item => { 
				  let updateDoc = {
					'updateOne': {
					  	'filter': { '_id': item._id },
					  	'update': item,
					  	'upsert': true
					 }
				  }  
				  bulkWriteOperations.push(updateDoc)
				})
				let result = await itemSchema.bulkWrite(bulkWriteOperations);				

				if (result.modifiedCount + result.upsertedCount + result.insertedCount === items.length) {
					succeeded = true;

					if (logToConsole) {
						console.log(`items updated: ${result.modifiedCount}`);
						if(result.upsertedCount > 0) {
							console.log(`items inserted: ${result.upsertedCount}`);
							console.log(result.upsertedIds);
						}
					}					
				}
			}
			finally {
				// this.closeConnection();
			}
		}
	
		return succeeded;		
	}	

	public async getItem(id: string): Promise<IItemDocument | null> {
		let item!: IItemDocument | null;

		if (await this.connectToDB()) {
			try {
				await itemSchema.findById(id).then(data => item = data).catch(err => console.log(err));
			}
			finally {
				// this.closeConnection();
			}
		}
	
		return item;
	}	

	public async getItems(ids: string[], includingSubTypes: boolean = false): Promise<IItemDocument[]> {
		let items: IItemDocument[] = [];

		if (await this.connectToDB()) {
			try {
				items = await itemSchema.find({ '_id': { $in: ids } });
			}
			finally {
				// this.closeConnection();
			}
		}
	
		return items;
	}	


}