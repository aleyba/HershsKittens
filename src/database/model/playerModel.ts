import * as Mongoose from "mongoose";
import config from "../../config";
import { getRandomModifiers, ICat, rankData } from "./catModel";
import { IItem, IItemDocument } from "./itemModel";
import ManiClient from "../../core/client";
import DatabaseManager from "../../managers/databaseManager";

export interface IPlayer {
	_id: string;	
	name: string;
	reputation: number;
	level: number;
	experience: number;
	money: number;
	settings: IUserSettings;
	daily: {
		dailyStreakCurrent: number;
		dailyStreakMax: number;
		dailyClaimedOn: Date;
		repClaimedOn: Date;
	}	
	marry: {
		marriedTo?: string;
		marriedOn?: Date;
	}
	breeding: {
		seen: string[];
		breedingDate?: Date;
		kitten?: IPlayerCat;
	}
	quest: {
		questStartedOn: Date;
		questRewardedOn: Date;
		progress: number[];
	}	
	cooldowns: {
		play: Date;
		train: Date;
		photoshoot: Date;
		salon: Date;
		contest: Date;
	}
	currency: {		
		totalDailyIncome: number;
		totalQuestIncome: number;
		totalContestIncome: number;
		totalPhotoshootIncome: number;
		totalBreedingIncome: number;
		totalGamblingIncome: number;
		totalAdoptionSpendings: number;
		totalShopSpendings: number;
		totalSalonSpendings: number;
		totalGamblingLosses: number;
	}	
	statistics: {
		dailiesCollected: number;
		reputationGiven: number;		
		contestsWon: number;
		questsCompleted: number;
		achievementsUnlocked: number;
		playCommandsUsed: number;
		trainCommandsUsed: number;
		photoshootCommandsUsed: number;
		salonCommandsUsed: number;
		gamblingCommandsUsed: number;		
	}
	
	// Collections
	cats: IPlayerCat[];	
	inventory: IPlayerItem[];	
	
	version: number;
}

export interface IUserSettings {
	prefix: string;
	privacy: boolean;
}

export interface IPlayerCat {
	_id: string;
	name: string;
	gender: number;
	born: Date;
	health: number;
	hunger: number;
	happiness: number;
	energy: number;
	stats: {
		beauty: number;
		cuteness: number;
		posture: number;
		tricks: number;
		genetics: {
			value: number;
			A: number;
			B: number;
			beautyModifier: number;
			cutenessModifier: number;
			postureModifier: number;
			tricksModifier: number;
		}		
	}
	medals: {
		bronze: number;
		silver: number;
		gold: number;
	}
	active: boolean;
	breeding: boolean;
	data?: ICat | null;	
}

export interface IPlayerItem {
	_id: string;
	quantity: number;
	data?: IItemDocument | null;
}

// export interface IPlayerQuest {
// 	_id: string;
// 	progress: number;
// }

export interface IPlayerDocument extends IPlayer, Mongoose.Document {
	_id: string;
	
	// Collections
	cats: Mongoose.Types.Array<IPlayerCat>;
	inventory: Mongoose.Types.Array<IPlayerItem>;

	// Functions
	fetchActiveCat(database: DatabaseManager): IPlayerCat | undefined;
	fetchCatData(database: DatabaseManager): Promise<void>;
	fetchItem(id: string, database: DatabaseManager): IPlayerItem | undefined;
	fetchInventoryData(database: DatabaseManager): Promise<void>;

	increaseExp(exp: number): boolean;
	addItemToInventory(item: IPlayerItem): void;
	takeItemFromInventory(index: number, quantity: number): IPlayerItem;
}

export interface PlayerModel extends Mongoose.Model<IPlayerDocument> { }


const minDate = new Date(1900,1,1);

