import * as config from "../../configs/config.json";
import btoa from "btoa";
import fetch from "node-fetch";

const AbortController = require('abort-controller');

const controller = new AbortController();
const timeout = setTimeout(() => {
	controller.abort();
}, 10000);

const username = config.openmrs.username;
const password = config.openmrs.password;
const baseurl = config.openmrs.baseurl;

export default async function patientSearch(query: string) {
  try {
    const response = await fetch(constructUrl(query), {
      method: "GET",
      signal: controller.signal,
      headers: {
        Authorization: "Basic " + btoa(username + ":" + password),
        "Content-Type": "application/json",
      },
    });
    return response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('request was aborted');
    }
    console.log("Error fetching search results: ", error);
  } finally {
    clearTimeout(timeout);
  }
};

const constructUrl = (query: string) => {
  const v =
    "custom:(uuid,display," +
    "identifiers:(identifier,uuid,preferred,location:(uuid,name)," +
    "identifierType:(uuid,name,format,formatDescription,validator))," +
    "person:(uuid,display,gender,birthdate,dead,age,deathDate,birthdateEstimated,causeOfDeath," +
    "preferredName:(uuid,preferred,givenName,middleName,familyName),attributes," +
    "preferredAddress:(uuid,preferred,address1,address2,cityVillage,longitude,stateProvince,latitude,country,postalCode,countyDistrict,address3,address4,address5,address6,address7)))";

  return baseurl + "/ws/rest/v1/patient?q=" + query + "&v=" + v;
};
