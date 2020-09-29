import transferPatientToAmrs from "./patients/copy-over-patient";

console.log("Starting application..");

async function start() {
  await transferPatientToAmrs(3634);
  // await transferPatientToAmrs(3066);
  // await transferPatientToAmrs(22);
}

start();
