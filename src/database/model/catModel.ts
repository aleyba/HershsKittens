import * as Mongoose from "mongoose";
import { iconData } from "../data/imageData";
import { IPlayerCat, IPlayerDocument } from "./playerModel";

export enum CatRanks { D_RANK, C_RANK, B_RANK, A_RANK, S_RANK, SS_RANK }
export const rankData = {
    "D_RANK": 0,
    "C_RANK": 475,
    "B_RANK": 1625,
    "A_RANK": 3720,
    "S_RANK": 7030,
    "SS_RANK": 11825,
}

export interface ICat {
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

export interface IBreedingCombination {
    parents: string[];
    child: string;
}

export interface ICatDocument extends ICat, Mongoose.Document {
    _id: string;
}

export enum CatActions { pet, feed, wash }
export function performAction(cat: IPlayerCat, action: CatActions): void {
    if (action == CatActions.pet) {
        cat.happiness = Math.min(100, cat.happiness + 20);
        // cat.hunger = Math.max(0, cat.hunger - 3);
        // cat.energy = Math.max(0, cat.energy - 1);
    }
    else if (action == CatActions.feed) {
        cat.hunger = Math.min(100, cat.hunger + 50);
        // cat.happiness = Math.min(100, cat.happiness + 10);}    
    }
    else if (action == CatActions.wash) {
        cat.energy = Math.min(100, cat.energy + 100);
        // cat.happiness = Math.min(100, cat.happiness + 10);
    }        
}

export enum CatStats { beauty, cuteness, posture, tricks }
export function performTraining(cat: IPlayerCat, stat: CatStats): number {
    let exp = Math.round(Math.random() * 10) + 15;

    if (stat == CatStats.beauty) {
        if (cat.stats.genetics.beautyModifier >= 1)
            exp = Math.round(exp * cat.stats.genetics.beautyModifier)
        else 
            console.log('error: cat has no beauty modifier');
        cat.stats.beauty += exp;
        cat.hunger = Math.max(0, cat.hunger - 3);
        cat.energy = Math.max(0, cat.energy - 1);
    }
    else if (stat == CatStats.cuteness) {
        if (cat.stats.genetics.cutenessModifier >= 1)
            exp = Math.round(exp * cat.stats.genetics.cutenessModifier)
        else 
            console.log('error: cat has no cuteness modifier');
        cat.stats.cuteness += exp;
        cat.happiness = Math.min(100, cat.happiness + 10);
        cat.hunger = Math.max(0, cat.hunger - 3);
        cat.energy = Math.max(0, cat.energy - 1);
    }
    else if (stat == CatStats.posture) {
        if (cat.stats.genetics.postureModifier >= 1)
            exp = Math.round(exp * cat.stats.genetics.postureModifier)
        else 
            console.log('error: cat has no posture modifier');
        cat.stats.posture += exp;
        cat.happiness = Math.max(0, cat.happiness - 10);
        cat.hunger = Math.max(0, cat.hunger - 5);
        cat.energy = Math.max(0, cat.energy - 2);
    }  
    else if (stat == CatStats.tricks) {
        if (cat.stats.genetics.tricksModifier >= 1)
            exp = Math.round(exp * cat.stats.genetics.tricksModifier)
        else 
            console.log('error: cat has no tricks modifier');
        cat.stats.tricks += exp;
        cat.happiness = Math.max(0, cat.happiness - 10);
        cat.hunger = Math.max(0, cat.hunger - 5);
        cat.energy = Math.max(0, cat.energy - 2);
    }            

    return exp;
}

export function getRandomModifiers(genA: number, genB: number): number[] {
    const modifiers = [Math.random(), Math.random(), Math.random(), Math.random()];
    let modSum = 0;
    modifiers.forEach(mod => modSum += mod);
    const correction = 1 / modSum;
    const genetics = ( genA + genB ) / 200;
    for (let i = 0; i < modifiers.length; i ++)
        modifiers[i] = modifiers[i] * correction * genetics + 1;
    return modifiers;
}

export function getCatScore(cat: IPlayerCat, includeGenetics: boolean = true): number {
    if (includeGenetics) {
	    return cat.stats.beauty + cat.stats.cuteness + cat.stats.posture + cat.stats.tricks + cat.stats.genetics.value;
    }
    else {
        return cat.stats.beauty + cat.stats.cuteness + cat.stats.posture + cat.stats.tricks;
    }
}

export function getMinCatScore(cat: IPlayerCat): number {
	return Math.min(cat.stats.beauty, cat.stats.cuteness, cat.stats.posture, cat.stats.tricks);
}

export function getEmotion(cat: IPlayerCat): string {
    if (cat.happiness <= Math.min(0, cat.energy, cat.hunger)) return 'terrible';
    if (cat.hunger <= Math.min(0, cat.energy, cat.happiness)) return 'starved';  
    if (cat.energy <= Math.min(0, cat.hunger, cat.happiness)) return 'exhausted';     

    if (cat.happiness <= Math.min(20, cat.energy, cat.hunger)) return 'sad';
    if (cat.hunger <= Math.min(20, cat.energy, cat.happiness)) return 'hungry';
    if (cat.energy <= Math.min(20, cat.hunger, cat.happiness)) return 'tired';    

    if (cat.energy >= Math.max(80, cat.hunger, cat.happiness)) return 'active';
    if (cat.happiness >= Math.max(80, cat.energy, cat.hunger)) return 'blissful';    
    if (cat.hunger >= Math.max(80, cat.energy, cat.happiness)) return 'stuffed';    

    if (cat.energy >= Math.max(50, cat.hunger, cat.happiness)) return 'energized';
    if (cat.happiness >= Math.max(50, cat.energy, cat.hunger)) return 'happy';    
    if (cat.hunger >= Math.max(50, cat.energy, cat.happiness)) return 'sated';

    return 'feelings';
}

export function getRankShort(value: number): string {
    if (value < rankData.C_RANK) return 'D'
    else if (value < rankData.B_RANK) return 'C'
    else if (value < rankData.A_RANK) return 'B'
    else if (value < rankData.S_RANK) return 'A'
    else if (value < rankData.SS_RANK) return 'S'
    else return 'S+';
}

export function getDNARankShort(value: number): string {
    if (value < 20) return 'D'
    else if (value < 40) return 'C'
    else if (value < 60) return 'B'
    else if (value < 80) return 'A'
    else if (value < 90) return 'S'
    else return 'S+';
}

export function getRank(value: number): string {
    if (value < rankData.C_RANK) return iconData.d_rank
    else if (value < rankData.B_RANK) return iconData.c_rank
    else if (value < rankData.A_RANK) return iconData.b_rank
    else if (value < rankData.S_RANK) return iconData.a_rank
    else if (value < rankData.SS_RANK) return iconData.s_rank
    else return iconData.ss_rank;    
}

export function getDNARank(value: number): string {
    if (value < 20) return iconData.d_rank
    else if (value < 40) return iconData.c_rank
    else if (value < 60) return iconData.b_rank
    else if (value < 80) return iconData.a_rank
    else if (value < 90) return iconData.s_rank
    else return iconData.ss_rank;    
}

export function getStatExp(value: number): number {
    if (value < rankData.C_RANK) return value - rankData.D_RANK
    else if (value < rankData.B_RANK) return value - rankData.C_RANK
    else if (value < rankData.A_RANK) return value - rankData.B_RANK
    else if (value < rankData.S_RANK) return value - rankData.A_RANK
    else return value - rankData.S_RANK;  
}

export function getStatExpNext(value: number): number {
    if (value < rankData.C_RANK) return rankData.C_RANK - rankData.D_RANK
    else if (value < rankData.B_RANK) return rankData.B_RANK - rankData.C_RANK
    else if (value < rankData.A_RANK) return rankData.A_RANK - rankData.B_RANK
    else if (value < rankData.S_RANK) return rankData.S_RANK - rankData.A_RANK
    else if (value < rankData.SS_RANK) return rankData.SS_RANK - rankData.S_RANK
    else return 0;      
}

export function getCostForRank(value: number): number {
    if (value < rankData.C_RANK) return 10
    else if (value < rankData.B_RANK) return 30
    else if (value < rankData.A_RANK) return 60
    else if (value < rankData.S_RANK) return 100
    else return 150;      
}

export function getBar(current: number, max: number = 100): string {
    let value = current;
    if (max != 100) value = Math.round((current / max) * 100)
    let bar: string = '';

    if (value < 10) bar += iconData.bar_start_empty
    else if (value < 20 ) bar += iconData.bar_start_half
    else bar += iconData.bar_start_full;

    let start = 20;
    while (start < 80) {
        if (value - start < 10) bar += iconData.bar_mid_empty
        else if (value - start < 20) bar += iconData.bar_mid_half
        else bar += iconData.bar_mid_full;
        start += 20;
    }  

    if (value < 80) bar += iconData.bar_end_empty
    else if (value < 90 ) bar += iconData.bar_end_half
    else bar += iconData.bar_end_full;

    return bar;
}

export interface CatModel extends Mongoose.Model<ICatDocument> { }