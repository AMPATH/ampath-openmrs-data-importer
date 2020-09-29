const csv = require("csv-parser");
const fs = require("fs");
module.exports = function (path) {
  return new Promise((success, error) => {
    var data = [];
    var dict = {};
    var grouped = {};
    var results = {
      array: data,
      dictionary: dict,
      grouped: grouped,
      groupedCount: 0,
    };
    fs.createReadStream(path)
      .pipe(csv())
      .on("data", (row) => {
        data.push(row);
        dict[row.source + row.code] = row;
        if (!grouped[row.concept_id]) {
          grouped[row.concept_id] = [];
          results.groupedCount++;
        }
        grouped[row.concept_id].push(row);
      })
      .on("end", () => {
        success(results);
      });
  });
};
