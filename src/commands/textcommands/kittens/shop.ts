import * as Discord from "discord.js";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument, IPlayerItem, createPlayerItem } from "../../../database/model/playerModel";
import { DefaultEmbed, HelpEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import config from "../../../config";
import ManiCommand from "../../../core/command";
import { iconData, imageURLs } from "../../../database/data/imageData";
import { formatMoney, getAddModifierString, getGoldIcon, getGoldStr, getMultiplyModifierString } from "../../../helpers/utils";
import { IItem, IItemDocument } from "../../../database/model/itemModel";

export default class ShopCommand extends ManiCommand {    
	public constructor(){
		super(["shop", "buy"], config.commandGroups.Items);

        this.cooldown = 15_000;
        this.unlockable = true;
		this.description = "Buy items from the shop";
        this.examples = [
            "`h shop`"
        ]
	}

	public async runCommand(options: { client: ManiClient, message: Discord.Message, player: IPlayerDocument, args: string[] }): Promise<void> {
        const { client, message, player, args } = options;
        
        // Check if the channel is a TextChannel
		if (message.channel.type !== Discord.ChannelType.GuildText) return;     

        // Fetch required data from the database
        let itemIds: string[] = ["food", "soap", "meds", "pill", "trickstoy", "beautytoy", "posturetoy", "cutenesstoy"]
        await player.fetchInventoryData(client.database);
        const shopItems: IItemDocument[] = await client.database.getItems(itemIds, true);

        shopItems.sort((itemA, itemB) => {
            return itemA.orderId - itemB.orderId;
        });       

        // Create an embed to show the shop
        let shopEmbed = this.createShopBuyEmbed(client, player, shopItems); //shopPages, shopPageItems, page);

        let shopSelectRow = this.createShopBuySelectRow(shopItems); //shopPages, shopPageItems, page);
        let selection: string = '';        

        const backButton = new Discord.ButtonBuilder()
            .setCustomId('back')
            .setLabel(`Back`)
            // .setEmoji(`↩️`) // 🔙
            .setStyle(Discord.ButtonStyle.Secondary);              

        const buy1Button = new Discord.ButtonBuilder()
            .setCustomId('buy1')
            .setLabel(`Buy`)
            .setEmoji(`${iconData.money}`)
            // .setDisabled(true)
            .setStyle(Discord.ButtonStyle.Success);     
            
        const buy10Button = new Discord.ButtonBuilder()
            .setCustomId('buy10')
            .setLabel(`Buy 10`)
            .setEmoji(`${iconData.money}`)
            // .setDisabled(true)
            .setStyle(Discord.ButtonStyle.Danger);           
            
        let buyButtonRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
            .addComponents(backButton, buy1Button, buy10Button);   
            
        let itemSelection: IItemDocument | undefined = undefined;

        await message.channel.send("**Eejya:** Hiya! Welcome to my pet store. We have everything you need for your furry friends.");
        let botMessage = await message.channel.send({ embeds: [shopEmbed], components: [/*pageButtonRow,*/ shopSelectRow] });

        let selectMenuCollector = botMessage.createMessageComponentCollector({
            componentType: Discord.ComponentType.StringSelect,
            filter: (i) => i.user.id === message.author.id,
            time: 120_000, 
        }); 
        
        let buttonCollector = botMessage.createMessageComponentCollector({
			componentType: Discord.ComponentType.Button,
			filter: (i) => i.user.id === message.author.id,
			time: 120_000
		});

        selectMenuCollector.on('collect', (i: Discord.StringSelectMenuInteraction) => {
            i.deferUpdate();
            if (i.values.length < 1) return;
    
            selection = i.values[0];
            if (i.customId === 'itemMenu') {                            
                if (selection == 'Page') {
                    botMessage.edit({ embeds: [shopEmbed], components: [/*pageButtonRow,*/ shopSelectRow] });
                }
                else if (!isNaN(parseInt(i.customId, 10))) {
                    
                }
                else {
                    itemSelection = shopItems.find(item => item._id == selection);
                    if (itemSelection) {
                        const itemInfoEmbed: DefaultEmbed = this.createItemInfoEmbed(client, player, itemSelection);
                        if (player.money < itemSelection.price) {
                            buy1Button.setDisabled(true);
                        } else {
                            buy1Button.setDisabled(false);
                        }
                        if (player.money < itemSelection.price * 10) {
                            buy10Button.setDisabled(true);
                        } else {
                            buy10Button.setDisabled(false);                   
                        }

                        let playerItem = player.inventory.find(inv => inv._id == itemSelection?._id);
                        if (playerItem && playerItem.quantity == itemSelection.maxQuantity)
                            buyButtonRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(backButton)
                        else if (itemSelection.maxQuantity < 10)
                            buyButtonRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(backButton, buy1Button)
                        else
                            buyButtonRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(backButton, buy1Button, buy10Button);   
                        botMessage.edit({ embeds: [itemInfoEmbed], components: [shopSelectRow, buyButtonRow] });                    
                    }
                }
            } 
        });

		buttonCollector.on('collect', async (i: Discord.ButtonInteraction) => {
            i.deferUpdate();			

            if (i.customId === 'back') {
                botMessage.edit({ embeds: [shopEmbed], components: [shopSelectRow] });
			} 
            else if (i.customId === 'shopBuy') {
                shopEmbed = this.createShopBuyEmbed(client, player, shopItems);
                shopSelectRow = this.createShopBuySelectRow(shopItems);
                botMessage.edit({ embeds: [shopEmbed], components: [shopSelectRow] });
			}
			else if (i.customId === 'buy1') {
                let itemSelection: IItemDocument | undefined = shopItems.find(item => item._id == selection);
                if (itemSelection) {
                    if (player.money < itemSelection.price * 1) {
                        notifications.SendInfoMsg(message, notifications.InfoMessages.NotEnoughMoney);
                        return;
                    }
                    const boughtItem: IPlayerItem = createPlayerItem(itemSelection._id, 1);
                    boughtItem.data = itemSelection;
                    player.addItemToInventory(boughtItem);
                    player.money -= itemSelection.price * 1;
                    player.currency.totalShopSpendings -= itemSelection.price * 1;
                    client.database.updatePlayer(player).then(succeeded => {
                        if (succeeded) {
                            const itemInfoEmbed: DefaultEmbed = this.createItemInfoEmbed(client, player, itemSelection);

                            let playerItem = player.inventory.find(inv => inv._id == itemSelection._id);
                            if (playerItem && playerItem.quantity == itemSelection.maxQuantity)
                                buyButtonRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(backButton)
                            else if (itemSelection.maxQuantity < 10)
                                buyButtonRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(backButton, buy1Button)
                            else
                                buyButtonRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(backButton, buy1Button, buy10Button);                             
                            botMessage.edit({ embeds: [itemInfoEmbed], components: [buyButtonRow] });
                            notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, `you bought ${boughtItem.quantity} **${itemSelection.name}**`);                            
                        }
                        else notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
                    });
                }
			}   
			else if (i.customId === 'buy10') {
                let itemSelection: IItemDocument | undefined = shopItems.find(item => item._id == selection);
                if (itemSelection) {
                    if (player.money < itemSelection.price * 10) {
                        notifications.SendInfoMsg(message, notifications.InfoMessages.NotEnoughMoney);
                        return;
                    }        
                    let playerItem = player.inventory.find(inv => inv._id == itemSelection._id);
                    let quantity = 10;
                    if (playerItem)
                        quantity = Math.min(10, itemSelection.maxQuantity - playerItem.quantity);
                    const boughtItem: IPlayerItem = createPlayerItem(itemSelection._id, quantity);
                    boughtItem.data = itemSelection;
                    player.addItemToInventory(boughtItem);
                    player.money -= itemSelection.price * boughtItem.quantity;
                    player.currency.totalShopSpendings -= itemSelection.price * boughtItem.quantity;
                    client.database.updatePlayer(player).then(succeeded => {
                        if (succeeded) {
                            const itemInfoEmbed: DefaultEmbed = this.createItemInfoEmbed(client, player, itemSelection);
                            
                            if (playerItem && playerItem.quantity == itemSelection.maxQuantity)
                                buyButtonRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(backButton)
                            else if (itemSelection.maxQuantity < 10)
                                buyButtonRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(backButton, buy1Button)
                            else
                                buyButtonRow = new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(backButton, buy1Button, buy10Button);                             
                            botMessage.edit({ embeds: [itemInfoEmbed], components: [buyButtonRow] });
                            notifications.SendInfoMsg(message, notifications.InfoMessages.Custom, `you bought ${boughtItem.quantity} **${itemSelection.name}**`);
                        }
                        else notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
                    });
                }
			}                                  
		});        
        
        selectMenuCollector.on('end', () => {
            botMessage.edit({ components: [] })
        });

        buttonCollector.on('end', () => {
            botMessage.edit({ components: [] })
        });        

	}

    private createShopBuyEmbed(client: ManiClient, player: IPlayerDocument, shopItems: IItemDocument[]): DefaultEmbed {
		let shopEmbed: DefaultEmbed = new HelpEmbed(client, `Eejya's pet shop`)
            .setTitle("Hello fellow cat-lover!")     
            .setThumbnail(imageURLs.avatar_shopkeeper);

        // const embedFields: Discord.RestOrArray<Discord.APIEmbedField> = [];
        let embedDescription: string = ``;
        for (let i = 0; i < shopItems.length; i++) {
            let item: IItem = shopItems[i];
            
            // embedFields.push({ name: `${item.icon} ${item.name}`, value: `*${getGoldStr(item.price, false)}*` });

            if (item._id.includes('toy') && player.inventory.find(inv => inv._id == item._id))
                embedDescription += `~~**${item.icon} ${item.name}**~~ | (1 Owned)\n`
            else
                embedDescription += `**${item.icon} ${item.name}** | ${getGoldStr(item.price, false)}\n`;
        }   
        // shopEmbed.addFields(embedFields);
        shopEmbed.setDescription(embedDescription);
        
        return shopEmbed;
    }

    private createItemInfoEmbed(client: ManiClient, player: IPlayerDocument, item: IItemDocument): DefaultEmbed {
		let itemInfoEmbed: DefaultEmbed = new HelpEmbed(client, `Eejya's pet shop`);        

        let embedDescription = 
            `**${item.icon} ${item.name}**\n` +
            `*${item.description}*\n\n` +
         
            `Price: **${getGoldStr(item.price, false)}**\n`;
            
        if (item.maxQuantity >= 10)
            embedDescription += `Price: **${getGoldStr(item.price * 10, false)}** (x10)\n`;  

        embedDescription += `Maximum: \`${item.maxQuantity}\`\n`;

        let playerItem = player.inventory.find(i => i._id == item._id);            
        if (playerItem) {
            if (playerItem.quantity == item.maxQuantity)
                embedDescription += `Owned: \`${playerItem.quantity}\` (Max.)\n`
            else
                embedDescription += `Owned: \`${playerItem.quantity}\`\n`;
        }
        else
            embedDescription += `Owned: \`0\`\n`;
        
        embedDescription += `\n*You have **${getGoldStr(player.money, false)}***`;

        itemInfoEmbed.setDescription(embedDescription);	
        
        return itemInfoEmbed;
    }    

    private createShopBuySelectRow(shopItems: IItemDocument[]): Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder> {
        let itemOptions: Discord.RestOrArray<Discord.StringSelectMenuOptionBuilder> = [];      

        for (let i = 0; i < shopItems.length; i++) {
            let item: IItem = shopItems[i];

            itemOptions.push(new Discord.StringSelectMenuOptionBuilder()
                .setValue(item._id)
                .setLabel(item.name)
                .setEmoji(item.icon)
                .setDescription(item.description)
            );
        }

        let itemMenu = new Discord.StringSelectMenuBuilder()
            .setCustomId('itemMenu')
            .setMinValues(0)
            .setMaxValues(1)
            .addOptions(itemOptions);

        return new Discord.ActionRowBuilder<Discord.StringSelectMenuBuilder>()
            .addComponents(itemMenu);        
    }   
	
}