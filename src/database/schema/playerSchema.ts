import * as Mongoose from "mongoose";
import config from "../../config";
import * as UserModel from "../model/playerModel";
import { catData } from "../data/catData";
import DatabaseManager from "../../managers/databaseManager";
import ManiClient from "../../core/client";

const requiredNumber = { type: Number, required: true, default: 0 };
const requiredBoolean = { type: Boolean, required: true, default: false };
const requiredDate = { type: Date, required: true, default: new Date() };

const userSchema = new Mongoose.Schema<UserModel.IPlayerDocument, UserModel.PlayerModel>({
	_id: { type: String, required: true },	
	name: { type: String, required: true, default: '' },	
	reputation: requiredNumber,
	level: requiredNumber,
	experience: requiredNumber,
	money: requiredNumber,
	settings: {
		prefix: { type: String, required: true, default: config.defaultprefix },
		privacy: requiredBoolean,
	},
	daily: {
		dailyStreakCurrent: requiredNumber,
		dailyStreakMax: requiredNumber,
		dailyClaimedOn: requiredDate,
		repClaimedOn: requiredDate,
	},
	marry: {
		marriedTo: { type: String, required: false },
		marriedOn: { type: Date, required: false },
	},	
	breeding: {
		seen: [String],
		breedingDate: { type: Date, required: false },
		kitten: { type: Object, required: false },
	},	
	quest: {
		questStartedOn: requiredDate,
		questRewardedOn: requiredDate,
		progress: [Number],
	},
	cooldowns: {
		play: requiredDate,
		train: requiredDate,
		photoshoot: requiredDate,
		salon: requiredDate,
		contest: requiredDate,
	},
	currency: {		
		totalDailyIncome: requiredNumber,
		totalQuestIncome: requiredNumber,
		totalContestIncome: requiredNumber,
		totalPhotoshootIncome: requiredNumber,
		totalBreedingIncome: requiredNumber,
		totalGamblingIncome: requiredNumber,
		totalAdoptionSpendings: requiredNumber,
		totalShopSpendings: requiredNumber,
		totalSalonSpendings: requiredNumber,		
		totalGamblingLosses: requiredNumber,
	},
	statistics: {
		dailiesCollected: requiredNumber,
		reputationGiven: requiredNumber,
		contestsWon: requiredNumber,
		questsCompleted: requiredNumber,
		achievementsUnlocked: requiredNumber,
		playCommandsUsed: requiredNumber,
		trainCommandsUsed: requiredNumber,
		photoshootCommandsUsed: requiredNumber,
		salonCommandsUsed: requiredNumber,
		gamblingCommandsUsed: requiredNumber,
	},
	// Collections
	cats: [{
		_id: { type: String, required: true },
		name: { type: String, required: true },
		gender: requiredNumber,
		born: { type: Date, required: false },
		health: requiredNumber,
		hunger: requiredNumber,
		happiness: requiredNumber,
		energy: requiredNumber,
		stats: {
			beauty: requiredNumber,
			cuteness: requiredNumber,
			posture: requiredNumber,
			tricks: requiredNumber,
			genetics: {
				value: requiredNumber,
				A: requiredNumber,
				B: requiredNumber,
				beautyModifier: requiredNumber,
				cutenessModifier: requiredNumber,
				postureModifier: requiredNumber,
				tricksModifier: requiredNumber,
			}
		},
		medals: {
			bronze: requiredNumber,
			silver: requiredNumber,
			gold: requiredNumber
		},
		active: requiredBoolean,
		breeding: requiredBoolean,
		data: { type: Object, required: false, select: false },
	}],
	inventory: [{
		_id: { type: String, required: true },
		quantity: requiredNumber,
		data: { type: Object, required: false, select: false },
	}],
	version: requiredNumber
},
{
	_id: false,
	timestamps: true
})

userSchema.methods.fetchActiveCat = async function (this: UserModel.IPlayerDocument, database: DatabaseManager) {
	let playerCat = this.cats.find(cat => cat.active);
	if (playerCat && !playerCat.data) playerCat.data = await database.getCat(playerCat._id);
	return playerCat;
} 

userSchema.methods.fetchCatData = async function (this: UserModel.IPlayerDocument, database: DatabaseManager) {
	for (let i = 0; i < this.cats.length; i++) {
		let cat: UserModel.IPlayerCat = this.cats[i];
		cat.data = await database.getCat(cat._id);
	}
}

userSchema.methods.fetchItem = async function (this: UserModel.IPlayerDocument, id: string, database: DatabaseManager) {
	let playerItem = this.inventory.find(item => item._id == id);
	if (playerItem && !playerItem.data) playerItem.data = await database.getItem(playerItem._id);
	return playerItem;
} 

userSchema.methods.fetchInventoryData = async function (this: UserModel.IPlayerDocument, database: DatabaseManager) {
	for (let i = 0; i < this.inventory.length; i++) {
		let item: UserModel.IPlayerItem = this.inventory[i];
		item.data = await database.getItem(item._id);
	}
} 

userSchema.methods.increaseExp = function(this: UserModel.IPlayerDocument, exp: number = 0) {	
	const expForNextLevel = ( 5 * (this.level ^ 2) + (50 * this.level) + 100 - this.experience ) * 4; // because 4 skills
	let expGained = exp;
	if (expGained < 1) expGained = Math.round(Math.random() * 10) + 15;

	this.experience += expGained;

	if (this.experience < expForNextLevel) {
		return false;
	}

	this.experience = this.experience % expForNextLevel;
	this.level += 1;

	return true;
}

userSchema.methods.addItemToInventory = function(this: UserModel.IPlayerDocument, item: UserModel.IPlayerItem) {
	// check if the item is already in the inventory
	for (let i = 0; i < this.inventory.length; i++) {
		if (this.inventory[i]._id === item._id) {
			this.inventory[i].quantity += item.quantity;
			return;
		}
	}
	// add item to the inventory
	let i = this.inventory.push(item);
	this.inventory.sort((itemA, itemB) => {
		if (itemA.data && itemB.data)
			return itemA.data.orderId - itemB.data.orderId;
		return 1;
	});	
}

userSchema.methods.takeItemFromInventory = function(this: UserModel.IPlayerDocument, index: number, quantity: number): UserModel.IPlayerItem {
	let playerItem = this.inventory[index];
	if (playerItem.quantity == quantity) {
		this.inventory.splice(index, 1);
		return playerItem;
	}

	let playerItemCopy: UserModel.IPlayerItem = UserModel.copyPlayerItem(playerItem);
	playerItemCopy.quantity = quantity;
	playerItem.quantity -= quantity;
	return playerItemCopy;
}


export default Mongoose.model<UserModel.IPlayerDocument, UserModel.PlayerModel>('users', userSchema);