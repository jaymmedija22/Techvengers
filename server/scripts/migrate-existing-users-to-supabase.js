
require("dotenv").config();

const pool = require("../src/config/database");
const supabaseAdmin = require("../src/config/supabase");

async function migrateUsers() {
  try {
    const result = await pool.query(`
      SELECT
        userid,
        firstname,
        lastname,
        email,
        passwordhash,
        supabase_uid
      FROM public.app_user
      WHERE passwordhash IS NOT NULL
        AND status = 'Active'
        AND isblocked = FALSE
      ORDER BY userid
    `);

    console.log(`Found ${result.rows.length} eligible accounts.`);

    const { data, error } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (error) throw error;

    const authUsers = data.users || [];

    for (const user of result.rows) {
      if (user.supabase_uid) {
        console.log(`User ${user.userid} already linked. Skipping.`);
        continue;
      }

      if (!/^\$2[aby]\$\d{2}\$/.test(user.passwordhash)) {
        throw new Error(
          `Unsupported bcrypt format for ERP user ${user.userid}.`
        );
      }

      const existingAuthUser = authUsers.find(
        (authUser) =>
          authUser.email?.toLowerCase() === user.email.toLowerCase()
      );

      if (existingAuthUser) {
        throw new Error(
          `An Auth account already exists for ${user.email}. ` +
          "Review and link it manually before continuing."
        );
      }

      const { data: created, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password_hash: user.passwordhash,
          email_confirm: true,
          user_metadata: {
            first_name: user.firstname,
            last_name: user.lastname,
            erp_user_id: user.userid,
          },
        });

      if (createError) {
        throw new Error(
          `Could not create Auth account for ERP user ${user.userid}: ` +
          createError.message
        );
      }

      const authUser = created.user;

      if (!authUser) {
        throw new Error(
          `Supabase returned no Auth user for ERP user ${user.userid}.`
        );
      }

      try {
        const linked = await pool.query(
          `UPDATE public.app_user
           SET supabase_uid = $1
           WHERE userid = $2
             AND supabase_uid IS NULL`,
          [authUser.id, user.userid]
        );

        if (linked.rowCount !== 1) {
          throw new Error("ERP account could not be linked.");
        }
      } catch (linkError) {
        // Avoid leaving an orphan Auth account if linking fails.
        const { error: deleteError } =
          await supabaseAdmin.auth.admin.deleteUser(authUser.id);

        if (deleteError) {
          console.error(
            "WARNING: Could not remove orphan Auth account:",
            deleteError.message
          );
        }

        throw linkError;
      }

      console.log(`Successfully migrated ERP user ${user.userid}.`);
    }

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrateUsers();
