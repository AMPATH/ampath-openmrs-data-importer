const createCsvWriter = require("csv-writer").createObjectCsvWriter;
module.exports = function (path, header, records) {
  return new Promise((success, failure) => {
    const csvWriter = createCsvWriter({
      path: path,
      header: header,
    });
    csvWriter
      .writeRecords(records) // returns a promise
      .then(() => {
        console.log("...Done");
        success();
      })
      .catch((err) => {
        failure(err);
      });
  });
};
