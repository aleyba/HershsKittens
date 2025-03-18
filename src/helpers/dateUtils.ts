// Converts a date type to an integer => 20220101
export function getDateToInt(dateValue: Date): number {
	return dateValue.getFullYear() * 10000 + dateValue.getMonth() * 100 + dateValue.getDate();
}

// ex. Convert 60000 => 1m
export function getNumToTimeStr(seconds: number): string {
	let minutes = Math.floor(seconds / 60);
	seconds = seconds % 60;
	let hours = Math.floor(minutes / 60);
	minutes = minutes % 60;
	let days = Math.floor(hours / 24);
	hours = hours % 24;

	let resultString = `${seconds}s`;
	if (days > 0) resultString = `${days}d ${hours}h ${minutes}m ${resultString}`
	else if (hours > 0) resultString = `${hours}h ${minutes}m ${resultString}`
	else if (minutes > 0) resultString = `${minutes}m ${resultString}`;

	return resultString;
}

// Returns a DateTime for 01-01-1900 00:00:00:0000
export function getMinDate(): Date {
	return new Date(1900,1,1,0,0,0,0);
}

// Returns the current DateTime
export function getDateNow(): Date {
    return new Date();
}

// Returns the current DateTime +1 day
export function getDateAddDays(date: Date, addDays: number): Date {
    let newDate = new Date(date.getTime());
    newDate.setUTCDate(newDate.getDate() + addDays);
    return newDate;
}

// Returns the date with the time set to midnight
export function getDateAtMidnight(date: Date): Date {
    let dateAtMidnight = new Date(date.getTime());
    dateAtMidnight.setUTCHours(0, 0, 0, 0);
    return dateAtMidnight;
}

// Returns the amount of days between the 2 dates
export function getDaysBetweenDates(date1: Date, date2: Date): number {    
    return Math.abs((date1.getTime() - date2.getTime()) / getDayInMiliseconds());
}

// Returns the amount of seconds between the 2 dates
export function getSecondsBetweenDates(date1: Date, date2: Date): number {    
    return Math.floor(Math.abs((date1.getTime() - date2.getTime()) / 1000));
}

export function getHourInSeconds() {
	return 60 * 60; // minutes*seconds
}

export function getDayInSeconds() {
	return 24 * 60 * 60; // hours*minutes*seconds
}

export function getDayInMiliseconds() {
    return 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
}