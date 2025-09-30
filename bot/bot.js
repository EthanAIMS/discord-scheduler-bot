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
let botStartTime = Date.now();

// Fetch commands from database
async function fetchCommands() {
  try {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/bot_commands?is_enabled=eq.true&select=*`, {
      headers: {
        'apikey': config.supabaseKey,
        'Authorization': `Bearer ${config.supabaseKey}`
      }
    });
    const commands = await response.json();
    return commands.map(cmd => ({
      name: cmd.command_name,
      description: cmd.description
    }));
  } catch (error) {
    console.error('Failed to fetch commands:', error);
    return [];
  }
}

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

const rest = new REST({ version: '10' }).setToken(config.token);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  botStartTime = Date.now();
  
  try {
    const commands = await fetchCommands();
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );
    console.log(`${commands.length} commands registered!`);
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

  // Command handlers
  switch (interaction.commandName) {
    case 'ping':
      await interaction.reply('🏓 Pong!');
      break;

    case 'status':
      const uptime = Math.floor((Date.now() - botStartTime) / 1000);
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = uptime % 60;
      
      await interaction.reply({
        embeds: [{
          title: '📊 Bot Status',
          color: 0x00ff00,
          fields: [
            { name: 'Status', value: '✅ Online', inline: true },
            { name: 'Uptime', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
            { name: 'Latency', value: `${client.ws.ping}ms`, inline: true }
          ],
          timestamp: new Date()
        }]
      });
      break;

    case 'help':
      try {
        const commands = await fetchCommands();
        const commandList = commands.map(cmd => `**/${cmd.name}** - ${cmd.description}`).join('\n');
        
        await interaction.reply({
          embeds: [{
            title: '📚 Available Commands',
            description: commandList || 'No commands available',
            color: 0x0099ff,
            footer: { text: 'Bot is managed via dashboard' }
          }]
        });
      } catch (error) {
        await interaction.reply('Failed to fetch commands');
      }
      break;

    default:
      await interaction.reply('Command not implemented yet!');
  }
});

client.login(config.token);
