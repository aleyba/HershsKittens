import * as Mongoose from "mongoose";
import * as CatModel from "../model/catModel";

const catSchema = new Mongoose.Schema<CatModel.ICatDocument, CatModel.CatModel>({
    _id: { type: String, required: true },	    
    icon: { 
        forward: { type: String, required: true },
        back: { type: String, required: true },
        left: { type: String, required: true },
        right: { type: String, required: true }
    },
    image: { 
        forward: { type: String, required: true },
        back: { type: String, required: true }
    },    
    description: { type: String, required: true },
    levelForSale: { type: Number, required: true, default: 1 },
},
{
    _id: false,
    timestamps: true
})

export default Mongoose.model<CatModel.ICatDocument, CatModel.CatModel>('cats', catSchema);