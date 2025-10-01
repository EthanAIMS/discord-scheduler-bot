import { readFileSync } from 'fs';

console.log('=== Testing Bot Configuration ===\n');

try {
  const config = JSON.parse(readFileSync('./config.json'));
  
  console.log('✅ Config file loaded successfully\n');
  console.log('Config values:');
  console.log('- Token:', config.token ? (config.token.startsWith('DISCORD') ? '❌ PLACEHOLDER NOT REPLACED!' : '✅ Set') : '❌ Missing');
  console.log('- Client ID:', config.clientId ? (config.clientId.startsWith('DISCORD') ? '❌ PLACEHOLDER NOT REPLACED!' : '✅ Set') : '❌ Missing');
  console.log('- Guild ID:', config.guildId || '❌ Missing');
  console.log('- Supabase URL:', config.supabaseUrl || '❌ Missing');
  console.log('- Supabase Key:', config.supabaseKey ? '✅ Set' : '❌ Missing');
  
  // Test Supabase connection
  console.log('\n=== Testing Supabase Connection ===\n');
  
  const testSupabase = async () => {
    try {
      const response = await fetch(`${config.supabaseUrl}/rest/v1/bot_status?limit=1`, {
        headers: {
          'apikey': config.supabaseKey,
          'Authorization': `Bearer ${config.supabaseKey}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Supabase connection successful');
        console.log('Bot status:', data[0]?.is_active ? '✅ Active' : '❌ Inactive');
      } else {
        console.log('❌ Supabase connection failed:', response.status, response.statusText);
      }
      
      // Test commands fetch
      const commandsResponse = await fetch(`${config.supabaseUrl}/rest/v1/bot_commands?is_enabled=eq.true&select=*`, {
        headers: {
          'apikey': config.supabaseKey,
          'Authorization': `Bearer ${config.supabaseKey}`
        }
      });
      
      if (commandsResponse.ok) {
        const commands = await commandsResponse.json();
        console.log('✅ Commands fetch successful');
        console.log('Available commands:', commands.length);
        commands.forEach(cmd => console.log(`  - /${cmd.command_name}: ${cmd.description}`));
      } else {
        console.log('❌ Commands fetch failed');
      }
      
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  };
  
  testSupabase();
  
} catch (error) {
  console.log('❌ Failed to load config:', error.message);
}
