import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./config.json'));

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ] 
});

let isActive = true;

// Check bot status from API every 10 seconds
setInterval(async () => {
  try {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/bot_status?limit=1`, {
      headers: {
        'apikey': config.supabaseKey,
        'Authorization': `Bearer ${config.supabaseKey}`
      }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      const newStatus = data[0].is_active;
      if (newStatus !== isActive) {
        console.log(`Bot status changed: ${isActive ? 'Active' : 'Stopped'} -> ${newStatus ? 'Active' : 'Stopped'}`);
        isActive = newStatus;
      }
    }
  } catch (error) {
    console.error('Failed to check bot status:', error);
  }
}, 10000);

const commands = [
  {
    name: 'ping',
    description: 'Replies with Pong!'
  }
];

const rest = new REST({ version: '10' }).setToken(config.token);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  try {
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );
    console.log('Commands registered!');
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // Check if bot is active before processing
  if (!isActive) {
    await interaction.reply({ 
      content: '🛑 Bot is currently stopped by administrator.', 
      ephemeral: true 
    });
    return;
  }

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
});

client.login(config.token);
