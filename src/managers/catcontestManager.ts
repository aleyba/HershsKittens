import * as Discord from "discord.js";
import * as dateUtils from "../helpers/dateUtils";
import ManiClient from "../core/client";
import { createPlayerCat, IPlayerCat } from "../database/model/playerModel";
import { CatActions, CatRanks, getCatScore, rankData } from "../database/model/catModel";
import { iconData } from "../database/data/imageData";
import DatabaseManager from "./databaseManager";

export interface ICatContestManager {
    fetchCatData(database: DatabaseManager): Promise<boolean>;
    getContestRankStr(contestant: IPlayerCat): string;
    getContestResults(contestant: IPlayerCat): Promise<IPlayerCat[]>;
    getPrizeAmount(contestant: IPlayerCat, place: number): Promise<number>;
}

export interface IContestJudge {
    _id: string;
    icon: {
        forward: string;
        back: string;
        left: string;
        right: string;
    }
    image: {
        forward: string;
        back: string;
    }
    description: string;
    levelForSale: number;
}

const catNames: string[] = [
    "Angel", "Bailey", "Ash", "Aster", "Basil", "Buttercup", "Camellia",
    "Cosmo", "Dahlia", "Daisy", "Daffodil", "Dandelion", "Elmo", "Fern",
    "Flower", "Garfield", "Holly", "Iris", "Ivy", "Jude", "Lavender",
    "Lily", "Magnolia", "Maple", "Mulberry", "Pansy", "Peppermint", "Petunia",
    "Poppy", "Rose", "Rosemary", "Sage", "Thyme", "Tulip", "Violet", "Willow",

    "Apple", "Basil", "Blueberry", "Caraway", "Cardamom", "Celery", "Cherry",
    "Chili", "Cinnamon", "Clementine", "Clove", "Cocoa", "Cookie", "Gelato",
    "Ginger", "Hazel", "Kiwi", "Lucky", "Mango", "Nacho", "Nugget", "Nutmeg",
    "Oreo", "Okra", "Paprika", "Peaches", "Pepper", "Pumpkin", "Sage",
    "Sesame", "Snickers", "Soda Pop", "Sugar", "Tomato", "Twix"
]

export default class CatContestManager implements ICatContestManager {
    private _catsRankD: IPlayerCat[];
    private _catsRankC: IPlayerCat[];
    private _catsRankB: IPlayerCat[];
    private _catsRankA: IPlayerCat[];
    private _catsRankS: IPlayerCat[];
    private _judges: IContestJudge[];
    private _resetDate: Date;

    public constructor() {
        this._catsRankD = [];
        this._catsRankC = [];
        this._catsRankB = [];
        this._catsRankA = [];
        this._catsRankS = [];
        this._judges = [];
        this._resetDate = new Date();

        this.resetCats(CatRanks.D_RANK);
        this.resetCats(CatRanks.C_RANK);
        this.resetCats(CatRanks.B_RANK);
        this.resetCats(CatRanks.A_RANK);
        this.resetCats(CatRanks.S_RANK);
    
    }

    private getRandomStatValue(minValue: number, maxValue: number, partitions: number, partitionId: number): number {
        const diff = (maxValue - minValue - 1) / partitions;
        return Math.floor((Math.random() * diff + minValue + diff * partitionId));
    }

    private resetCats(rank: CatRanks): void {
        this._resetDate = new Date();
        let catArray: IPlayerCat[];
        let minStatValue: number;
        let maxStatValue: number;
        if (rank == CatRanks.D_RANK) { catArray = this._catsRankD; minStatValue = rankData.D_RANK; maxStatValue = rankData.C_RANK; }
        else if (rank == CatRanks.C_RANK) { catArray = this._catsRankC; minStatValue = rankData.C_RANK; maxStatValue = rankData.B_RANK; }
        else if (rank == CatRanks.B_RANK) { catArray = this._catsRankB; minStatValue = rankData.B_RANK; maxStatValue = rankData.A_RANK; }
        else if (rank == CatRanks.A_RANK) { catArray = this._catsRankA; minStatValue = rankData.A_RANK; maxStatValue = rankData.S_RANK; }
        else { catArray = this._catsRankS; minStatValue = rankData.S_RANK; maxStatValue = rankData.SS_RANK; }

        const catCount = 7;
        let catIds: string[] = ["shortwhite", "shortblack", "shortcream", "longwhite", "longblack", "longcream"]
        let catId: string = '';
        let nameId: number = Math.round(Math.random() * catNames.length);
        let name: string = '';
        let gender: number = 0;
        let cat: IPlayerCat;

        catArray.length = 0;
        for (let i = 0; i < catCount; i++) {
            catId = catIds[Math.floor(Math.random() * catIds.length)];
            name = catNames[(nameId + i * 2) % catNames.length];
            gender = Math.round(Math.random());                        

            // Create Contest Cat
            cat = createPlayerCat(catId, name, gender, 0, 0);            
            cat.stats.beauty = this.getRandomStatValue(minStatValue, maxStatValue, catCount, i);
            cat.stats.cuteness = this.getRandomStatValue(minStatValue, maxStatValue, catCount, i);
            cat.stats.posture = this.getRandomStatValue(minStatValue, maxStatValue, catCount, i);
            cat.stats.tricks = this.getRandomStatValue(minStatValue, maxStatValue, catCount, i);
            cat.stats.genetics.value = this.getRandomStatValue(0, 20, 1, 0);

            if (rank == CatRanks.C_RANK) cat.stats.genetics.value += 20
            else if (rank == CatRanks.B_RANK) cat.stats.genetics.value += 40
            else if (rank == CatRanks.A_RANK) cat.stats.genetics.value += 60
            else cat.stats.genetics.value += 80;

            // console.log(`rank: ${rank}, partition: ${i}`);
            // console.log(`name: ${nameId}, ${name}`);
            // console.log(cat.stats);
            
            catArray.push(cat);
        }        
    }

