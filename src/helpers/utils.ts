import { iconData } from "../database/data/imageData";

// Get a nicely formatted number for gold, ex. 1000 => 1K (icon)
export function getGoldStrShort(gold: number, iconInFront: boolean = true): string {
	let goldStr = "";

	if (gold < 1_000) goldStr = `${gold}`
	else if (gold < 100_000) goldStr = `${gold.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')}`
	else if (gold < 10_000_000) goldStr = `${Math.floor(gold / 1_000).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')}K`
	else if (gold < 1_000_000_000) goldStr = `${Math.floor(gold / 1_000_000)}M`;
	else goldStr = `${Math.floor(gold / 1_000_000_000)}B`;

	if (iconInFront)
		return `${getGoldIcon(gold)} ${goldStr}`;
	else
		return ` ${goldStr} ${getGoldIcon(gold)}`;
}

// Get a nicely formatted number for gold, ex. 1000 => 1,000 (icon)
export function getGoldStr(gold: number, iconInFront: boolean = true): string {
	if (iconInFront)
		return `${getGoldIcon(gold)} ${gold.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')}`;
	else
		return `${gold.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')} ${getGoldIcon(gold)}`;
}

// Get a nicely formatted number for gold, ex. 1000 => 1,000 (icon)
export function formatMoney(money: number): string {
	return money.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

// Get specific icon depending on the amount of gold
export function getGoldIcon(gold: number): string {
	let goldStr = iconData.money;

	// if (gold < 10) goldStr = iconData.gold.gold_coin
	// else if (gold < 100) goldStr = iconData.gold.gold_coin
	// else if (gold < 1_000) goldStr = iconData.gold.gold_100
	// else if (gold < 100_000) goldStr = ` ${iconData.gold.gold_1k}`
	// else if (gold < 1_000_000) goldStr = ` ${iconData.gold.gold_100k}`
	// else goldStr = ` ${iconData.gold.gold_1m}`;

	return goldStr;
}

// ex. Convert 5k => 5000
export function getConvertedGoldInputStr(goldArgs: string) {
	let convertedString = goldArgs;

	// If K is used make it *1.000
	if (goldArgs.endsWith("k")) convertedString = goldArgs.replace("k", "000");
	// If M is used make it *1.000.000
	if (goldArgs.endsWith("m")) convertedString = goldArgs.replace("m", "000000");
	// If B is used make it *1.000.000.000
	if (goldArgs.endsWith("b")) convertedString = goldArgs.replace("b", "000000000");

	return convertedString;
}

// ex. Convert 8 => +8 and -8 => -8
export function getAddModifierString(value: number): string {
	if (value >= 0) return `+${value}`;
	return `${value}`;
}

// ex. Convert 8 => +8 and -8 => -8
export function getMultiplyModifierString(value: number): string {
	let percentage = Math.floor((value - 1) * 100);
	if (percentage >= 0) return `+${percentage}%`;
	return `${percentage}%`;
}

export function enumFromStringValue<T> (enm: { [s: string]: T}, value: string): T | undefined {
	return (Object.values(enm) as unknown as string[]).includes(value)
		? value as unknown as T
	  	: undefined;
}
