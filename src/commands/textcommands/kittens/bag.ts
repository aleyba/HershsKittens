import * as Discord from "discord.js";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument, IPlayerItem } from "../../../database/model/playerModel";
import { DefaultEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import config from "../../../config";
import ManiCommand from "../../../core/command";
import { iconData, imageURLs } from "../../../database/data/imageData";
import { getAddModifierString, getGoldStr, getMultiplyModifierString } from "../../../helpers/utils";

export default class BagCommand extends ManiCommand {    
	public constructor(){
		super(["bag", "inventory", "inv"], config.commandGroups.Items);

        this.cooldown = 15_000;
        this.unlockable = true;
		this.description = "Shows the player's inventory";
        this.examples = [
            "`h bag`"
        ]
	}

	public async runCommand(options: { client: ManiClient, message: Discord.Message, player: IPlayerDocument, args: string[] }): Promise<void> {
        const { client, message, player, args } = options;
        
        // Check if the channel is a TextChannel
		if (message.channel.type !== Discord.ChannelType.GuildText) return;

        // Fetch required data from the database
        await player.fetchInventoryData(client.database);

        // Create an embed to show the user's profile
		let inventoryEmbed: DefaultEmbed = this.createInventoryEmbed(message.author, player);

        let inventorySelectRow = this.createInventorySelectRow(player);

        let botMessage = await message.channel.send({ embeds: [inventoryEmbed], components: [inventorySelectRow] });

        let selectMenuCollector = botMessage.createMessageComponentCollector({
            componentType: Discord.ComponentType.StringSelect,
            filter: (i) => i.user.id === message.author.id,
            time: 120_000, 
        });  

        selectMenuCollector.on('collect', (i: Discord.StringSelectMenuInteraction) => {
            i.deferUpdate();
            if (i.values.length < 1) return;
    
            let selection = i.values[0];
            if (i.customId === 'itemMenu') {                            
                if (selection == 'Inventory') {
                    inventoryEmbed = this.createInventoryEmbed(message.author, player);
                    botMessage.edit({ embeds: [inventoryEmbed] });
                }
                else {
                    let itemSelection = player.inventory.find(item => item._id == selection);
                    if (itemSelection) {
                        const itemInfoEmbed = this.createItemInfoEmbed(message.author, player, itemSelection);
                        botMessage.edit({ embeds: [itemInfoEmbed] });                    
                    }
                }
            } 
        });
        
        selectMenuCollector.on('end', () => {
            botMessage.edit({ embeds: [inventoryEmbed], components: [] })
        });

	}

    private createInventoryEmbed(author: Discord.User, player: IPlayerDocument): DefaultEmbed {
		let inventoryEmbed: DefaultEmbed = new DefaultEmbed(author)
            .setTitle('Items')          
            .setAuthor({ name: author.username + '\'s bag', iconURL: author.displayAvatarURL() })
            .setThumbnail(imageURLs.handbag);

        let embedDescription = '';
        // let emptySlot = iconData.itemslot_empty;

        for (let i = 0; i < player.inventory.length; i++) {
            let item: IPlayerItem = player.inventory[i];
            if (!item.data) continue;

            embedDescription += `${item.data.icon} **${item.data.name}** (${item.quantity})\n`;
        }        

        if (embedDescription === '') embedDescription = 'You have no items in your bag...\n\n';

        // for (let i = player.inventory.length; i < 8; i++) 
        //     embedDescription += `${emptySlot} Empty\n`;

        inventoryEmbed.setDescription(embedDescription);	
        
        return inventoryEmbed;
    }

    private createItemInfoEmbed(author: Discord.User, player: IPlayerDocument, item: IPlayerItem): DefaultEmbed {
        if (!item.data) return new DefaultEmbed(author);

		let itemInfoEmbed: DefaultEmbed = new DefaultEmbed(author)
            // .setTitle('Item Description')     
            .setAuthor({ name: author.username + '\'s bag', iconURL: author.displayAvatarURL() })
            // .setAuthor({ name: item.data.name });
            // .setThumbnail(item.data.icon);

        let embedDescription = 
            `${item.data.icon} **${item.data.name}**\n` +
            `*${item.data.description}*\n` +
            `\n` +
            `Owned: \`${item.quantity}\`\n` +           
            // `Id: \`${item.data.id}\`\n` +           
            // `Price: **${getGoldStr(item.data.price, false)}**\n` +
            `\n`;       

        itemInfoEmbed.setDescription(embedDescription);	
        
        return itemInfoEmbed;
    }    

    private createInventorySelectRow(player: IPlayerDocument): Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder> {
        let itemOptions: Discord.RestOrArray<Discord.StringSelectMenuOptionBuilder> = [];
        
        itemOptions.push(new Discord.StringSelectMenuOptionBuilder()
            .setValue('Inventory')
            .setLabel('Bag')
            .setEmoji(`<:handbag:1340611126668558448>`)
            .setDescription('List of all the items in your bag.')
            // .setDefault(true)
        );

        for (let i = 0; i < player.inventory.length; i++) {
            let item = player.inventory[i];

            if (item.data) {
                itemOptions.push(new Discord.StringSelectMenuOptionBuilder()
                    .setValue(item.data._id)
                    .setLabel(item.data.name)
                    .setEmoji(item.data.icon)
                    .setDescription(item.data.description)
                );
            }
        }

        let itemMenu = new Discord.StringSelectMenuBuilder()
            .setCustomId('itemMenu')
            .setMinValues(0)
            .setMaxValues(1)
            .addOptions(itemOptions);

        return new Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder>()
            .addComponents(itemMenu);        
    }  
    
    private hasItemsInInventory(player: IPlayerDocument): boolean {
        for (let i = 0; i < player.inventory.length; i++) {
            let item = player.inventory[i];

            if (item.data) return true;
        }        
        return false;
    }    
	
}