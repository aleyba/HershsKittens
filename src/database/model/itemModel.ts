import * as Mongoose from "mongoose";

export interface IItem {
	_id: string;
	icon: string;
	name: string;
	description: string;
	price: number;
	maxQuantity: number;
	orderId: number;
}

export interface IItemDocument extends IItem, Mongoose.Document {
	_id: string;
}

export interface ItemModel extends Mongoose.Model<IItemDocument> { }