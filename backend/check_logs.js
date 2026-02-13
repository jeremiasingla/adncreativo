

import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });


async function check() {
    try {
        const { query } = await import("./src/db/postgres.js");

        const llm = await query("SELECT COUNT(*) FROM llm_request_logs");
        console.log("LLM Logs:", llm.rows[0].count);

        const img = await query("SELECT COUNT(*) FROM image_generation_logs");
        console.log("Image Logs:", img.rows[0].count);

        // Check distinct feature names
        const features = await query("SELECT DISTINCT feature_name FROM llm_request_logs");
        console.log("LLM Features:", features.rows.map(r => r.feature_name));

    } catch (err) {
        console.error(err);
    }
}

check();
