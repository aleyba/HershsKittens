import ManiClient from "./client";

export interface IBotEvent {
	name: string;
	onEvent(client: ManiClient, ...args: any[]): Promise<void>;
}