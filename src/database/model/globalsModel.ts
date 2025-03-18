import * as Mongoose from "mongoose";
import { QuestID } from "../data/questData";

export interface IGlobals {
    _id: string;
    dailyQuestsResetOn: Date;
    dailyQuests: QuestID[];
}

export interface IGlobalsDocument extends IGlobals, Mongoose.Document {
    _id: string;
}

export interface GlobalsModel extends Mongoose.Model<IGlobalsDocument> { }