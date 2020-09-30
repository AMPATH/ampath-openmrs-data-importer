const writeCsv = require("../write-csv");

export default async function exportRecurrentPatients(data: Array<any>) {
  const path = "./metadata/possible-existing-patients.csv";
  const header = [
    { id: "kenyaEMRPersonId", title: "KenyaEMR personID" },
    { id: "kenyaEMRIdentifiers", title: "KenyaEMR identifiers" },
    { id: "kenyaEMRNames", title: "KenyaEMR names" },
    { id: "amrsPersonUuid", title: "AMRS person uuid" },
    { id: "amrsIdentifiers", title: "AMRS identifiers" },
    { id: "amrsNames", title: "AMRS names" },
  ];
  await writeCsv(path, header, data);
}
