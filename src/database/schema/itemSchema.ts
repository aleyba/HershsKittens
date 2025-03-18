import * as Mongoose from "mongoose";
import * as ItemModel from "../model/itemModel";

const requiredNumber = { type: Number, required: true, default: 0 };

const itemSchema = new Mongoose.Schema<ItemModel.IItemDocument, ItemModel.ItemModel>({
	_id: { type: String, required: true },	
	icon: { type: String, required: true },
	name: { type: String, required: true },
	description: { type: String, required: true },
	price: requiredNumber,
	maxQuantity: { type: Number, required: true, default: 99 },
	orderId: requiredNumber,
},
{
	_id: false,
	timestamps: true
})

export default Mongoose.model<ItemModel.IItemDocument, ItemModel.ItemModel>('items', itemSchema);