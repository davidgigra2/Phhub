import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://itvssdpcsskelasrjgkm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0dnNzZHBjc3NrZWxhc3JqZ2ttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyNDA3MywiZXhwIjoyMDg2NzAwMDczfQ.4McQ_-Wui-zG2D3cIjJjZ_-QBPkkgxgtOFTqAuvJ7qA';

async function main() {
    const sql = readFileSync('./supabase/add_assembly_cascades.sql', 'utf8');

    console.log("Executing SQL migration via POST /rest/v1/rpc/exec_sql ...");

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ query: sql })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Migration failed:", errorText);
            console.log("\nPlease run the SQL file manually in Supabase SQL editor: supabase/add_assembly_cascades.sql");
        } else {
            console.log("Migration successful!");
        }
    } catch (err) {
        console.error("Network error:", err);
    }
}

main();
