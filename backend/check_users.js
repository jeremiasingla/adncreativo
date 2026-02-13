import dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly BEFORE importing postgres.js
dotenv.config({ path: path.join(process.cwd(), '.env') });

const { query, pool } = await import('./src/db/postgres.js');


async function checkUsers() {
    try {
        console.log('Checking users...');
        const idsToDelete = [
            'user_iZUJj-cCh8LiDT7DhoBf7_x5w90',
            'user_ea6YQ-p2kh6NeTBRuHu6_PQ4lG4',
            '0e5a931d-924f-4451-87b6-46bc7f96443e'
        ];

        for (const id of idsToDelete) {
            console.log(`\nDeleting user: ${id}`);
            // Also delete sessions, credits, etc if FKs don't cascade (assuming they might not or to be safe)
            // Actually, let's just delete from users and see if it works (cascades usually set? or not?)
            // Given I don't know schema FKs perfectly, I'll try delete user.

            try {
                const res = await query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
                if (res.rows.length > 0) {
                    console.log('✅ Deleted:', res.rows[0].email);
                } else {
                    console.log('❌ User not found or already deleted');
                }
            } catch (err) {
                console.error('Failed to delete:', err.message);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (pool) await pool.end();
    }
}

checkUsers();
