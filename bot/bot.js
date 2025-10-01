import { Client, GatewayIntentBits, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
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
    
    // Clear all existing commands first to remove any old/stale commands
    console.log('Clearing old guild commands...');
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: [] }
    );
    
    console.log('Clearing old global commands...');
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: [] }
    );
    
    // Register fresh commands from database (guild-specific only)
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );
    console.log(`${commands.length} commands registered to guild!`);
  } catch (error) {
    console.error(error);
  }
});

async function handleCalendarCreateCommand(interaction) {
  try {
    console.log(`User ${interaction.user.id} requested calendar-create command`);

    // Create modal for event details
    const modal = new ModalBuilder()
      .setCustomId('calendar_event_modal')
      .setTitle('Create Calendar Event');

    const titleInput = new TextInputBuilder()
      .setCustomId('event_title')
      .setLabel('Event Title')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('event_description')
      .setLabel('Event Description')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const startTimeInput = new TextInputBuilder()
      .setCustomId('event_start')
      .setLabel('Start Time')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('today 2pm')
      .setRequired(true);

    const endTimeInput = new TextInputBuilder()
      .setCustomId('event_end')
      .setLabel('End Time')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('6pm')
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(titleInput);
    const secondRow = new ActionRowBuilder().addComponents(descriptionInput);
    const thirdRow = new ActionRowBuilder().addComponents(startTimeInput);
    const fourthRow = new ActionRowBuilder().addComponents(endTimeInput);

    modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);

    await interaction.showModal(modal);

  } catch (error) {
    console.error('Error in calendar-create command:', error);
    if (!interaction.replied) {
      await interaction.reply({
        content: 'Failed to show calendar event form.',
        ephemeral: true
      });
    }
  }
}

client.on('interactionCreate', async interaction => {
  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'calendar_event_modal') {
      try {
        await interaction.deferReply({ ephemeral: true });

        const title = interaction.fields.getTextInputValue('event_title');
        const description = interaction.fields.getTextInputValue('event_description') || '';
        const startTime = interaction.fields.getTextInputValue('event_start');
        const endTime = interaction.fields.getTextInputValue('event_end');

        console.log('Calendar event modal submitted:', { title, startTime, endTime });

        const eventData = {
          summary: title,
          description: description,
          startDateTime: startTime,
          endDateTime: endTime
        };

        console.log('Event data to send:', eventData);

        // Call edge function to post to n8n
        const response = await fetch(`${config.supabaseUrl}/functions/v1/calendar-create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.supabaseAnonKey}`
          },
          body: JSON.stringify({
            userDiscordId: interaction.user.id,
            eventData: eventData
          })
        });

        const result = await response.json();

        if (result.success) {
          await interaction.editReply({
            content: `✅ Event "${title}" has been sent to n8n for processing!`,
            ephemeral: true
          });
        } else {
          await interaction.editReply({
            content: `❌ Failed to create event: ${result.error}`,
            ephemeral: true
          });
        }

      } catch (error) {
        console.error('Error handling calendar modal submission:', error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'An error occurred while processing your event.',
            ephemeral: true
          });
        } else {
          await interaction.editReply({
            content: 'An error occurred while processing your event.',
            ephemeral: true
          });
        }
      }
    }
  }

  if (interaction.isChatInputCommand()) {
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

    case 'calendar-create':
      await handleCalendarCreateCommand(interaction);
      break;

    case 'connect':
      try {
        // Fetch available services
        const servicesResponse = await fetch(`${config.supabaseUrl}/functions/v1/bot-api/services`, {
          headers: {
            'apikey': config.supabaseKey,
            'Authorization': `Bearer ${config.supabaseKey}`
          }
        });
        const { services } = await servicesResponse.json();

        // Fetch user's connections
        const connectionsResponse = await fetch(`${config.supabaseUrl}/functions/v1/bot-api/user-connections`, {
          method: 'POST',
          headers: {
            'apikey': config.supabaseKey,
            'Authorization': `Bearer ${config.supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userDiscordId: interaction.user.id })
        });
        const { connections } = await connectionsResponse.json();

        // Create embed with connection status
        const fields = services.map(service => {
          const connection = connections?.find(c => c.service_id === service.id && c.is_connected);
          return {
            name: `${service.icon_emoji} ${service.display_name}`,
            value: connection ? '✅ Connected' : '❌ Not Connected',
            inline: true
          };
        });

        // Create buttons for each service
        const rows = [];
        for (let i = 0; i < services.length; i += 3) {
          const row = new ActionRowBuilder();
          const slice = services.slice(i, i + 3);
          
          for (const service of slice) {
            const connection = connections?.find(c => c.service_id === service.id && c.is_connected);
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`connect_${service.id}`)
                .setLabel(connection ? `Disconnect ${service.display_name}` : `Connect ${service.display_name}`)
                .setStyle(connection ? ButtonStyle.Danger : ButtonStyle.Primary)
                .setEmoji(service.icon_emoji)
            );
          }
          rows.push(row);
        }

        await interaction.reply({
          embeds: [{
            title: '🔗 Connect Your Services',
            description: 'Click a button below to connect or disconnect a service:',
            fields,
            color: 0x5865F2,
            timestamp: new Date()
          }],
          components: rows,
          ephemeral: true
        });
      } catch (error) {
        console.error('Error in /connect:', error);
        await interaction.reply({ content: 'Failed to fetch services', ephemeral: true });
      }
      break;

    default:
      await interaction.reply('Command not implemented yet!');
    }
  } else if (interaction.isButton()) {
    // Handle button interactions
    if (interaction.customId.startsWith('connect_')) {
      const serviceId = interaction.customId.replace('connect_', '');
      
      try {
        // Check if already connected
        const connectionsResponse = await fetch(`${config.supabaseUrl}/functions/v1/bot-api/user-connections`, {
          method: 'POST',
          headers: {
            'apikey': config.supabaseKey,
            'Authorization': `Bearer ${config.supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userDiscordId: interaction.user.id })
        });
        const { connections } = await connectionsResponse.json();
        const existingConnection = connections?.find(c => c.service_id === serviceId && c.is_connected);

        if (existingConnection) {
          // Disconnect
          await fetch(`${config.supabaseUrl}/functions/v1/bot-api/disconnect-service`, {
            method: 'POST',
            headers: {
              'apikey': config.supabaseKey,
              'Authorization': `Bearer ${config.supabaseKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              userDiscordId: interaction.user.id,
              serviceId 
            })
          });

          await interaction.reply({ 
            content: `✅ Successfully disconnected ${existingConnection.service.display_name}!`, 
            ephemeral: true 
          });
        } else {
          // Connect - generate OAuth URL
          const oauthResponse = await fetch(`${config.supabaseUrl}/functions/v1/oauth-init`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              serviceId,
              userDiscordId: interaction.user.id
            })
          });

          const { authUrl } = await oauthResponse.json();

          await interaction.reply({ 
            content: `🔗 Click the link below to connect your account:\n${authUrl}\n\n*This link is private and will expire soon.*`, 
            ephemeral: true 
          });
        }
      } catch (error) {
        console.error('Error handling button:', error);
        await interaction.reply({ 
          content: '❌ Something went wrong. Please try again.', 
          ephemeral: true 
        });
      }
    }
  }
});

client.login(config.token);
