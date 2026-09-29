const { createClient } = require('@supabase/supabase-js');

const url = 'https://jdmvqjtdiimugwuvcddd.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbXZxanRkaWltdWd3dXZjZGRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDcwMjg1MCwiZXhwIjoyMTA2Mjc4ODUwfQ.YrPG04u1JxEClQ4qt6TSfgY_4h40iSfl0spqq-G1wLI';
const supabase = createClient(url, key);

async function setup() {
  console.log('=== 1. CREATING STORAGE BUCKETS ===');
  const buckets = ['profile-images', 'driver-documents', 'identity-assets'];
  for (const b of buckets) {
    const { data, error } = await supabase.storage.createBucket(b, { public: false });
    if (error) {
      if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
        console.log(`Bucket '${b}': ALREADY EXISTS`);
      } else {
        console.log(`Bucket '${b}' notice:`, error.message);
      }
    } else {
      console.log(`Bucket '${b}': CREATED SUCCESSFULLY`);
    }
  }

  const { data: list, error: lErr } = await supabase.storage.listBuckets();
  console.log('Current Buckets:', list ? list.map((x) => x.name) : lErr.message);

  console.log('\n=== 2. CREATING AUTH TEST USERS ===');
  const usersToCreate = [
    { phone: '+919876543210', name: 'Priya Sharma' },
    { phone: '+919876543211', name: 'Rahul Kumar' },
    { phone: '+919876543212', name: 'Ananya Iyer' },
  ];

  for (const u of usersToCreate) {
    const { data, error } = await supabase.auth.admin.createUser({
      phone: u.phone,
      phone_confirm: true,
      user_metadata: { name: u.name, default_otp: '123456' },
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        console.log(`User ${u.phone} (${u.name}): ALREADY REGISTERED`);
      } else {
        console.log(`User ${u.phone} note:`, error.message);
      }
    } else {
      console.log(`User ${u.phone} (${u.name}): CREATED SUCCESSFULLY (ID: ${data.user.id})`);
      // Link to profiles table auth_user_id
      await supabase.from('profiles').update({ auth_user_id: data.user.id }).eq('phone', u.phone.replace('+91', ''));
    }
  }

  console.log('\n=== SETUP COMPLETE ===');
}

setup().catch(console.error);