    private checkReset(): void {
        // Get the difference in days
        const dateNow: Date = dateUtils.getDateNow();
        const daysSinceLastReset: number = dateUtils.getDaysBetweenDates(dateUtils.getDateAtMidnight(dateNow), dateUtils.getDateAtMidnight(this._resetDate));
                
        // Reset cats in store if new day
        if (daysSinceLastReset >= 1) {
            this.resetCats(CatRanks.D_RANK);
            this.resetCats(CatRanks.C_RANK);
            this.resetCats(CatRanks.B_RANK);
            this.resetCats(CatRanks.A_RANK);
            this.resetCats(CatRanks.S_RANK);
        }
    }

    private getContestRank(contestant: IPlayerCat): CatRanks {
        if (contestant.medals.gold < 1) return CatRanks.D_RANK
        if (contestant.medals.gold < 2) return CatRanks.C_RANK
        if (contestant.medals.gold < 3) return CatRanks.B_RANK
        if (contestant.medals.gold < 4) return CatRanks.A_RANK
        else return CatRanks.S_RANK;
    }

    private getRankCats(rank: CatRanks): IPlayerCat[] {
        if (rank == CatRanks.D_RANK) return this._catsRankD
        else if (rank == CatRanks.C_RANK) return this._catsRankC
        else if (rank == CatRanks.B_RANK) return this._catsRankB
        else if (rank == CatRanks.A_RANK) return this._catsRankA
        else return this._catsRankS;
    }

    public async fetchCatData(database: DatabaseManager): Promise<boolean> {
        this.checkReset();

        for (let i = 0; i < this._catsRankD.length; i ++) {            
            let cat: IPlayerCat = this._catsRankD[i];
            if (!cat.data) cat.data = await database.getCat(cat._id);
            if (!cat.data) console.log(cat);
        }
        for (let i = 0; i < this._catsRankC.length; i ++) {            
            let cat: IPlayerCat = this._catsRankC[i];
            if (!cat.data) cat.data = await database.getCat(cat._id);
        }
        for (let i = 0; i < this._catsRankB.length; i ++) {            
            let cat: IPlayerCat = this._catsRankB[i];
            if (!cat.data) cat.data = await database.getCat(cat._id);
        }
        for (let i = 0; i < this._catsRankA.length; i ++) {            
            let cat: IPlayerCat = this._catsRankA[i];
            if (!cat.data) cat.data = await database.getCat(cat._id);
        }
        for (let i = 0; i < this._catsRankS.length; i ++) {            
            let cat: IPlayerCat = this._catsRankS[i];
            if (!cat.data) cat.data = await database.getCat(cat._id);
        }
        return true;
    }

    public getContestRankStr(contestant: IPlayerCat): string {
        if (contestant.medals.gold < 1) return iconData.d_rank
        if (contestant.medals.gold < 2) return iconData.c_rank
        if (contestant.medals.gold < 3) return iconData.b_rank
        if (contestant.medals.gold < 4) return iconData.a_rank
        else return iconData.s_rank;
    }

    public async getContestResults(contestant: IPlayerCat): Promise<IPlayerCat[]> {
        this.checkReset();

        // Set up the contestants
        const contestRank = this.getContestRank(contestant);
        const results: IPlayerCat[] = this.getRankCats(contestRank).concat([contestant]);

        results.sort((catA, catB) => {
            let compare = getCatScore(catB, false) - getCatScore(catA, false);
            if (compare == 0) compare = catB.stats.genetics.value - catA.stats.genetics.value;
            if (compare == 0 && Math.round(Math.random()) == 1) compare = 1;
            if (compare == 0) compare = -1;
            return compare;
        });

        // for (let i = 0; i < results.length; i++) {
        //     console.log(`${results[i].name}`);
        //     console.log(results[i].stats);
        // }

        return results;
    }

    public async getPrizeAmount(contestant: IPlayerCat, place: number): Promise<number> {
        const contestRank = this.getContestRank(contestant);
        let startAmount: number;
        const placeAmount: number = 25;

        // StartAmount
        if (contestRank == CatRanks.D_RANK) startAmount = 0
        else if (contestRank == CatRanks.C_RANK) startAmount = 8 * placeAmount * 1
        else if (contestRank == CatRanks.B_RANK) startAmount = 8 * placeAmount * 2
        else if (contestRank == CatRanks.A_RANK) startAmount = 8 * placeAmount * 3
        else if (contestRank == CatRanks.S_RANK) startAmount = 8 * placeAmount * 4
        else startAmount = 8 * placeAmount * 5;

        if (place == 1 && contestRank == CatRanks.D_RANK) return 500;
        if (place == 1 && contestRank == CatRanks.C_RANK) return 1000;
        if (place == 1 && contestRank == CatRanks.B_RANK) return 1500;
        if (place == 1 && contestRank == CatRanks.A_RANK) return 2000;
        if (place == 1 && contestRank == CatRanks.S_RANK) return 2500;

        return startAmount + (9 - place) * placeAmount;
    }
}