export default {
	"token": process.env.discord_client_token??"",
	"dbUrl": process.env.mongodb_url??"",
	"clientId": "1339114701308825641",
	"hershId": "860430986625941515",
	"testGuildId": "809019850013933639",
	"botprefix": "hersh",
	"defaultprefix": "h",
	"developers": ['181817073662427136', '860430986625941515'],
	"commandGroups": {
		"Info": "💬",		
		"Owner": "👩🏼",		
		"Kittens": "🐾",
		"Items": "👝",		
		"Social": "👥",
		"Gambling": "🎲",
		"Moderation": "🔒",
		"Developer": "🛠️"
	},
	"commands": [
		"settings", "about", "ping",				
		"profile", "adopt", "daily", "quest", "level", "income", "statistics",
		"kitten", "pet", "feed", "wash", "play", "train", "photoshoot", "salon", "contest", "breed", "rename",
		"bag", "shop", "money",
		"mani", "honor", "marry", "divorce", "give",
		"teenpatti",
		// "bet", "rockpaperscissors", "weather", "slots", "poker", "higherlower", "imposter",
		// "devgive", "devreset", "devupdate",
	],
	"embedColours": {
		"default": 0xEDC671,
		"inactive": 0x4A4A4A,
		"help": 0x9FEFE7,
		"skills": 0XAE3528,
		"monster_easy": 0x4A90E2,
		"monster_difficult": 0xF5A623,
		"monster_boss": 0x9013FE,
		"battle_won": 0x66FF00,
		"battle_lost": 0xD0021B,
		"colorless": 0x202225,
		"blue": 0x4A90E2
	}
}