import * as Mongoose from "mongoose";
import * as GlobalsModel from "../model/globalsModel";
import { getMinDate } from "../../helpers/dateUtils";
import { QuestID } from "../data/questData";

const globalsSchema = new Mongoose.Schema<GlobalsModel.IGlobalsDocument, GlobalsModel.GlobalsModel>({
    _id: { type: String, required: true, default: 'globals' },	
    dailyQuestsResetOn: { type: Date, required: true, default: getMinDate() },
    dailyQuests: { type: [Number], required: true, default: [], enum:QuestID },
},
{
    _id: false,
    timestamps: true
})

export default Mongoose.model<GlobalsModel.IGlobalsDocument, GlobalsModel.GlobalsModel>('globals', globalsSchema);