#!/usr/bin/env node
require("dotenv").config();

const { MongoClient } = require("mongodb");

const adminUri = process.env.MONGO_ADMIN_URI || process.env.MONGO_URI;
const dbName = process.env.MONGODB_DB_NAME || "spicekart";
const appUser = process.env.MONGO_APP_USER;
const appPass = process.env.MONGO_APP_PASS;

if (!adminUri) {
  console.error("Missing required env value: MONGO_URI or MONGO_ADMIN_URI");
  process.exit(1);
}

if (!appUser || !appPass) {
  console.error(
    "Missing required env values: MONGO_APP_USER and MONGO_APP_PASS",
  );
  console.error(
    "Example: MONGO_APP_USER=spicekart_app and MONGO_APP_PASS=<strong-password>",
  );
  process.exit(1);
}

async function ensureAppUser() {
  const client = new MongoClient(adminUri, { serverSelectionTimeoutMS: 8000 });

  try {
    await client.connect();

    const targetDb = client.db(dbName);
    const usersInfo = await targetDb.command({
      usersInfo: { user: appUser, db: dbName },
    });

    const roles = [{ role: "readWrite", db: dbName }];

    if (usersInfo.users && usersInfo.users.length > 0) {
      await targetDb.command({
        updateUser: appUser,
        pwd: appPass,
        roles,
      });
      console.log(`Updated MongoDB user '${appUser}' on database '${dbName}'.`);
    } else {
      await targetDb.command({
        createUser: appUser,
        pwd: appPass,
        roles,
      });
      console.log(`Created MongoDB user '${appUser}' on database '${dbName}'.`);
    }

    const encodedUser = encodeURIComponent(appUser);
    const encodedPass = encodeURIComponent(appPass);
    console.log("Use this app URI in production env:");
    console.log(
      `MONGO_URI=mongodb+srv://${encodedUser}:${encodedPass}@<atlas-cluster-host>/${dbName}?retryWrites=true&w=majority`,
    );
  } catch (error) {
    console.error("Failed to create/update MongoDB app user.");
    console.error(error.message || error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

ensureAppUser();