export function createPlayerCat(id: string, catName: string, gender: number, genA: number, genB: number, birthdate: Date = new Date()): IPlayerCat {
	const newCat:IPlayerCat = {
		_id: id,
		name: catName,
		gender: gender,
		born: birthdate,
		health: 100,
		hunger: 100,
		happiness: 100,
		energy: 100,
		stats: {
			beauty: 0,
			cuteness: 0,
			posture: 0,
			tricks: 0,
			genetics: {
				value: Math.ceil( (genA + genB) / 2 ),
				A: genA,
				B: genB,
				beautyModifier: 0,
				cutenessModifier: 0,
				postureModifier: 0,
				tricksModifier: 0,
			}					
		},
		medals: {
			bronze: 0,
			silver: 0,
			gold: 0
		},
		active: false,
		breeding: false,
	}

	const modifiers = getRandomModifiers(newCat.stats.genetics.A, newCat.stats.genetics.B);
	newCat.stats.genetics.beautyModifier = modifiers[0];
	newCat.stats.genetics.cutenessModifier = modifiers[1];
	newCat.stats.genetics.postureModifier = modifiers[2];
	newCat.stats.genetics.tricksModifier = modifiers[3];

	return newCat;
}

export function copyPlayerCat(playerCat: IPlayerCat): IPlayerCat {
	return {
		_id: playerCat._id,
		name: playerCat.name,
		gender: playerCat.gender,
		born: playerCat.born,
		health: playerCat.health,
		hunger: playerCat.hunger,
		happiness: playerCat.happiness,
		energy: playerCat.energy,
		stats: {
			beauty: playerCat.stats.beauty,
			cuteness: playerCat.stats.cuteness,
			posture: playerCat.stats.posture,
			tricks: playerCat.stats.tricks,
			genetics: {
				value: playerCat.stats.genetics.value,
				A: playerCat.stats.genetics.A,
				B: playerCat.stats.genetics.B,
				beautyModifier: playerCat.stats.genetics.beautyModifier,
				cutenessModifier: playerCat.stats.genetics.cutenessModifier,
				postureModifier: playerCat.stats.genetics.postureModifier,
				tricksModifier: playerCat.stats.genetics.tricksModifier,
			}					
		},
		medals: {
			bronze: playerCat.medals.bronze,
			silver: playerCat.medals.silver,
			gold: playerCat.medals.gold
		},
		active: false,
		breeding: false,
		data: playerCat.data,
	}
}

export function createPlayerItem(id: string, quantity: number = 1): IPlayerItem {
	return {
		_id: id,
		quantity: quantity
	}
}

export function copyPlayerItem(playerItem: IPlayerItem): IPlayerItem {
	return {
		_id: playerItem._id,
		quantity: playerItem.quantity,
		data: playerItem.data,
	}
}

export function createPlayer(id: string, name: string): IPlayer {
	return {
		_id: id,
		name: name,
		reputation: 0,
		level: 1,
		experience: 0,
		money: 1200,
		settings: {
			prefix: config.defaultprefix,
			privacy: false,
		},
		daily: {
			dailyStreakCurrent: 0,
			dailyStreakMax: 0,
			dailyClaimedOn: minDate,
			repClaimedOn: minDate,
		},
		marry: {
			marriedTo: '',
			marriedOn: minDate,
		},
		breeding: {
			seen: [],
			breedingDate: minDate,
			kitten: undefined,
		},
		quest: {
			questStartedOn: minDate,
			questRewardedOn: minDate,
			progress: [],
		},
		cooldowns: {
			play: minDate,
			train: minDate,
			photoshoot: minDate,
			salon: minDate,
			contest: minDate,
		},
		currency: {
			totalDailyIncome: 0,
			totalQuestIncome: 0,
			totalContestIncome: 0,
			totalPhotoshootIncome: 0,
			totalBreedingIncome: 0,
			totalGamblingIncome: 0,
			totalAdoptionSpendings: 0,
			totalShopSpendings: 0,
			totalSalonSpendings: 0,			
			totalGamblingLosses: 0			
		},
		statistics: {
			dailiesCollected: 0,
			reputationGiven: 0,
			contestsWon: 0,
			questsCompleted: 0,
			achievementsUnlocked: 0,
			playCommandsUsed: 0,
			trainCommandsUsed: 0,
			photoshootCommandsUsed: 0,
			salonCommandsUsed: 0,
			gamblingCommandsUsed: 0
		},	
		cats: [],
		inventory: [ { _id: 'food', quantity: 20 }, { _id: 'soap', quantity: 10 } ],
		version: 0,
	}
}


