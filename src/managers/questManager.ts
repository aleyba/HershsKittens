import * as Discord from "discord.js";
import * as dateUtils from "../helpers/dateUtils";
import ManiClient from "../core/client";
import { createPlayerCat, IPlayerCat, IPlayerDocument } from "../database/model/playerModel";
import { CatActions, CatRanks, getCatScore, rankData } from "../database/model/catModel";
import { iconData } from "../database/data/imageData";
import DatabaseManager from "./databaseManager";
import { questData, QuestID } from "../database/data/questData";

export interface IQuest {
	_id: QuestID;
	icon: string;
	name: string;
	description: string;
    target: number;
}

export interface IQuestManager {    
    startOrGetDailyQuest(player: IPlayerDocument, database: DatabaseManager): Promise<IQuest[]>;
    updateQuestProgress(player: IPlayerDocument, database: DatabaseManager, ids: QuestID[], progress: number): Promise<void>;
    questCompleted(player: IPlayerDocument): Promise<boolean>;
}

export default class QuestManager implements IQuestManager {    
    private readonly _questIDs: QuestID[];
    private _dailyQuestsResetOn: Date;
    private _dailyQuests: IQuest[];    

    public constructor() {        
        this._questIDs = [QuestID.play, QuestID.train, QuestID.photoshoot, QuestID.salon];
        this._dailyQuestsResetOn = dateUtils.getMinDate();
        this._dailyQuests = [];
    }

    private async fetchDailyQuests(database: DatabaseManager): Promise<void> {
        const midnightToday = dateUtils.getDateAtMidnight(dateUtils.getDateNow());       

        // If the quest date is not today, reset the daily quests
        if (this._dailyQuestsResetOn < midnightToday) {       
            const globals = await database.getGlobals();      
            this._dailyQuests = [];

            if (globals && globals.dailyQuestsResetOn > midnightToday) {       
                for (let i = 0; i < globals.dailyQuests.length; i++) {
                    let dailyQuest: IQuest | undefined = questData.find(quest => quest._id == globals.dailyQuests[i]);
                    if (dailyQuest)
                        this._dailyQuests.push(dailyQuest);
                }
                this._dailyQuestsResetOn = globals.dailyQuestsResetOn;
            } 
            else {     
                const randomID = this._questIDs[Math.floor(Math.random() * this._questIDs.length)];
                const randomQuest = questData.find(quest => quest._id == randomID);
                const contestQuest = questData.find(quest => quest._id == QuestID.contest);
                const dailyQuest = questData.find(quest => quest._id == QuestID.daily);
                if (randomQuest && contestQuest && dailyQuest) {
                    this._dailyQuests = [randomQuest, contestQuest, dailyQuest];
                    this._dailyQuestsResetOn = dateUtils.getDateNow();
                    if (globals) {
                        globals.dailyQuestsResetOn = this._dailyQuestsResetOn;
                        globals.dailyQuests = [randomQuest._id, contestQuest._id, dailyQuest._id];

                        const updated = await database.updateGlobals(globals);
                    }
                }                
            }
        }        
    }

    public async startOrGetDailyQuest(player: IPlayerDocument, database: DatabaseManager): Promise<IQuest[]> {
        await this.fetchDailyQuests(database);

        // If the player didn't start the current quests, reset the daily quests
        if (player.quest.questStartedOn < this._dailyQuestsResetOn) {
            player.quest.progress = [];
            for (let i = 0; i < this._dailyQuests.length; i++) {
                if (this._dailyQuests[i]._id == QuestID.daily && player.daily.dailyClaimedOn > dateUtils.getDateAtMidnight(this._dailyQuestsResetOn))
                    player.quest.progress.push(1)
                else
                    player.quest.progress.push(0);
            }
            player.quest.questStartedOn = dateUtils.getDateNow();
            await database.updatePlayer(player);
        }

        return this._dailyQuests;
    }

    public async updateQuestProgress(player: IPlayerDocument, database: DatabaseManager, ids: QuestID[], progress: number = 1): Promise<void> {
        await this.startOrGetDailyQuest(player, database);

        // If the quest date is today
        if (this._dailyQuestsResetOn > dateUtils.getDateAtMidnight(dateUtils.getDateNow()))
        {
            // If quest is started today
            if (player.quest.questStartedOn > this._dailyQuestsResetOn)
            {
                // Update progress
                if (player.quest.questStartedOn > player.quest.questRewardedOn) {
                    for (let i = 0; i < this._dailyQuests.length; i++) {
                        if ( ids.includes(this._dailyQuests[i]._id) )
                            player.quest.progress[i] = Math.min(this._dailyQuests[i].target, player.quest.progress[i] + progress);
                    }
                }
            }
        }
    }

    public async questCompleted(player: IPlayerDocument): Promise<boolean> {
        // Check if quest is started
        if (player.quest.questStartedOn < this._dailyQuestsResetOn)
            return false;
        // Check if quest is already rewarded
        if (player.quest.questRewardedOn > player.quest.questStartedOn)
            return false;
        // Check if all progress has reached the target
        for (let i = 0; i < this._dailyQuests.length; i++) {
            if (player.quest.progress[i] < this._dailyQuests[i].target)
                return false;
        }
        return true;
    }


}