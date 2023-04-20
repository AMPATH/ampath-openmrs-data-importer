import transferUserToAmrs from "./copy-over-user";
import UserMapper from "./user-map";

console.log("Starting application..");

async function start() {
  let map = [];
  await UserMapper.instance.initialize();
  let users: any = ["34"];
  for (const user of users) {
    console.log("Migrating amrsUserID", user);
    const amrsUserID = await transferUserToAmrs(user);
    console.log("amrsUserID", user);
    let userId = amrsUserID;
    if (amrsUserID === "") {
      userId = parseInt(user);
    }
    map.push(parseInt(user) + ":" + userId);
  }
  console.info("Map", map);
}

start();
