import * as Discord from "discord.js";
import * as dateUtils from "../helpers/dateUtils";
import ManiClient from "../core/client";
import { createPlayerCat, IPlayerCat } from "../database/model/playerModel";

export interface ICatStoreManager {
    getCats(): IPlayerCat[];
}

export default class CatStoreManager implements ICatStoreManager {
    private _cats: IPlayerCat[];
    private _resetDate: Date;

    public constructor() {
        this._cats = [];
        this._resetDate = new Date();

        this.resetCats();
    }

    private resetCats(): void {
        this._resetDate = new Date();
        this._cats = [];

        let catIds: string[] = ["shortwhite", "shortblack", "shortcream", "longwhite", "longblack", "longcream"];
        let name: string = '';
        let gender: number = 0;
        let genA, genB: number = 0;

        for (let i = 0; i < catIds.length; i++) {
            name = catIds[i];
            gender = Math.round(Math.random());
            genA = Math.random() * 100;
            genB = 100 - genA; //Math.random() * 50;
            this._cats.push(createPlayerCat(catIds[i], name, gender, genA, genB));
        }        
    }

    public getCats(): IPlayerCat[] {
        // Get the difference in days
        const dateNow: Date = dateUtils.getDateNow();
        const daysSinceLastReset: number = dateUtils.getDaysBetweenDates(dateUtils.getDateAtMidnight(dateNow), dateUtils.getDateAtMidnight(this._resetDate));
                
        // Reset cats in store if new day
        if (daysSinceLastReset >= 1) {
            this.resetCats();
        }

        return this._cats;
    }
}