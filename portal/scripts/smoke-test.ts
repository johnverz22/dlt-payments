import { env } from '../app/.server/env';
import { userProfileSchema } from '../app/.server/dlt/schemas';

async function main() {
  const pat = process.env.DEV_SMOKE_PAT;
  
  if (!pat) {
    console.error('❌ DEV_SMOKE_PAT is missing from environment variables.');
    console.error('Please set it in .env to run the smoke test.');
    process.exit(1);
  }

  const url = new URL('/api/v1/portal/me', env.DLT_ORIGIN);
  console.log(`📡 Connecting to DLT API: ${url.toString()}...`);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${pat}`,
      },
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(`Response body: ${text}`);
      process.exit(1);
    }

    const json = await response.json();
    console.log('✅ Connection successful. Validating response format...');

    const result = userProfileSchema.safeParse(json.data);
    
    if (!result.success) {
      console.error('❌ Validation Error. API response shape has changed or is incorrect:');
      console.error(result.error.flatten().fieldErrors);
      process.exit(1);
    }

    const profile = result.data;
    console.log('\n✅ Profile validation passed!');
    console.log('--- Account Info ---');
    console.log(`Name:     ${profile.first_name} ${profile.last_name}`);
    console.log(`Role:     ${profile.role}`);
    console.log(`Merchant: ${profile.merchant.name} (ID: ${profile.merchant.id})`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Network error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
