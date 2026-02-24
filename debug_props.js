const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment manually
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const supabase = createClient(
    envConfig.NEXT_PUBLIC_SUPABASE_URL,
    envConfig.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProperties() {
    console.log("Fetching assemblies to find one with properties...");
    const { data: assemblies } = await supabase.from('assemblies').select('id, name');

    if (!assemblies || assemblies.length === 0) {
        console.log("No assemblies found.");
        return;
    }

    const targetAssembly = assemblies[0].id;
    console.log(`Checking properties for Assembly: ${assemblies[0].name} (${targetAssembly})`);

    const { data: properties, error } = await supabase
        .from('units')
        .select(`
        coefficient,
        number,
        owner_name,
        owner_document_number,
        owner_email,
        owner_phone,
        representative_id,
        representative:users!units_representative_id_fkey (
          id,
          full_name,
          email,
          document_number
        )
      `)
        .eq('assembly_id', targetAssembly);

    if (error) {
        console.error("Supabase Error:", error);
    } else {
        console.log(`Found ${properties.length} properties.`);
        if (properties.length > 0) {
            console.log("Sample of first property:");
            console.log(JSON.stringify(properties[0], null, 2));

            // Test logic exactly like actions.ts
            const uniqueRepsMap = new Map();
            properties.forEach((prop) => {
                let actualTargetUser;

                if (prop.representative) {
                    actualTargetUser = {
                        ...prop.representative,
                        phone: prop.owner_phone // Map owner's phone to the representative for SMS
                    };
                } else if (prop.owner_document_number || prop.owner_email || prop.owner_phone) {
                    actualTargetUser = {
                        id: prop.owner_document_number,
                        full_name: prop.owner_name || "Propietario",
                        email: prop.owner_email,
                        phone: prop.owner_phone,
                        document_number: prop.owner_document_number,
                        raw_password: prop.owner_document_number
                    };
                }

                if (actualTargetUser && actualTargetUser.id && !uniqueRepsMap.has(actualTargetUser.id)) {
                    uniqueRepsMap.set(actualTargetUser.id, actualTargetUser);
                }
            });

            const reps = Array.from(uniqueRepsMap.values());
            console.log("Reps extracted count:", reps.length);

            let emailsSent = 0;
            let smsSent = 0;
            for (const rep of reps) {
                const promises = [];
                if (rep.email) {
                    promises.push(Promise.resolve({ type: 'email', success: true }));
                } else {
                    console.log(`No email for:`, rep);
                }

                if (rep.phone) {
                    promises.push(Promise.resolve({ type: 'sms', success: true }));
                } else {
                    console.log(`No phone for:`, rep);
                }

                const results = await Promise.all(promises);
                emailsSent += results.filter(r => r.type === 'email' && r.success).length;
                smsSent += results.filter(r => r.type === 'sms' && r.success).length;
            }

            console.log(`Simulated Final Sent - Emails: ${emailsSent}, SMS: ${smsSent}`);
        }
    }
}

checkProperties();
