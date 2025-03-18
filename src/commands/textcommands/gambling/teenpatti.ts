import * as Discord from "discord.js";
import * as utils from "../../../helpers/utils";
import * as inputUtils from "../../../helpers/inputUtils";
import * as notifications from "../../../helpers/notifications";
import { IPlayerDocument } from "../../../database/model/playerModel";
import { DefaultEmbed } from "../../../core/baseclasses";
import ManiClient from "../../../core/client";
import ManiCommand from "../../../core/command";
import config from "../../../config";
import { iconData } from "../../../database/data/imageData";

export default class TeenpattiCommand extends ManiCommand {    
    public constructor(){
        super(["teenpatti", "teen", "patti", "poker", "cards"], config.commandGroups.Gambling);

        this.cooldown = 15_000;
        this.unlockable = true;
        this.description = "Gamble on teen patti";

    }

    private readonly _setOptions = ['High Card', 'Pair', 'Colour', 'Sequence', 'Pure Sequence', 'Trail'];
    private readonly _suitOptions = [`♥️`, `♠️`, `♦️`, `♣️`];
    private readonly _rankOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    private _cards = [
        [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10], [0, 11], [0, 12], [0, 13],
        [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10], [1, 11], [1, 12], [1, 13],
        [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [2, 9], [2, 10], [2, 11], [2, 12], [2, 13],
        [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [3, 9], [3, 10], [3, 11], [3, 12], [3, 13]
    ];

    private shuffleCards(): void {
        for (let currentIndex = this._cards.length - 1; currentIndex >= 0; currentIndex--) {
            let randomIndex = Math.floor(Math.random() * (currentIndex + 1));
            let temp = this._cards[currentIndex];
            this._cards[currentIndex] = this._cards[randomIndex];
            this._cards[randomIndex] = temp;
        }
    }

    private getSet(hand: number[][]): number {
        const uniqueSuits = new Set([ hand[0][0], hand[1][0], hand[2][0] ]);
        const uniqueRanks = new Set([ hand[0][1], hand[1][1], hand[2][1] ]);
        const sortedRanks = [ hand[0][1], hand[1][1], hand[2][1] ].sort();
        const sequence = ( sortedRanks[0] + 1 == sortedRanks[1] && sortedRanks[1] + 1 == sortedRanks[2] );

        if (uniqueRanks.size == 1) {
            return 5; // Trail
        }
        if (sequence) {
            if (uniqueSuits.size == 1) return 4; // Pure Sequence
            return 3; // Sequence
        }            
        if (uniqueSuits.size == 1) {
            return 2; // Colour
        }    
        if (uniqueRanks.size == 2) {
            return 1; // Pair
        }        
        return 0; // High Card
    }

    // player_lost = 0, tied = 1, player_won = 2
    private gameResult(playerHand: number[][], playerSet: number, houseHand: number[][], houseSet: number): number {
        // Better Set Wins
        if (playerSet > houseSet) 
            return 2;
        if (houseSet > playerSet)
            return 0;

        const playerRanksSorted = [ playerHand[0][1], playerHand[1][1], playerHand[2][1] ].sort((A, B) => A - B);
        const houseRanksSorted = [ houseHand[0][1], houseHand[1][1], houseHand[2][1] ].sort((A, B) => A - B);

        // Combinations of 3 cards or High Card
        if (playerSet >= 2 || playerSet == 0) {
            if (playerRanksSorted[2] > houseRanksSorted[2])
                return 2;
            if (playerRanksSorted[2] < houseRanksSorted[2])
                return 0;
            if (playerRanksSorted[1] > houseRanksSorted[1])
                return 2;
            if (playerRanksSorted[1] < houseRanksSorted[1])
                return 0;
            if (playerRanksSorted[0] > houseRanksSorted[0])
                return 2;
            if (playerRanksSorted[0] < houseRanksSorted[0])
                return 0;
            return 1;
        }
        // Pair
        else {
            // Figure out which rank is the pair
            let playerPair, playerHighCard, housePair, houseHighCard = -1;
            if (playerHand[0][1] == playerHand[1][1]) {
                playerPair = playerHand[0][1];
                playerHighCard = playerHand[2][1];
            }
            else if (playerHand[0][1] == playerHand[2][1]) {
                playerPair = playerHand[0][1];
                playerHighCard = playerHand[1][1];
            }
            else {
                playerPair = playerHand[1][1];
                playerHighCard = playerHand[0][1];                
            }
            if (houseHand[0][1] == houseHand[1][1]) {
                housePair = houseHand[0][1];
                houseHighCard = houseHand[2][1];
            }
            else if (houseHand[0][1] == houseHand[2][1]) {
                housePair = houseHand[0][1];
                houseHighCard = houseHand[1][1];
            }
            else {
                housePair = houseHand[1][1];
                houseHighCard = houseHand[0][1];                
            }
            
            // get the result
            if (playerPair > housePair)
                return 2;
            if (housePair > playerPair)
                return 0;
            if (playerHighCard > houseHighCard)
                return 2;
            if (houseHighCard > playerHighCard)
                return 0;

            return 1;
        }
    }

    private printCard(card: number[]): string {
        return `${this._suitOptions[card[0]]}${this._rankOptions[card[1]]}`;
    }

    private printHand(hand: number[][], set: number): string {
        let s = ``;
        for (let i = 0; i < hand.length; i++) {
            s += `${this.printCard(hand[i])} `;
        }
        return `**${s}** *(${this._setOptions[set]})*`;
    }

    public async runCommand(options: { client: ManiClient, message: Discord.Message, player: IPlayerDocument, args: string[] }): Promise<void> {		
        const { client, message, player, args } = options;

        // Check if the channel is a TextChannel
        if (message.channel.type !== Discord.ChannelType.GuildText) return;

        let betAmount = 10;
        const bettingLimit = 500;
        
        if (args.length != 0) {
            // Get the amount to bet
            betAmount = inputUtils.CheckAmount(message, args[0], true, true);
            if (betAmount < 0.5) return; 		
        }

        // Check money
        betAmount = inputUtils.getAmount(message, player.money, betAmount, "money", "bet", 10);
        if (betAmount < 10) return;
        
        // Calculate all and half with betting max
        if (args[0] == "all") {
            if (betAmount > bettingLimit) betAmount = bettingLimit;
        }
        else if (args[0] == "half") {
            if (betAmount > Math.floor(bettingLimit/2)) betAmount = Math.floor(bettingLimit/2);
        }

        // Check if the amount is under the maximum
        if (betAmount > bettingLimit) {
            betAmount = bettingLimit;
            // message.channel.send(`**${message.author.username}**, the betting amount has to be a maximum of **${utils.getGoldStr(bettingLimit)}**. `);
            // return;
        }

        let prizeAmount = betAmount * 2;
        let foldAmount = Math.ceil(betAmount / 2);

        // Hand out the cards        
        this.shuffleCards();
        const playerCards = [ this._cards[0], this._cards[2], this._cards[4] ];
            // .sort((cardA, cardB) => {
            //     let compare = cardA[1] - cardB[1];
            //     if (compare == 0) compare = cardA[0] - cardB[0];
            //     return compare;
            // });
        const playerSet = this.getSet(playerCards);
        const houseCards = [ this._cards[1], this._cards[3], this._cards[5] ];
            // .sort((cardA, cardB) => {
            //     let compare = cardA[1] - cardB[1];
            //     if (compare == 0) compare = cardA[0] - cardB[0];
            //     return compare;
            // });       
        const houseSet = this.getSet(houseCards);

        const gameEmbed: DefaultEmbed = new DefaultEmbed(message.author)
            .setTitle('Teen patti!')
            .setDescription(`House's cards:\n**❔ ❔ ❔**\n\n**Your cards:**\n${this.printHand(playerCards, playerSet)}\n\n`)
            .setThumbnail("https://cdn.discordapp.com/attachments/1340608774888489021/1343467008523505695/teenpatti.png?ex=67bd60a7&is=67bc0f27&hm=5ae7935d866df079be6cf0c64f17b1c20690ed6addf72f390f38cdf77fad65ec&");

        // Bet Button
        let betButton: Discord.ButtonBuilder = new Discord.ButtonBuilder()
            .setCustomId(`bet`)
            .setLabel(`${utils.formatMoney(betAmount)} | Bet`)
            .setEmoji(iconData.money)
            .setStyle(Discord.ButtonStyle.Success);
        // Fold Button
        let foldButton: Discord.ButtonBuilder = new Discord.ButtonBuilder()
            .setCustomId(`fold`)
            .setLabel(`${utils.formatMoney(foldAmount)} | Fold`)
            .setEmoji(iconData.money)
            .setStyle(Discord.ButtonStyle.Secondary);

        // // Disable double down if player doesn't have enough gold
        // if (player.money < betAmount * 2) {
        //     doubleButton.setStyle(Discord.ButtonStyle.Secondary);
        //     doubleButton.setDisabled(true);			
        // }			

        let pattiButtonRow: Discord.ActionRowBuilder<Discord.ButtonBuilder> = new Discord.ActionRowBuilder<Discord.ButtonBuilder>()
            .addComponents(betButton, foldButton); 		

        let folded = false;
        const gambleMessage = await message.channel.send({ embeds: [gameEmbed], components: [pattiButtonRow] }) as Discord.Message;

        let buttonCollector = gambleMessage.createMessageComponentCollector({
            componentType: Discord.ComponentType.Button,
            filter: (i) => i.user.id === message.author.id,
            time: 30_000
        });

        buttonCollector.on('collect', async (i: Discord.ButtonInteraction) => {
            i.deferUpdate();			

            if (i.customId == `fold`) {
                folded = true;
            }
            else {
                folded = false;
            }

            buttonCollector.stop();
        });

        buttonCollector.on('end', () => {
            let description = `House's cards:\n${this.printHand(houseCards, houseSet)}\n\n**Your cards:**\n${this.printHand(playerCards, playerSet)}\n\n`;            

            if (folded) {
                // gameEmbed.setColor(config.embedColours.inactive);
                description += `You folded and lost **${utils.getGoldStr(foldAmount)}**`;
                player.money -= foldAmount;
                player.currency.totalGamblingLosses -= foldAmount;
            }
            else {
                const result = this.gameResult(playerCards, playerSet, houseCards, houseSet);
                if (result == 2) {
                    // gameEmbed.setColor(config.embedColours.battle_won);
                    description += `Congratulations, you won **${utils.getGoldStr(betAmount)}**!`;
                    player.money += betAmount;
                    player.currency.totalGamblingIncome += betAmount;
                }
                else if (result == 0) {
                    // gameEmbed.setColor(config.embedColours.battle_lost);
                    description += `You bet and lost **${utils.getGoldStr(betAmount)}**`;
                    player.money -= betAmount;
                    player.currency.totalGamblingLosses -= betAmount;
                } 
                else {
                    // gameEmbed.setColor(config.embedColours.inactive);
                    description += `You tied... no money won or lost...`;                  
                }
            }

            gameEmbed.setDescription(description);
            gambleMessage.edit({ embeds: [gameEmbed], components: [] })			
            
            player.statistics.gamblingCommandsUsed ++;
            client.database.updatePlayer(player).then(succeeded => {
                if (!succeeded) notifications.SendErrorMsg(message, notifications.ErrorMessages.DBConnectionFailed);
            });			
        });

    }
    
}