require('dotenv').config();
import ManiClient from "./core/client";
import config from "./config";
import { GatewayIntentBits } from "discord.js";

const botClient: ManiClient = new ManiClient({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent 
    ] 
});

botClient.login(config.token);